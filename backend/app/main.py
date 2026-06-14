import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from sqlalchemy.orm import Session

from app.database import engine, Base, SessionLocal
from app.config import settings
from app.routers import auth, patients, doctors, assessments
from app.models import User, Assessment, Questionnaire
from app.auth import get_password_hash
import datetime

# Create database tables
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title=settings.PROJECT_NAME,
    description="Low-Cost Knee Osteoarthritis Assessment System API",
    version="1.0.0"
)

# Enable CORS for frontend requests
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # For dev environment
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Serve uploaded files and plots statically
os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
app.mount("/api/uploads", StaticFiles(directory=settings.UPLOAD_DIR), name="uploads")

# Include Routers
app.include_router(auth.router, prefix="/api")
app.include_router(patients.router, prefix="/api")
app.include_router(doctors.router, prefix="/api")
app.include_router(assessments.router, prefix="/api")

@app.get("/")
def read_root():
    return {
        "status": "online",
        "service": "OA Insight API",
        "timestamp": datetime.datetime.utcnow().isoformat()
    }

# --- Database Auto-Seeding ---
@app.on_event("startup")
def seed_database():
    db = SessionLocal()
    try:
        # Check if database is already seeded
        user_count = db.query(User).count()
        if user_count == 0:
            print("Seeding database with sample clinic data...")
            
            # 1. Create Sample Clinician
            doctor = User(
                email="doctor@oainsight.com",
                hashed_password=get_password_hash("Password123!"),
                first_name="Dr. Sarah",
                last_name="Jenkins",
                role="doctor",
                dob="1978-04-12",
                gender="Female"
            )
            db.add(doctor)
            
            # 2. Create Sample Patient
            patient = User(
                email="patient@oainsight.com",
                hashed_password=get_password_hash("Password123!"),
                first_name="Robert",
                last_name="Miller",
                role="patient",
                dob="1959-11-23",
                gender="Male"
            )
            db.add(patient)
            db.commit()
            db.refresh(doctor)
            db.refresh(patient)
            
            # 3. Create Sample Historical Assessments for Robert Miller
            # 1 Month Ago: Moderate OA
            date_1 = datetime.datetime.utcnow() - datetime.timedelta(days=30)
            ass_1 = Assessment(
                patient_id=patient.id,
                doctor_id=doctor.id,
                assessment_date=date_1,
                status="completed",
                womac_score=45.0,
                koos_score=62.5,
                severity="Moderate OA",
                confidence=89.2,
                risk_score=68.5,
                signal_file_name="walk_cycle_left.wav",
                signal_file_path="/api/uploads/signals/demo1.wav",
                recommendations="Focus on joint mobilization, non-impact cardio, and moderate quadriceps resistance training. Continue wearing unloading brace during walking."
            )
            db.add(ass_1)
            
            # 2 Weeks Ago: Moderate OA (Slight improvement in function)
            date_2 = datetime.datetime.utcnow() - datetime.timedelta(days=14)
            ass_2 = Assessment(
                patient_id=patient.id,
                doctor_id=doctor.id,
                assessment_date=date_2,
                status="completed",
                womac_score=38.0,
                koos_score=71.2,
                severity="Moderate OA",
                confidence=91.5,
                risk_score=58.2,
                signal_file_name="walk_cycle_left_followup.wav",
                signal_file_path="/api/uploads/signals/demo2.wav",
                recommendations="Noticeable functional enhancement reported. Continue physical therapist-guided home exercises. NSAIDs as needed."
            )
            db.add(ass_2)
            
            # Today: Mild OA (Further improvements)
            date_3 = datetime.datetime.utcnow()
            ass_3 = Assessment(
                patient_id=patient.id,
                doctor_id=doctor.id,
                assessment_date=date_3,
                status="completed",
                womac_score=24.0,
                koos_score=81.0,
                severity="Mild OA",
                confidence=86.7,
                risk_score=39.4,
                signal_file_name="walk_cycle_left_today.wav",
                signal_file_path="/api/uploads/signals/demo3.wav",
                recommendations="Excellent progression. The knee acoustic profile shows reduced high-frequency clicks, indicating less friction. Progress to full body weight squats as tolerated."
            )
            db.add(ass_3)
            db.commit()
            db.refresh(ass_1)
            db.refresh(ass_2)
            db.refresh(ass_3)
            
            # 4. Create Questionnaire Details
            q_1 = Questionnaire(
                assessment_id=ass_1.id,
                pain_score=11,
                stiffness_score=5,
                mobility_score=60,
                walking_difficulty=2,
                stair_climbing=3,
                daily_activity_impact=2,
                raw_responses={"pain": 11, "stiffness": 5, "mobility": 60, "xai_insights": {"clinical_contribution": 65.2, "acoustic_contribution": 34.8, "risk_factors": ["Impaired Joint Flexion/Extension Mobility", "Severe Stair Climbing Mechanical Stress"]}}
            )
            q_2 = Questionnaire(
                assessment_id=ass_2.id,
                pain_score=8,
                stiffness_score=4,
                mobility_score=70,
                walking_difficulty=2,
                stair_climbing=2,
                daily_activity_impact=2,
                raw_responses={"pain": 8, "stiffness": 4, "mobility": 70, "xai_insights": {"clinical_contribution": 58.4, "acoustic_contribution": 41.6, "risk_factors": ["Significant Morning/Inactivity Stiffness"]}}
            )
            q_3 = Questionnaire(
                assessment_id=ass_3.id,
                pain_score=5,
                stiffness_score=2,
                mobility_score=82,
                walking_difficulty=1,
                stair_climbing=2,
                daily_activity_impact=1,
                raw_responses={"pain": 5, "stiffness": 2, "mobility": 82, "xai_insights": {"clinical_contribution": 49.0, "acoustic_contribution": 51.0, "risk_factors": ["Mild Acoustic Clicking Patterns"]}}
            )
            
            db.add_all([q_1, q_2, q_3])
            db.commit()
            
            # Create placeholder empty files in upload directory so report generator doesn't crash on demo files
            os.makedirs(os.path.join(settings.UPLOAD_DIR, "signals"), exist_ok=True)
            for file_name in ["demo1.wav", "demo2.wav", "demo3.wav"]:
                with open(os.path.join(settings.UPLOAD_DIR, "signals", file_name), "w") as f:
                    f.write("placeholder signal data")
            
            print("Database seeding completed.")
    except Exception as e:
        print(f"Error seeding database: {e}")
        db.rollback()
    finally:
        db.close()
