from pydantic import BaseModel, EmailStr, Field, ConfigDict
from typing import Optional, Dict, Any, List
from datetime import datetime

# --- User Schemas ---
class UserBase(BaseModel):
    email: EmailStr
    first_name: str
    last_name: str
    role: str = Field(description="Must be 'patient' or 'doctor'")
    dob: Optional[str] = None
    gender: Optional[str] = None

class UserCreate(UserBase):
    password: str

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserOut(UserBase):
    id: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

# --- Auth Schemas ---
class Token(BaseModel):
    access_token: str
    token_type: str
    role: str
    email: str
    name: str

class TokenData(BaseModel):
    email: Optional[str] = None
    role: Optional[str] = None

# --- Questionnaire Schemas ---
class QuestionnaireBase(BaseModel):
    pain_score: int = Field(..., ge=0, le=20)
    stiffness_score: int = Field(..., ge=0, le=8)
    mobility_score: int = Field(..., ge=0, le=100)
    walking_difficulty: int = Field(..., ge=0, le=4)
    stair_climbing: int = Field(..., ge=0, le=4)
    daily_activity_impact: int = Field(..., ge=0, le=4)
    raw_responses: Optional[Dict[str, Any]] = None

class QuestionnaireCreate(QuestionnaireBase):
    pass

class QuestionnaireOut(QuestionnaireBase):
    id: str
    assessment_id: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

# --- Assessment Schemas ---
class AssessmentBase(BaseModel):
    patient_id: str
    doctor_id: Optional[str] = None
    womac_score: Optional[float] = None
    koos_score: Optional[float] = None
    severity: Optional[str] = None
    confidence: Optional[float] = None
    risk_score: Optional[float] = None
    signal_file_name: Optional[str] = None
    signal_file_path: Optional[str] = None
    recommendations: Optional[str] = None

class AssessmentCreate(AssessmentBase):
    pass

class AssessmentOut(AssessmentBase):
    id: str
    assessment_date: datetime
    status: str
    questionnaire: Optional[QuestionnaireOut] = None
    created_at: datetime
    
    # Detailed patient information can be populated optionally
    patient: Optional[UserOut] = None
    doctor: Optional[UserOut] = None

    model_config = ConfigDict(from_attributes=True)

class AssessmentUpdate(BaseModel):
    recommendations: str
    doctor_id: Optional[str] = None

# --- Analytics Schemas ---
class SeverityDistributionItem(BaseModel):
    severity: str
    count: int

class TrendItem(BaseModel):
    date: str
    womac: float
    koos: float
    pain: float
    risk: float

class DoctorAnalytics(BaseModel):
    total_patients: int
    total_assessments: int
    severity_distribution: List[SeverityDistributionItem]
    recent_trends: List[TrendItem]
