# Jira Sandbox Seeder

Seeds a fresh Jira Cloud instance with the sanitized Express Scripts data.

## Quick start

1. **Install dependencies:**
   ```
   pip install requests python-dotenv
   ```

2. **Create a `.env` file in this folder:**
   ```
   JIRA_BASE_URL=https://chrismc90.atlassian.net
   JIRA_EMAIL=chris1.mccourt@gmail.com
   JIRA_TOKEN=your_classic_api_token_here
   ```

3. **Put the seed CSVs in an `output/` subfolder:**
   ```
   seeder/
     seed_jira.py
     .env
     output/
       seed_issues.csv
       seed_sprints.csv
       seed_links.csv
   ```

4. **Run it:**
   ```
   python seed_jira.py
   ```

## What it does

Creates, in order:
1. Four Scrum projects — TSU, PNR, ISC, PGM
2. One parent epic in PGM
3. 13 sprints across the three Scrum boards with correct dates and states
4. 76 stories, each assigned to the right project, sprint, and status
5. 8 `Blocks` dependency links between stories

## Resumability

State is tracked in `_state.json`. If the script fails partway, re-run it —
already-created projects, sprints, and issues will be skipped.

To start from scratch: delete `_state.json` AND delete the projects in
Jira (Settings -> Projects -> trash icon). Then run again.

## Expected runtime

About 3-5 minutes for 76 issues on a fresh instance. Mostly sequential
API calls; no concurrency because Jira's rate limits don't reward it
for this volume.

## Verification

After running, open Jira in a browser and:
- Browse -> Projects: see TSU, PNR, ISC, PGM
- Go to PGM -> browse epic list: see one epic with 76 child stories
- Go to TSU board: see active sprint with stories in it
- Open any TSU story marked "blocks" something: see link to ISC story

Or hit the API:
```
curl -u "email:token" "https://chrismc90.atlassian.net/rest/api/3/search?jql=parent=PGM-1&maxResults=100" | jq '.total'
```
Should return 76.
