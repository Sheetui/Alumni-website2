import os
from typing import List, Optional

from dotenv import load_dotenv
from fastapi import Depends, FastAPI, HTTPException, Query, status
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import desc, or_
from sqlalchemy.orm import Session

from app.auth import create_access_token, get_current_user, hash_password, verify_password
from app.db import get_db, init_db
from app.models import Event, Feedback, Job, User
from app.schemas import (
    EventCreateRequest,
    EventOut,
    FeedbackCreateRequest,
    FeedbackOut,
    JobCreateRequest,
    JobOut,
    LoginRequest,
    ProfileUpdateRequest,
    RegisterRequest,
    ResetPasswordRequest,
    TokenResponse,
    UserOut,
)
from app.seed import seed_demo_data

load_dotenv()


def _parse_origins(value: str) -> List[str]:
    value = (value or "").strip()
    if not value or value == "*":
        return ["*"]
    # Comma-separated
    return [v.strip() for v in value.split(",") if v.strip()]


app = FastAPI(title="Alumni Backend")

origins = _parse_origins(os.getenv("CORS_ORIGINS", "*"))
allow_credentials = "*" not in origins
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=allow_credentials,
    allow_methods=["*"],
    allow_headers=["*"],
)


def user_to_out(u: User) -> UserOut:
    # Explicit mapping keeps API stable even if model changes.
    return UserOut(
        id=u.id,
        email=u.email,
        role=u.role,  # type: ignore[arg-type]
        approved=u.approved,
        name=u.name,
        batch=u.batch,
        course=u.course,
        company=u.company,
        company_type=u.company_type,  # type: ignore[arg-type]
        role_position=u.role_position,
        bio=u.bio,
        gender=u.gender,
        mobile=u.mobile,
        experience=u.experience,
        skills=u.skills,
        achievements=u.achievements,
        profile_picture=u.profile_picture,
    )


@app.on_event("startup")
def startup() -> None:
    init_db()
    if os.getenv("AUTO_INIT", "1").lower() in ("1", "true", "yes"):
        gen = get_db()
        db = next(gen)
        try:
            seed_demo_data(db)
        finally:
            gen.close()


@app.get("/api/health")
def health() -> dict:
    return {"ok": True}


@app.post("/api/auth/register", status_code=status.HTTP_201_CREATED)
def register(payload: RegisterRequest, db: Session = Depends(get_db)) -> dict:
    email = payload.email.strip().lower()
    existing = db.query(User).filter(User.email == email).first()
    if existing:
        raise HTTPException(status_code=400, detail="Email is already registered.")

    if len(payload.password) < 6:
        raise HTTPException(status_code=400, detail="Password must be at least 6 characters.")

    user = User(
        email=email,
        password_hash=hash_password(payload.password),
        role="alumni",
        approved=False,
        name=payload.name,
        batch=payload.batch,
        course=payload.course,
        company_type=payload.company_type,  # type: ignore[arg-type]
        company=payload.company,
        role_position="",
    )
    db.add(user)
    db.commit()
    return {"ok": True, "message": "Registration successful. Awaiting admin approval."}


@app.post("/api/auth/login", response_model=TokenResponse)
def login(payload: LoginRequest, db: Session = Depends(get_db)) -> TokenResponse:
    email = payload.email.strip().lower()
    user = db.query(User).filter(User.email == email).first()
    if not user or not verify_password(payload.password, user.password_hash):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid email or password.")

    if user.role == "alumni" and not user.approved:
        raise HTTPException(status_code=403, detail="Your registration is pending admin approval.")

    token = create_access_token(str(user.id), extra_claims={"role": user.role})
    return TokenResponse(access_token=token, user=user_to_out(user))


@app.post("/api/auth/reset-password")
def reset_password(payload: ResetPasswordRequest, db: Session = Depends(get_db)) -> dict:
    email = payload.email.strip().lower()
    user = db.query(User).filter(User.email == email).first()
    if not user:
        raise HTTPException(status_code=404, detail="No account found with this email.")

    if payload.confirm_password is not None and payload.new_password != payload.confirm_password:
        raise HTTPException(status_code=400, detail="New password and confirm password do not match.")
    if len(payload.new_password) < 6:
        raise HTTPException(status_code=400, detail="New password must be at least 6 characters.")

    user.password_hash = hash_password(payload.new_password)
    db.add(user)
    db.commit()
    return {"ok": True, "message": "Password updated successfully."}


