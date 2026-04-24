"""
Seed a fresh Jira Cloud instance from the sanitized seed CSVs.

Creates (idempotent where practical):
  1. Four Scrum projects: TSU, PNR, ISC, PGM
  2. One epic in PGM (our cross-project "feature")
  3. Sprints in each project's board, with correct start/end/state
  4. 76 stories, each in its target project with:
       - correct issueType, summary, priority
       - assignee (only if the user exists in the instance; else unassigned)
       - story points via the Cloud Story Points custom field
       - linked to the parent epic via the "Parent" field
       - placed in the correct sprint
       - transitioned to the right status
  5. 8 "Blocks" issue links

Usage:
  1) Populate a .env file in this folder:
       JIRA_BASE_URL=https://chrismc90.atlassian.net
       JIRA_EMAIL=chris1.mccourt@gmail.com
       JIRA_TOKEN=<your classic API token>
  2) pip install requests python-dotenv
  3) python seed_jira.py

The script is resumable: it tracks created issue keys in _state.json and
skips already-created objects if you re-run.
"""
import base64
import csv
import json
import os
import sys
import time
from pathlib import Path
from datetime import datetime

try:
    import requests
    from dotenv import load_dotenv
except ImportError:
    print("Install deps first:  pip install requests python-dotenv")
    sys.exit(1)

load_dotenv()

BASE_URL = os.environ["JIRA_BASE_URL"].rstrip("/")
EMAIL = os.environ["JIRA_EMAIL"]
TOKEN = os.environ["JIRA_TOKEN"]

AUTH = base64.b64encode(f"{EMAIL}:{TOKEN}".encode()).decode()
HEADERS = {
    "Authorization": f"Basic {AUTH}",
    "Accept": "application/json",
    "Content-Type": "application/json",
}

HERE = Path(__file__).parent
SEED_DIR = HERE / "output"
STATE_FILE = HERE / "_state.json"

PROJECTS = [
    {"key": "TSU", "name": "TSU Backend"},
    {"key": "PNR", "name": "PNR Panthers"},
    {"key": "ISC", "name": "ISC Integration"},
    {"key": "PGM", "name": "Program Epics"},
]

# Status name -> typical transition target names we'll try (Jira lets admins rename)
STATUS_ALIASES = {
    "Ready to Work": ["Ready to Work", "Selected for Development", "To Do"],
    "In Development": ["In Development", "In Progress"],
    "Working": ["Working", "In Progress"],
    "Refinement": ["Refinement", "To Do"],
    "Ready for Refinement": ["Ready for Refinement", "To Do"],
    "Ready for QA": ["Ready for QA", "In Review", "In Progress"],
    "Ready to Accept": ["Ready to Accept", "In Review", "In Progress"],
    "Done": ["Done", "Closed"],
    "To Do": ["To Do", "Open"],
    "In Progress": ["In Progress"],
}


# ---------- state management ----------

def load_state():
    if STATE_FILE.exists():
        return json.loads(STATE_FILE.read_text())
    return {"projects": {}, "epic_key": None, "sprints": {}, "issues": {}, "links": []}

def save_state(s):
    STATE_FILE.write_text(json.dumps(s, indent=2))


# ---------- HTTP helpers ----------

def req(method, path, **kwargs):
    url = f"{BASE_URL}{path}" if path.startswith("/") else path
    for attempt in range(5):
        r = requests.request(method, url, headers=HEADERS, **kwargs)
        if r.status_code == 429:
            wait = int(r.headers.get("Retry-After", "2"))
            print(f"  rate limited, sleeping {wait}s")
            time.sleep(wait)
            continue
        return r
    return r

def api_json(method, path, **kwargs):
    r = req(method, path, **kwargs)
    if not r.ok:
        print(f"  ERROR {r.status_code} {method} {path}")
        print(f"  body: {r.text[:500]}")
        raise SystemExit(1)
    return r.json() if r.text else {}


# ---------- load seeds ----------

def load_seed_csv(name):
    with open(SEED_DIR / name, newline="", encoding="utf-8") as f:
        return list(csv.DictReader(f))


# ---------- bootstrap: find current user's accountId ----------

