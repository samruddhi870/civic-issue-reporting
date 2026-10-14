# DFD 1.0-9.0 - Seed Script with Demo Municipal Data (1 Admin, 3 Officers, 10 Issues)
import os
from datetime import datetime, timezone, timedelta
from app import create_app
from database import db
from models import User, Department, SlaRule, Issue, IssuePhoto, StatusLog, Comment, Upvote

def seed_database():
    app = create_app()
    with app.app_context():
        print("[SEED] Seeding CivicConnect database...")
        db.drop_all()
        db.create_all()

        # 1. Departments
        dept_water = Department(name="Water Supply & Drainage", code="WATER", description="Water supply lines, pipelines, and open manholes")
        dept_roads = Department(name="Roads & Infrastructure", code="ROADS", description="Potholes, asphalt damage, dividers, and road repairs")
        dept_sanitation = Department(name="Public Health & Sanitation", code="SANITATION", description="Solid waste, garbage collection, and hygiene")
        dept_lighting = Department(name="Electrical & Street Lighting", code="LIGHTING", description="Streetlights, exposed wires, and electrical poles")
        dept_general = Department(name="General Administration", code="GENERAL", description="Other municipal and civic grievances")

        db.session.add_all([dept_water, dept_roads, dept_sanitation, dept_lighting, dept_general])
        db.session.commit()

        # 2. SLA Rules
        sla_rules = [
            SlaRule(category="Water leakage", department_id=dept_water.id, sla_hours=24),
            SlaRule(category="Open manhole", department_id=dept_water.id, sla_hours=24),
            SlaRule(category="Garbage / Waste", department_id=dept_sanitation.id, sla_hours=48),
            SlaRule(category="Streetlight / Electricity", department_id=dept_lighting.id, sla_hours=48),
            SlaRule(category="Pothole / Road damage", department_id=dept_roads.id, sla_hours=120),
            SlaRule(category="Other", department_id=dept_general.id, sla_hours=168),
        ]
        db.session.add_all(sla_rules)
        db.session.commit()

        # 3. Users: 1 Admin, 3 Officers, 2 Citizens
        admin_user = User(
            email="admin@civicconnect.org",
            full_name="Municipal Commissioner",
            phone="+919800000001",
            role="admin",
            department_id=dept_general.id
        )
        admin_user.set_password("AdminPassword123!")

        officer_water = User(
            email="officer.water@civicconnect.org",
            full_name="Rajesh Sharma (Water Officer)",
            phone="+919800000002",
            role="officer",
            department_id=dept_water.id
        )
        officer_water.set_password("OfficerPassword123!")

        officer_roads = User(
            email="officer.roads@civicconnect.org",
            full_name="Anita Deshmukh (Roads Officer)",
            phone="+919800000003",
            role="officer",
            department_id=dept_roads.id
        )
        officer_roads.set_password("OfficerPassword123!")

        officer_sanitation = User(
            email="officer.sanitation@civicconnect.org",
            full_name="Vikram Patil (Sanitation Officer)",
            phone="+919800000004",
            role="officer",
            department_id=dept_sanitation.id
        )
        officer_sanitation.set_password("OfficerPassword123!")

        citizen1 = User(
            email="citizen@example.com",
            full_name="Pooja Kulkarni",
            phone="+919800000005",
            role="citizen"
        )
        citizen1.set_password("CitizenPassword123!")

        citizen2 = User(
            email="citizen2@example.com",
            full_name="Amit Joshi",
            phone="+919800000006",
            role="citizen"
        )
        citizen2.set_password("CitizenPassword123!")

        db.session.add_all([admin_user, officer_water, officer_roads, officer_sanitation, citizen1, citizen2])
        db.session.commit()

        # Assign Dept Heads
        dept_water.head_user_id = officer_water.id
        dept_roads.head_user_id = officer_roads.id
        dept_sanitation.head_user_id = officer_sanitation.id
        db.session.commit()

        # 4. 10 Sample Issues
        now = datetime.now(timezone.utc)
        sample_issues_data = [
            {
                "ticket": "CC-2026-00001",
                "title": "Severe main pipeline burst flooding street",
                "desc": "Drinking water pipeline ruptured near central square. Continuous gushing water for past 3 hours.",
                "category": "Water leakage",
                "severity": "emergency",
                "dept": dept_water.id,
                "officer": officer_water.id,
                "lat": 18.5204,
                "lng": 73.8567,
                "address": "FC Road, Deccan Gymkhana, Pune",
                "ward": "Ward 12 - Shivajinagar",
                "status": "In Progress",
                "hours_ago": 10,
                "sla_hours": 24,
                "upvotes": 14,
                "anonymous": False,
                "photos": ["https://images.unsplash.com/photo-1541888946425-d0fbb1861593?w=800&auto=format&fit=crop&q=80"]
            },
            {
                "ticket": "CC-2026-00002",
                "title": "Uncovered deep storm manhole near primary school",
                "desc": "Open manhole cover missing on footpath right outside the municipal primary school gate. Hazardous for children.",
                "category": "Open manhole",
                "severity": "emergency",
                "dept": dept_water.id,
                "officer": officer_water.id,
                "lat": 18.5230,
                "lng": 73.8510,
                "address": "Model Colony, Pune",
                "ward": "Ward 12 - Shivajinagar",
                "status": "Submitted",
                "hours_ago": 3,
                "sla_hours": 24,
                "upvotes": 28,
                "anonymous": False,
                "photos": ["https://images.unsplash.com/photo-1517646287270-a5a9ca602e5c?w=800&auto=format&fit=crop&q=80"]
            },
            {
                "ticket": "CC-2026-00003",
                "title": "Overflowing community garbage dump container",
                "desc": "Garbage has not been picked up for 4 days. Waste spilled onto the main road causing foul odor and stray animals.",
                "category": "Garbage / Waste",
                "severity": "high",
                "dept": dept_sanitation.id,
                "officer": officer_sanitation.id,
                "lat": 18.5089,
                "lng": 73.8340,
                "address": "Karve Road, Kothrud, Pune",
                "ward": "Ward 8 - Kothrud",
                "status": "Acknowledged",
                "hours_ago": 18,
                "sla_hours": 48,
                "upvotes": 9,
                "anonymous": False,
                "photos": ["https://images.unsplash.com/photo-1530587191325-3db32d826c18?w=800&auto=format&fit=crop&q=80"]
            },
            {
                "ticket": "CC-2026-00004",
                "title": "Dangerous deep pothole cluster on flyover ramp",
                "desc": "Multiple large potholes measuring 1.5 ft wide on the descent ramp of the flyover. Two bikers skidded yesterday.",
                "category": "Pothole / Road damage",
                "severity": "high",
                "dept": dept_roads.id,
                "officer": officer_roads.id,
                "lat": 18.5314,
                "lng": 73.8446,
                "address": "University Road Flyover, Pune",
                "ward": "Ward 10 - Aundh",
                "status": "In Progress",
                "hours_ago": 48,
                "sla_hours": 120,
                "upvotes": 35,
                "anonymous": False,
                "photos": ["https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?w=800&auto=format&fit=crop&q=80"]
            },
            {
                "ticket": "CC-2026-00005",
                "title": "Complete blackout - 5 broken streetlights in residential lane",
                "desc": "All five streetlights from pole 41 to 46 are non-functional for past 3 nights. Entire street is pitch dark.",
                "category": "Streetlight / Electricity",
                "severity": "medium",
                "dept": dept_lighting.id,
                "officer": None,
                "lat": 18.5018,
                "lng": 73.8636,
                "address": "Bibvewadi Main Road, Pune",
                "ward": "Ward 15 - Bibvewadi",
                "status": "Submitted",
                "hours_ago": 26,
                "sla_hours": 48,
                "upvotes": 6,
                "anonymous": True,
                "photos": ["https://images.unsplash.com/photo-1509114397022-ed747cca3f65?w=800&auto=format&fit=crop&q=80"]
            },
            {
                "ticket": "CC-2026-00006",
                "title": "CRITICAL OVERDUE: Sewage backflow onto pedestrian walkway",
                "desc": "Drainage chamber overflowing into market area. Stench unbearable and business affected. Reported 3 days ago.",
                "category": "Water leakage",
                "severity": "high",
                "dept": dept_water.id,
                "officer": officer_water.id,
                "lat": 18.5158,
                "lng": 73.8550,
                "address": "Laxmi Road Market, Pune",
                "ward": "Ward 14 - Kasba Peth",
                "status": "Acknowledged",
                "hours_ago": 72,  # Overdue for 24h SLA!
                "sla_hours": 24,
                "upvotes": 42,
                "anonymous": False,
                "photos": ["https://images.unsplash.com/photo-1541888946425-d0fbb1861593?w=800&auto=format&fit=crop&q=80"]
            },
            {
                "ticket": "CC-2026-00007",
                "title": "RESOLVED: Pothole filled and leveled near bus stop",
                "desc": "Large pothole in front of the city bus stop filled with bitumen mix. Resolution verified.",
                "category": "Pothole / Road damage",
                "severity": "medium",
                "dept": dept_roads.id,
                "officer": officer_roads.id,
                "lat": 18.5284,
                "lng": 73.8744,
                "address": "Pune Station Bus Depot, Pune",
                "ward": "Ward 7 - Pune Station",
                "status": "Resolved",
                "hours_ago": 96,
                "sla_hours": 120,
                "upvotes": 12,
                "anonymous": False,
                "photos": ["https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?w=800&auto=format&fit=crop&q=80"],
                "after_photo": "https://images.unsplash.com/photo-1584463699039-445a49a9446a?w=800&auto=format&fit=crop&q=80"
            },
            {
                "ticket": "CC-2026-00008",
                "title": "Illegal construction debris dumped on public footpath",
                "desc": "Concrete blocks and plaster debris obstructing the walking track for senior citizens.",
                "category": "Garbage / Waste",
                "severity": "low",
                "dept": dept_sanitation.id,
                "officer": officer_sanitation.id,
                "lat": 18.5590,
                "lng": 73.7868,
                "address": "Baner High Street, Pune",
                "ward": "Ward 3 - Baner",
                "status": "Submitted",
                "hours_ago": 5,
                "sla_hours": 48,
                "upvotes": 4,
                "anonymous": False,
                "photos": ["https://images.unsplash.com/photo-1530587191325-3db32d826c18?w=800&auto=format&fit=crop&q=80"]
            },
            {
                "ticket": "CC-2026-00009",
                "title": "Blinking streetlight causing glare and disturbance",
                "desc": "Rapidly blinking LED streetlight right outside 2nd floor residential balcony.",
                "category": "Streetlight / Electricity",
                "severity": "low",
                "dept": dept_lighting.id,
                "officer": None,
                "lat": 18.4900,
                "lng": 73.8500,
                "address": "Sahakar Nagar, Pune",
                "ward": "Ward 16 - Parvati",
                "status": "Submitted",
                "hours_ago": 12,
                "sla_hours": 48,
                "upvotes": 2,
                "anonymous": True,
                "photos": ["https://images.unsplash.com/photo-1509114397022-ed747cca3f65?w=800&auto=format&fit=crop&q=80"]
            },
            {
                "ticket": "CC-2026-00010",
                "title": "Tree branch fallen and blocking public road divider",
                "desc": "Heavy branch fell after storm, partially blocking left traffic lane.",
                "category": "Other",
                "severity": "medium",
                "dept": dept_general.id,
                "officer": None,
                "lat": 18.5362,
                "lng": 73.8958,
                "address": "Koregaon Park North Main Road, Pune",
                "ward": "Ward 5 - Koregaon Park",
                "status": "Submitted",
                "hours_ago": 2,
                "sla_hours": 168,
                "upvotes": 7,
                "anonymous": False,
                "photos": ["https://images.unsplash.com/photo-1517646287270-a5a9ca602e5c?w=800&auto=format&fit=crop&q=80"]
            }
        ]

        for item in sample_issues_data:
            created_time = now - timedelta(hours=item["hours_ago"])
            sla_deadline = created_time + timedelta(hours=item["sla_hours"])
            
            # Check overdue status for seed data
            is_overdue = now > sla_deadline and item["status"] not in ["Resolved", "Closed"]
            escalation_level = 3 if is_overdue and (now - sla_deadline).total_seconds() > (item["sla_hours"] * 3600) else (2 if is_overdue else 0)

            issue = Issue(
                ticket_number=item["ticket"],
                citizen_id=None if item["anonymous"] else citizen1.id,
                is_anonymous=item["anonymous"],
                title=item["title"],
                description=item["desc"],
                category=item["category"],
                severity=item["severity"],
                department_id=item["dept"],
                assigned_officer_id=item["officer"],
                latitude=item["lat"],
                longitude=item["lng"],
                address=item["address"],
                ward_area=item["ward"],
                status=item["status"],
                sla_hours=item["sla_hours"],
                sla_deadline=sla_deadline,
                escalation_level=escalation_level,
                is_critical_overdue=(escalation_level >= 3),
                upvote_count=item["upvotes"],
                priority_score=15.0,
                created_at=created_time,
                resolved_at=(now - timedelta(hours=10)) if item["status"] == "Resolved" else None,
                resolution_proof_url=item.get("after_photo"),
                resolution_remarks="Road bitumen surface patched and rolled." if item["status"] == "Resolved" else None
            )

            # Severity weight
            sev_weights = {"emergency": 40.0, "high": 25.0, "medium": 15.0, "low": 5.0}
            base = sev_weights.get(issue.severity, 15.0)
            overdue_days = max(0, (now - sla_deadline).total_seconds() / 86400.0) if is_overdue else 0
            issue.priority_score = round(base + (1.5 * issue.upvote_count) + (2.0 * overdue_days), 2)

            db.session.add(issue)
            db.session.flush()

            # Add photo
            for photo_url in item.get("photos", []):
                p = IssuePhoto(
                    issue_id=issue.id,
                    photo_type="before",
                    image_url=photo_url,
                    file_size=102400,
                    mime_type="image/jpeg"
                )
                db.session.add(p)

            # If resolved, add after photo
            if item.get("after_photo"):
                p_after = IssuePhoto(
                    issue_id=issue.id,
                    photo_type="after",
                    image_url=item["after_photo"],
                    file_size=102400,
                    mime_type="image/jpeg"
                )
                db.session.add(p_after)

            # Initial status log
            log = StatusLog(
                issue_id=issue.id,
                from_status=None,
                to_status="Submitted",
                changed_by_user_id=citizen1.id if not item["anonymous"] else None,
                remarks="Issue created in civic system.",
                created_at=created_time
            )
            db.session.add(log)

            if item["status"] in ["Acknowledged", "In Progress", "Resolved"]:
                log2 = StatusLog(
                    issue_id=issue.id,
                    from_status="Submitted",
                    to_status=item["status"],
                    changed_by_user_id=item["officer"],
                    remarks=f"Status transitioned to {item['status']}.",
                    created_at=created_time + timedelta(hours=1)
                )
                db.session.add(log2)

            # Sample comment
            comment = Comment(
                issue_id=issue.id,
                user_id=citizen2.id,
                is_official=False,
                content="I pass through this area daily, highly appreciate quick resolution!",
                created_at=created_time + timedelta(hours=2)
            )
            db.session.add(comment)

        db.session.commit()
        print("[SUCCESS] Database successfully seeded with 1 Admin, 3 Officers, 2 Citizens, and 10 Sample Issues!")

if __name__ == "__main__":
    seed_database()
