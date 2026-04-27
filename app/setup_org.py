from __future__ import annotations
import re
from datetime import datetime
from sqlalchemy.orm import Session
from app.models import Organization, ProgramIncrement, Site, Sprint, get_engine

PI_DEFINITIONS = [
    ("26.1", datetime(2026, 1,  1),  datetime(2026, 3, 11)),
    ("26.2", datetime(2026, 3, 12),  datetime(2026, 5, 20)),
    ("26.3", datetime(2026, 5, 21),  datetime(2026, 7, 29)),
    ("26.4", datetime(2026, 7, 30),  datetime(2026, 10,  7)),
    ("26.5", datetime(2026, 10, 8),  datetime(2026, 12, 31)),
]

def extract_pi_name(sprint_name):
    match = re.search(r'\b(\d+\.\d+)\.\d+\b', sprint_name)
    return match.group(1) if match else None

def run():
    engine = get_engine()
    with Session(engine) as session:
        org = session.query(Organization).filter_by(name="Default Org").first()
        if not org:
            org = Organization(name="Default Org")
            session.add(org)
            session.flush()
            print("Created org: Default Org id=" + str(org.id))
        else:
            print("Org exists: Default Org id=" + str(org.id))
        pi_map = {}
        for name, start, end in PI_DEFINITIONS:
            pi = session.query(ProgramIncrement).filter_by(org_id=org.id, name=name).first()
            if not pi:
                pi = ProgramIncrement(org_id=org.id, name=name, start_date=start, end_date=end)
                session.add(pi)
                session.flush()
                print("Created PI: " + name)
            else:
                print("PI exists: " + name)
            pi_map[name] = pi
        sites = session.query(Site).all()
        if not sites:
            print("No sites found - run ingest first then re-run this script")
        for site in sites:
            if site.org_id is None:
                site.org_id = org.id
                print("Linked site: " + site.display_name)
            else:
                print("Site already linked: " + site.display_name)
        sprints = session.query(Sprint).all()
        if not sprints:
            print("No sprints found - run ingest first then re-run this script")
        else:
            assigned = 0
            already = 0
            unmatched = []
            for sprint in sprints:
                pi_name = extract_pi_name(sprint.name)
                if pi_name and pi_name in pi_map:
                    if sprint.pi_id is None:
                        sprint.pi_id = pi_map[pi_name].id
                        assigned += 1
                    else:
                        already += 1
                else:
                    unmatched.append(sprint.name)
            print("Sprints assigned: " + str(assigned) + " newly, " + str(already) + " already")
            if unmatched:
                print("Unmatched sprints:")
                for n in unmatched:
                    print("  - " + n)
        session.commit()
        print("Done.")

if __name__ == "__main__":
    run()