def require_admin(user: User) -> None:
    if user.role != "admin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin access required.")


@app.get("/api/admin/pending", response_model=List[UserOut])
def admin_pending(
    search: Optional[str] = Query(default=None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> List[UserOut]:
    require_admin(current_user)

    q = db.query(User).filter(User.role == "alumni", User.approved == False)  # noqa: E712
    if search:
        s = f"%{search.strip().lower()}%"
        q = q.filter(
            or_(
                User.name.ilike(s),
                User.email.ilike(s),
                User.company.ilike(s),
                User.batch.ilike(s),
            )
        )
    return [user_to_out(u) for u in q.order_by(User.created_at.desc()).all()]


@app.post("/api/admin/pending/{user_id}/approve")
def admin_approve(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> dict:
    require_admin(current_user)

    user = db.query(User).filter(User.id == user_id, User.role == "alumni").first()
    if not user:
        raise HTTPException(status_code=404, detail="Pending alumni not found.")
    if user.approved:
        return {"ok": True, "message": "Already approved."}
    user.approved = True
    db.add(user)
    db.commit()
    return {"ok": True, "message": "Alumni approved."}


@app.post("/api/admin/pending/{user_id}/reject")
def admin_reject(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> dict:
    require_admin(current_user)

    user = db.query(User).filter(User.id == user_id, User.role == "alumni", User.approved == False).first()  # noqa: E712
    if not user:
        raise HTTPException(status_code=404, detail="Pending alumni not found.")
    db.delete(user)
    db.commit()
    return {"ok": True, "message": "Alumni rejected."}


@app.get("/api/admin/alumni", response_model=List[UserOut])
def admin_alumni(
    search: Optional[str] = Query(default=None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> List[UserOut]:
    require_admin(current_user)

    q = db.query(User).filter(User.role == "alumni", User.approved == True)  # noqa: E712
    if search:
        s = f"%{search.strip().lower()}%"
        q = q.filter(
            or_(
                User.name.ilike(s),
                User.email.ilike(s),
                User.company.ilike(s),
                User.batch.ilike(s),
            )
        )
    return [user_to_out(u) for u in q.order_by(User.created_at.desc()).all()]


@app.get("/api/alumni", response_model=List[UserOut])
def public_alumni(
    search: Optional[str] = Query(default=None),
    db: Session = Depends(get_db),
) -> List[UserOut]:
    q = db.query(User).filter(User.role == "alumni", User.approved == True)  # noqa: E712
    if search:
        s = f"%{search.strip().lower()}%"
        q = q.filter(
            or_(
                User.name.ilike(s),
                User.email.ilike(s),
                User.company.ilike(s),
                User.batch.ilike(s),
            )
        )
    return [user_to_out(u) for u in q.order_by(User.created_at.desc()).all()]


@app.get("/api/events", response_model=List[EventOut])
def get_events(db: Session = Depends(get_db)) -> List[EventOut]:
    events = db.query(Event).order_by(desc(Event.date), desc(Event.created_at)).all()
    return [
        EventOut(id=e.id, title=e.title, desc=e.desc, date=e.date, type=e.type)  # type: ignore[arg-type]
        for e in events
    ]


@app.post("/api/admin/events", response_model=EventOut)
def create_event(
    payload: EventCreateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> EventOut:
    require_admin(current_user)
    event = Event(title=payload.title, desc=payload.desc, date=payload.date, type=payload.type)  # type: ignore[arg-type]
    db.add(event)
    db.commit()
    db.refresh(event)
    return EventOut(id=event.id, title=event.title, desc=event.desc, date=event.date, type=event.type)  # type: ignore[arg-type]


@app.get("/api/jobs", response_model=List[JobOut])
def get_jobs(db: Session = Depends(get_db)) -> List[JobOut]:
    jobs = db.query(Job).order_by(desc(Job.created_at)).all()
    return [
        JobOut(
            id=j.id,
            title=j.title,
            company=j.company,
            desc=j.desc,
            type=j.type,  # type: ignore[arg-type]
            contact=j.contact,
        )
        for j in jobs
    ]


@app.post("/api/admin/jobs", response_model=JobOut)
def create_job(
    payload: JobCreateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> JobOut:
    require_admin(current_user)
    job = Job(
        title=payload.title,
        company=payload.company,
        desc=payload.desc,
        type=payload.type,  # type: ignore[arg-type]
        contact=payload.contact,
    )
    db.add(job)
    db.commit()
    db.refresh(job)
    return JobOut(
        id=job.id,
        title=job.title,
        company=job.company,
        desc=job.desc,
        type=job.type,  # type: ignore[arg-type]
        contact=job.contact,
    )


@app.get("/api/me", response_model=UserOut)
def me(current_user: User = Depends(get_current_user)) -> UserOut:
    return user_to_out(current_user)


@app.put("/api/me/profile", response_model=UserOut)
def update_profile(
    payload: ProfileUpdateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> UserOut:
    if current_user.role != "alumni":
        raise HTTPException(status_code=403, detail="Only alumni can update profile.")

    email = payload.email.strip().lower()
    if email != current_user.email:
        raise HTTPException(status_code=400, detail="Email mismatch. You cannot change login email.")

    current_user.name = payload.name
    current_user.mobile = payload.mobile
    current_user.gender = payload.gender
    current_user.batch = payload.batch
    current_user.course = payload.course
    current_user.company_type = payload.company_type  # type: ignore[arg-type]
    current_user.company = payload.company
    current_user.experience = payload.experience
    current_user.profile_picture = payload.profile_picture
    current_user.skills = payload.skills
    current_user.achievements = payload.achievements

    db.add(current_user)
    db.commit()
    db.refresh(current_user)
    return user_to_out(current_user)


@app.post("/api/feedback", response_model=FeedbackOut)
def submit_feedback(
    payload: FeedbackCreateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> FeedbackOut:
    if current_user.role != "alumni":
        raise HTTPException(status_code=403, detail="Only alumni can submit feedback.")
    if not current_user.approved:
        raise HTTPException(status_code=403, detail="Please wait for admin approval before submitting feedback.")

    # Minimal rating validation (frontend sends 1..4)
    rating_fields = [f"q{i}" for i in range(1, 11)]
    for field in rating_fields:
        value = getattr(payload, field)
        if value < 1 or value > 4:
            raise HTTPException(status_code=400, detail="Rating values must be between 1 and 4.")

    fb = Feedback(
        alumni_id=current_user.id,
        name=payload.name.strip(),
        email=payload.email.strip().lower(),
        academic_year=payload.academic_year,
        present_address=payload.present_address,
        status=payload.status,  # type: ignore[arg-type]
        designation=payload.designation,
        organization=payload.organization,
        program=payload.program,
        institution=payload.institution,
        q1=payload.q1,
        q2=payload.q2,
        q3=payload.q3,
        q4=payload.q4,
        q5=payload.q5,
        q6=payload.q6,
        q7=payload.q7,
        q8=payload.q8,
        q9=payload.q9,
        q10=payload.q10,
    )
    db.add(fb)
    db.commit()
    db.refresh(fb)
    return FeedbackOut(
        id=fb.id,
        submitted_at=fb.submitted_at,
        alumni_id=fb.alumni_id,
        status=fb.status,  # type: ignore[arg-type]
    )


@app.get("/api/admin/feedback", response_model=List[FeedbackOut])
def admin_get_feedback(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> List[FeedbackOut]:
    require_admin(current_user)
    
    feedback = db.query(Feedback).order_by(desc(Feedback.submitted_at)).all()
    return [
        FeedbackOut(
            id=fb.id,
            submitted_at=fb.submitted_at,
            alumni_id=fb.alumni_id,
            status=fb.status,  # type: ignore[arg-type]
        )
        for fb in feedback
    ]

