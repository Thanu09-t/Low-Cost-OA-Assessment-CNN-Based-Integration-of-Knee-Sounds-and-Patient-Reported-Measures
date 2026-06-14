from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Dict, Any

from app.database import get_db
from app.models import User, Assessment, Questionnaire
from app.schemas import UserOut, TrendItem
from app.auth import get_current_user

router = APIRouter(prefix="/patients", tags=["Patients"])

@router.get("/profile", response_model=UserOut)
def get_patient_profile(current_user: User = Depends(get_current_user)):
    """
    Get profile data of the logged-in user.
    """
    return current_user

@router.get("/progression", response_model=List[TrendItem])
def get_patient_progression(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Retrieves history of scores over time for patient dashboard charts.
    """
    if current_user.role != "patient":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only patients can fetch their progression metrics"
        )
        
    assessments = db.query(Assessment).filter(
        Assessment.patient_id == current_user.id
    ).order_by(Assessment.assessment_date.asc()).all()
    
    trends = []
    for ass in assessments:
        # Get questionnaire details
        q = db.query(Questionnaire).filter(Questionnaire.assessment_id == ass.id).first()
        pain_val = float(q.pain_score) if q else 0.0
        
        trends.append({
            "date": ass.assessment_date.strftime("%Y-%m-%d"),
            "womac": float(ass.womac_score) if ass.womac_score else 0.0,
            "koos": float(ass.koos_score) if ass.koos_score else 0.0,
            "pain": pain_val,
            "risk": float(ass.risk_score) if ass.risk_score else 0.0
        })
        
    return trends
