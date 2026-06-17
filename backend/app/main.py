import os
import sys
from contextlib import asynccontextmanager

# Add backend directory to sys.path to resolve imports when running from project root (e.g., on Vercel)
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

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

@asynccontextmanager
async def lifespan(app: FastAPI):
    seed_database()
    yield

app = FastAPI(
    title=settings.PROJECT_NAME,
    description="Low-Cost Knee Osteoarthritis Assessment System API",
    version="1.0.0",
    lifespan=lifespan
)

# Enable CORS for frontend requests
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # For dev environment
    allow_credentials=False,
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
        "timestamp": datetime.datetime.now(datetime.timezone.utc).isoformat()
    }

# --- Database Auto-Seeding ---
def generate_seeded_signal_and_plots(file_name: str):
    import numpy as np
    from scipy.io import wavfile
    from app.ml.processor import SignalProcessor
    
    signals_dir = os.path.join(settings.UPLOAD_DIR, "signals")
    reports_dir = os.path.join(settings.UPLOAD_DIR, "reports")
    os.makedirs(signals_dir, exist_ok=True)
    os.makedirs(reports_dir, exist_ok=True)
    
    file_path = os.path.join(signals_dir, file_name)
    prefix = file_name.split(".")[0]
    
    # Generate synthetic data
    sr = 2000
    duration = 2.0
    t = np.linspace(0, duration, int(sr * duration), endpoint=False)
    
    # Base walking cycle movement (low frequency)
    base_signal = 0.3 * np.sin(2 * np.pi * 3 * t)
    
    # Simulate friction/crepitus clicks based on severity/prefix
    noise = np.random.normal(0, 0.08, len(t))
    envelope = np.zeros_like(t)
    
    if prefix == "demo1": # Moderate OA
        envelope[int(0.3*sr*duration):int(0.5*sr*duration)] = 1.2
        envelope[int(1.3*sr*duration):int(1.5*sr*duration)] = 1.0
    elif prefix == "demo2": # Moderate OA (slightly improved)
        envelope[int(0.3*sr*duration):int(0.45*sr*duration)] = 0.8
        envelope[int(1.3*sr*duration):int(1.45*sr*duration)] = 0.7
    else: # Mild OA
        envelope[int(0.4*sr*duration):int(0.45*sr*duration)] = 0.3
        
    crepitus = noise * envelope
    raw_signal = base_signal + crepitus
    
    # Normalize
    max_val = np.max(np.abs(raw_signal))
    if max_val > 0:
        raw_signal = raw_signal / max_val
        
    # Save as 16-bit WAV
    pcm_signal = (raw_signal * 32767).astype(np.int16)
    wavfile.write(file_path, sr, pcm_signal)
    
    # Generate and save plots
    processor = SignalProcessor()
    filtered_signal = processor.filter_noise(raw_signal, sr)
    norm_signal = processor.normalize(filtered_signal)
    spectrogram = processor.generate_spectrogram(norm_signal, sr)
    
    processor.generate_plots(
        raw_signal, norm_signal, spectrogram, sr, 
        reports_dir, prefix=prefix
    )

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
            date_1 = datetime.datetime.now(datetime.timezone.utc) - datetime.timedelta(days=30)
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
            date_2 = datetime.datetime.now(datetime.timezone.utc) - datetime.timedelta(days=14)
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
            date_3 = datetime.datetime.now(datetime.timezone.utc)
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
            
            # Generate real synthetic joint signals and plots for the demo assessments
            print("Generating synthetic joint sounds and acoustic plots for demo patient...")
            for file_name in ["demo1.wav", "demo2.wav", "demo3.wav"]:
                try:
                    generate_seeded_signal_and_plots(file_name)
                except Exception as seed_err:
                    print(f"Error generating seeded plots for {file_name}: {seed_err}")
            
            print("Database seeding completed.")
    except Exception as e:
        print(f"Error seeding database: {e}")
        db.rollback()
    finally:
        db.close()