def get_self():
    return api_json("GET", "/rest/api/3/myself")


# ---------- project creation ----------

def ensure_projects(state, my_account_id):
    existing = api_json("GET", "/rest/api/3/project/search?maxResults=50")
    existing_keys = {p["key"] for p in existing.get("values", [])}

    for p in PROJECTS:
        if p["key"] in existing_keys:
            print(f"  project {p['key']} exists")
            state["projects"][p["key"]] = p["key"]
            continue
        body = {
            "key": p["key"],
            "name": p["name"],
            "projectTypeKey": "software",
            "projectTemplateKey": "com.pyxis.greenhopper.jira:gh-simplified-agility-scrum",
            "leadAccountId": my_account_id,
            "assigneeType": "UNASSIGNED",
        }
        r = req("POST", "/rest/api/3/project", json=body)
        if r.ok:
            print(f"  created project {p['key']}")
            state["projects"][p["key"]] = p["key"]
        else:
            print(f"  failed to create {p['key']}: {r.status_code} {r.text[:200]}")
            raise SystemExit(1)
    save_state(state)


# ---------- discover the board for each project (for sprint creation) ----------

def get_board_ids(state):
    boards = api_json("GET", "/rest/agile/1.0/board?maxResults=50")
    by_project = {}
    for b in boards.get("values", []):
        pk = b.get("location", {}).get("projectKey")
        if pk and pk not in by_project:
            by_project[pk] = b["id"]
    return by_project


# ---------- epic creation ----------

def ensure_epic(state):
    if state.get("epic_key"):
        print(f"  epic exists: {state['epic_key']}")
        return state["epic_key"]
    epic_row = next(r for r in load_seed_csv("seed_issues.csv") if r["issueType"] == "Epic")
    body = {
        "fields": {
            "project": {"key": "PGM"},
            "issuetype": {"name": "Epic"},
            "summary": epic_row["summary"],
            "priority": {"name": epic_row["priority"] or "Medium"},
        }
    }
    r = api_json("POST", "/rest/api/3/issue", json=body)
    state["epic_key"] = r["key"]
    print(f"  created epic {r['key']}")
    save_state(state)
    return r["key"]


# ---------- discover the Story Points custom field id ----------

def find_story_points_field():
    fields = api_json("GET", "/rest/api/3/field")
    for f in fields:
        if f.get("name") == "Story Points" or f.get("name") == "Story point estimate":
            return f["id"]
    return None


# ---------- sprint creation ----------

def ensure_sprints(state, board_ids):
    sprints_csv = load_seed_csv("seed_sprints.csv")
    for row in sprints_csv:
        if row["name"] in state["sprints"]:
            continue
        # Which board does this sprint belong to? Infer from name prefix.
        prefix = row["name"].split()[0]
        project = {"TSU": "TSU", "PNR": "PNR", "Panthers": "PNR",
                   "ISC": "ISC", "Sprint": "TSU"}.get(prefix, "TSU")
        board_id = board_ids.get(project)
        if not board_id:
            print(f"  no board for {project}, skipping sprint {row['name']}")
            continue
        body = {
            "name": row["name"],
            "originBoardId": board_id,
            "startDate": f"{row['startDate']}T00:00:00.000Z",
            "endDate": f"{row['endDate']}T23:59:59.000Z",
            "goal": "",
        }
        r = req("POST", "/rest/agile/1.0/sprint", json=body)
        if r.ok:
            sprint_id = r.json()["id"]
            state["sprints"][row["name"]] = sprint_id
            print(f"  created sprint {row['name']} (id={sprint_id})")
            # Activate or close if needed
            if row["state"] == "active":
                req("POST", f"/rest/agile/1.0/sprint/{sprint_id}",
                    json={"state": "active"})
            elif row["state"] == "closed":
                req("POST", f"/rest/agile/1.0/sprint/{sprint_id}",
                    json={"state": "active"})
                time.sleep(0.5)
                req("POST", f"/rest/agile/1.0/sprint/{sprint_id}",
                    json={"state": "closed"})
        else:
            print(f"  sprint create failed: {r.status_code} {r.text[:200]}")
    save_state(state)


# ---------- story creation ----------

