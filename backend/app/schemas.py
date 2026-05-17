from datetime import date, datetime
from typing import Literal, Optional

from pydantic import BaseModel, EmailStr


Role = Literal["admin", "alumni"]
CompanyType = Literal["company", "higher"]
EventType = Literal["event", "notice"]
JobType = Literal["job", "internship"]
FeedbackStatus = Literal["service", "higher"]


class UserOut(BaseModel):
    id: int
    email: EmailStr
    role: Role
    approved: bool

    name: Optional[str] = None
    batch: Optional[str] = None
    course: Optional[str] = None
    company: Optional[str] = None
    company_type: Optional[CompanyType] = None
    role_position: Optional[str] = None
    bio: Optional[str] = None
    gender: Optional[str] = None
    mobile: Optional[str] = None
    experience: Optional[str] = None
    skills: Optional[str] = None
    achievements: Optional[str] = None
    profile_picture: Optional[str] = None


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserOut


class RegisterRequest(BaseModel):
    email: EmailStr
    password: str

    name: str
    batch: str
    course: str
    company_type: CompanyType
    company: str  # company name OR higher studies name


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class ResetPasswordRequest(BaseModel):
    email: EmailStr
    new_password: str
    confirm_password: Optional[str] = None


class ProfileUpdateRequest(BaseModel):
    name: str
    email: EmailStr

    mobile: Optional[str] = None
    gender: Optional[str] = None
    batch: Optional[str] = None
    course: Optional[str] = None

    company_type: CompanyType = "company"
    company: str = ""

    experience: Optional[str] = None
    profile_picture: Optional[str] = None
    skills: Optional[str] = None
    achievements: Optional[str] = None


class EventCreateRequest(BaseModel):
    title: str
    desc: str
    date: Optional[date] = None
    type: EventType


class EventOut(BaseModel):
    id: int
    title: str
    desc: str
    date: Optional[date] = None
    type: EventType


class JobCreateRequest(BaseModel):
    title: str
    company: str
    desc: str
    type: JobType
    contact: Optional[str] = None


class JobOut(BaseModel):
    id: int
    title: str
    company: str
    desc: str
    type: JobType
    contact: Optional[str] = None


class FeedbackCreateRequest(BaseModel):
    name: str
    email: EmailStr

    alumni_id: Optional[int] = None  # frontend sends it; we still authorize via token

    academic_year: Optional[str] = None
    present_address: Optional[str] = None
    status: FeedbackStatus

    designation: Optional[str] = None
    organization: Optional[str] = None
    program: Optional[str] = None
    institution: Optional[str] = None

    q1: int
    q2: int
    q3: int
    q4: int
    q5: int
    q6: int
    q7: int
    q8: int
    q9: int
    q10: int


class FeedbackOut(BaseModel):
    id: int
    submitted_at: datetime
    alumni_id: int
    status: FeedbackStatus

