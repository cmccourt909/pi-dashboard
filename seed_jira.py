"""
Seed Jira — v2. Cross-project grouping via 'relates to' links instead of parent.

What changed from v1:
  * Stories no longer use the 'parent' field to point at PGM-1 (Jira Cloud
    rejects cross-project parents).
  * Instead, after each story is created, we add a 'Relates' issue link
    to PGM-1. This mirrors how enterprise Jira often handles cross-project
    features — via links, not native parent/child.

Idempotent, resumable via _state.json.
"""
import base64
import csv
import json
import os
import sys
import time
from pathlib import Path

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

FEATURE_LINK_TYPE = "Relates"


def load_state():
    if STATE_FILE.exists():
        return json.loads(STATE_FILE.read_text())
    return {"projects": {}, "epic_key": None, "sprints": {}, "issues": {}, "links": []}

def save_state(s):
    STATE_FILE.write_text(json.dumps(s, indent=2))


def req(method, path, **kwargs):
    url = f"{BASE_URL}{path}" if path.startswith("/") else path
    for _ in range(5):
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


def load_seed_csv(name):
    with open(SEED_DIR / name, newline="", encoding="utf-8") as f:
        return list(csv.DictReader(f))


def get_self():
    return api_json("GET", "/rest/api/3/myself")


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


def get_board_ids(state):
    boards = api_json("GET", "/rest/agile/1.0/board?maxResults=50")
    by_project = {}
    for b in boards.get("values", []):
        pk = b.get("location", {}).get("projectKey")
        if pk and pk not in by_project:
            by_project[pk] = b["id"]
    return by_project


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


def find_story_points_field():
    fields = api_json("GET", "/rest/api/3/field")
    for f in fields:
        if f.get("name") in ("Story Points", "Story point estimate"):
            return f["id"]
    return None


def ensure_sprints(state, board_ids):
    sprints_csv = load_seed_csv("seed_sprints.csv")
    for row in sprints_csv:
        if row["name"] in state["sprints"]:
            continue
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


def link_issue(from_key, to_key, link_type):
    body = {
        "type": {"name": link_type},
        "inwardIssue": {"key": to_key},
        "outwardIssue": {"key": from_key},
    }
    r = req("POST", "/rest/api/3/issueLink", json=body)
    return r.ok or r.status_code in (200, 201)


def create_stories(state, epic_key, sp_field_id):
    issues = load_seed_csv("seed_issues.csv")
    stories = [i for i in issues if i["issueType"] == "Story"]
    key_map = state["issues"]

    for row in stories:
        if row["key"] in key_map:
            continue

        fields = {
            "project": {"key": row["project"]},
            "issuetype": {"name": "Story"},
            "summary": row["summary"][:250],
            "priority": {"name": row["priority"] or "Medium"},
        }

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

        if epic_key:
            if not link_issue(new_key, epic_key, FEATURE_LINK_TYPE):
                print(f"    warn: could not link {new_key} to {epic_key}")

        sprint_name = row.get("sprint")
        if sprint_name and sprint_name in state["sprints"]:
            sprint_id = state["sprints"][sprint_name]
            req("POST", f"/rest/agile/1.0/sprint/{sprint_id}/issue",
                json={"issues": [new_key]})

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

        if len(key_map) % 10 == 0:
            save_state(state)

    save_state(state)


def create_blocks_links(state):
    try:
        links = load_seed_csv("seed_links.csv")
    except FileNotFoundError:
        print("  seed_links.csv not found; skipping blocks links")
        return
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
        if link_issue(from_key, to_key, "Blocks"):
            state["links"].append([from_key, to_key])
            print(f"  linked  {from_key} blocks {to_key}")
        else:
            print(f"  link failed: {row}")
    save_state(state)


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

    print("\n[5/6] creating stories (with feature link to epic)...")
    sp_field_id = find_story_points_field()
    print(f"  story points field: {sp_field_id}")
    create_stories(state, epic_key, sp_field_id)

    print("\n[6/6] creating Blocks dependency links...")
    create_blocks_links(state)

    print(f"\nDone. State saved to {STATE_FILE}")
    print(f"Issues created (stories): {len(state['issues'])}")
    print(f"Blocks links created: {len(state['links'])}")

if __name__ == "__main__":
    main()
