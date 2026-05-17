from datetime import datetime

from sqlalchemy import Boolean, Column, Date, DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.orm import relationship

from .db import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, autoincrement=True)
    email = Column(String(255), unique=True, nullable=False, index=True)
    password_hash = Column(String(255), nullable=False)

    # "admin" or "alumni"
    role = Column(String(20), nullable=False, index=True)

    # For alumni, whether admin approved them.
    approved = Column(Boolean, nullable=False, default=False)

    # Profile fields (alumni)
    name = Column(String(255), nullable=True)
    batch = Column(String(50), nullable=True)
    course = Column(String(255), nullable=True)
    company = Column(String(255), nullable=True)
    company_type = Column(String(20), nullable=True)  # "company" or "higher"

    role_position = Column(String(255), nullable=True)
    bio = Column(Text, nullable=True)
    gender = Column(String(50), nullable=True)
    mobile = Column(String(50), nullable=True)
    experience = Column(Text, nullable=True)
    skills = Column(Text, nullable=True)
    achievements = Column(Text, nullable=True)
    profile_picture = Column(String(1024), nullable=True)

    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)

    feedbacks = relationship("Feedback", back_populates="alumni", cascade="all, delete-orphan")


class Event(Base):
    __tablename__ = "events"

    id = Column(Integer, primary_key=True, autoincrement=True)
    title = Column(String(255), nullable=False)
    desc = Column(Text, nullable=False)
    date = Column(Date, nullable=True, index=True)
    type = Column(String(20), nullable=False)  # "event" or "notice"
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)


class Job(Base):
    __tablename__ = "jobs"

    id = Column(Integer, primary_key=True, autoincrement=True)
    title = Column(String(255), nullable=False)
    company = Column(String(255), nullable=False)
    desc = Column(Text, nullable=False)
    type = Column(String(20), nullable=False)  # "job" or "internship"
    contact = Column(String(255), nullable=True)
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)


class Feedback(Base):
    __tablename__ = "feedbacks"

    id = Column(Integer, primary_key=True, autoincrement=True)

    alumni_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    submitted_at = Column(DateTime, nullable=False, default=datetime.utcnow)

    # Keep name/email for audit (frontend sends them too)
    name = Column(String(255), nullable=False)
    email = Column(String(255), nullable=False)

    academic_year = Column(String(50), nullable=True)
    present_address = Column(String(255), nullable=True)
    status = Column(String(20), nullable=False)  # "service" or "higher"

    designation = Column(String(255), nullable=True)
    organization = Column(String(255), nullable=True)
    program = Column(String(255), nullable=True)
    institution = Column(String(255), nullable=True)

    # Frontend asks for 10 rating questions (1..4)
    q1 = Column(Integer, nullable=False)
    q2 = Column(Integer, nullable=False)
    q3 = Column(Integer, nullable=False)
    q4 = Column(Integer, nullable=False)
    q5 = Column(Integer, nullable=False)
    q6 = Column(Integer, nullable=False)
    q7 = Column(Integer, nullable=False)
    q8 = Column(Integer, nullable=False)
    q9 = Column(Integer, nullable=False)
    q10 = Column(Integer, nullable=False)

    alumni = relationship("User", back_populates="feedbacks")

