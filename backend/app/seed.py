from datetime import date

from sqlalchemy.orm import Session

from .auth import hash_password
from .models import Event, Job, User


def seed_demo_data(db: Session) -> None:
    # Admin demo account
    admin_email = "admin@college.edu"
    admin = db.query(User).filter(User.email == admin_email).first()
    if not admin:
        admin = User(
            email=admin_email,
            password_hash=hash_password("admin123"),
            role="admin",
            approved=True,  # admins don't use this, but keep it valid
            name="Admin",
        )
        db.add(admin)

    # Approved alumni demo account
    alumni_email = "alumni@test.com"
    alumni = db.query(User).filter(User.email == alumni_email).first()
    if not alumni:
        alumni = User(
            email=alumni_email,
            password_hash=hash_password("alumni123"),
            role="alumni",
            approved=True,
            name="John Doe",
            batch="2019",
            course="Information Technology",
            company="Tech Corp",
            company_type="company",
            role_position="Software Engineer",
            bio="Alumni from CS batch 2019.",
            gender="Male",
            mobile="9876543210",
            experience="3 years",
            skills="JavaScript, React, Node.js",
            achievements="Best Outgoing Student 2019",
            profile_picture="",
        )
        db.add(alumni)

    # Seed events if empty
    if db.query(Event).count() == 0:
        db.add_all(
            [
                Event(
                    title="Annual Alumni Meet 2025",
                    desc="Join us for the annual alumni reunion. Date: March 15, 2025.",
                    date=date.fromisoformat("2025-03-15"),
                    type="event",
                ),
                Event(
                    title="Career Workshop",
                    desc="Workshop on resume building and interview skills. Open to all alumni and students.",
                    date=date.fromisoformat("2025-02-25"),
                    type="event",
                ),
            ]
        )

    # Seed jobs if empty
    if db.query(Job).count() == 0:
        db.add_all(
            [
                Job(
                    title="Software Developer",
                    company="Tech Solutions",
                    desc="Looking for passionate developers. 2+ years experience.",
                    type="job",
                    contact="hr@techsolutions.com",
                ),
                Job(
                    title="Summer Intern - Data Science",
                    company="AI Labs",
                    desc="6-month internship for final year students.",
                    type="internship",
                    contact="interns@ailabs.com",
                ),
            ]
        )

    db.commit()