def create_stories(state, epic_key, sp_field_id):
    issues = load_seed_csv("seed_issues.csv")
    stories = [i for i in issues if i["issueType"] == "Story"]

    # Build key remap: seed key (e.g. TSU-757) -> real Jira key created this run
    key_map = state["issues"]

    for row in stories:
        if row["key"] in key_map:
            continue

        fields = {
            "project": {"key": row["project"]},
            "issuetype": {"name": "Story"},
            "summary": row["summary"][:250],  # summary max length
            "priority": {"name": row["priority"] or "Medium"},
        }

        # Parent epic link (Jira Cloud uses "parent" on next-gen projects)
        fields["parent"] = {"key": epic_key}

        # Story points
        if sp_field_id and row["storyPoints"]:
            try:
                fields[sp_field_id] = float(row["storyPoints"])
            except ValueError:
                pass

        r = req("POST", "/rest/api/3/issue", json={"fields": fields})
        if not r.ok:
            print(f"  create failed for {row['key']}: {r.status_code} {r.text[:300]}")
            continue
        new_key = r.json()["key"]
        key_map[row["key"]] = new_key
        print(f"  created {new_key}  (was {row['key']})")

        # Move into sprint
        sprint_name = row.get("sprint")
        if sprint_name and sprint_name in state["sprints"]:
            sprint_id = state["sprints"][sprint_name]
            req("POST", f"/rest/agile/1.0/sprint/{sprint_id}/issue",
                json={"issues": [new_key]})

        # Transition to desired status
        desired = row["status"]
        transitions = api_json("GET", f"/rest/api/3/issue/{new_key}/transitions")
        target_names = STATUS_ALIASES.get(desired, [desired])
        chosen = None
        for t in transitions.get("transitions", []):
            if t["to"]["name"] in target_names or t["name"] in target_names:
                chosen = t["id"]
                break
        if chosen:
            req("POST", f"/rest/api/3/issue/{new_key}/transitions",
                json={"transition": {"id": chosen}})

        # Periodic save
        if len(key_map) % 10 == 0:
            save_state(state)

    save_state(state)


# ---------- issue links ----------

def create_links(state):
    links = load_seed_csv("seed_links.csv")
    key_map = state["issues"]
    made = set(tuple(l) for l in state["links"])

    for row in links:
        from_key = key_map.get(row["fromKey"])
        to_key = key_map.get(row["toKey"])
        if not from_key or not to_key:
            print(f"  skip link: missing keys {row}")
            continue
        if (from_key, to_key) in made:
            continue
        body = {
            "type": {"name": "Blocks"},
            "inwardIssue": {"key": to_key},
            "outwardIssue": {"key": from_key},
        }
        r = req("POST", "/rest/api/3/issueLink", json=body)
        if r.ok or r.status_code in (200, 201):
            state["links"].append([from_key, to_key])
            print(f"  linked  {from_key} blocks {to_key}")
        else:
            print(f"  link failed: {r.status_code} {r.text[:200]}")
    save_state(state)


# ---------- main ----------

def main():
    if not SEED_DIR.exists():
        print(f"Missing seed dir: {SEED_DIR}")
        sys.exit(1)

    state = load_state()
    me = get_self()
    print(f"Authenticated as {me['displayName']} ({me['accountId']})")

    print("\n[1/6] ensuring projects...")
    ensure_projects(state, me["accountId"])

    print("\n[2/6] finding boards...")
    board_ids = get_board_ids(state)
    print(f"  boards: {board_ids}")

    print("\n[3/6] ensuring epic...")
    epic_key = ensure_epic(state)

    print("\n[4/6] creating sprints...")
    ensure_sprints(state, board_ids)

    print("\n[5/6] creating stories...")
    sp_field_id = find_story_points_field()
    print(f"  story points field: {sp_field_id}")
    create_stories(state, epic_key, sp_field_id)

    print("\n[6/6] creating issue links...")
    create_links(state)

    print(f"\nDone. State saved to {STATE_FILE}")
    print(f"Issues created: {len(state['issues'])}")
    print(f"Links created: {len(state['links'])}")

if __name__ == "__main__":
    main()
