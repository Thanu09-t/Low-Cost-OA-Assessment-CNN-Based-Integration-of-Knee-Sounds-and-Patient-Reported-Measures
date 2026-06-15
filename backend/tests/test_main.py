import os
import io
import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.database import SessionLocal, Base, engine
from app.models import User, Assessment, Questionnaire

client = TestClient(app)

@pytest.fixture(scope="module")
def setup_db():
    # Keep standard tables but we can clean up test users/assessments if needed
    db = SessionLocal()
    try:
        # Yield the session
        yield db
    finally:
        db.close()

def test_read_root():
    response = client.get("/")
    assert response.status_code == 200
    assert response.json()["service"] == "OA Insight API"
    assert response.json()["status"] == "online"

def test_auth_and_profile_flow():
    # 1. Signup a new patient
    signup_data = {
        "email": "test_patient@oainsight.com",
        "password": "Password123!",
        "first_name": "Test",
        "last_name": "Patient",
        "role": "patient",
        "dob": "1990-01-01",
        "gender": "Female"
    }
    # Clean up existing test user if any
    db = SessionLocal()
    existing = db.query(User).filter(User.email == signup_data["email"]).first()
    if existing:
        db.delete(existing)
        db.commit()
    db.close()

    response = client.post("/api/auth/signup", json=signup_data)
    assert response.status_code == 201
    assert response.json()["email"] == signup_data["email"]

    # 2. Login
    login_data = {
        "email": signup_data["email"],
        "password": signup_data["password"]
    }
    response = client.post("/api/auth/login", json=login_data)
    assert response.status_code == 200
    token = response.json()["access_token"]
    assert token is not None
    assert response.json()["role"] == "patient"

    # 3. Get Patient Profile
    headers = {"Authorization": f"Bearer {token}"}
    response = client.get("/api/patients/profile", headers=headers)
    assert response.status_code == 200
    assert response.json()["email"] == signup_data["email"]

def test_clinician_endpoints():
    # Login as default doctor (pre-seeded)
    login_data = {
        "email": "doctor@oainsight.com",
        "password": "Password123!"
    }
    response = client.post("/api/auth/login", json=login_data)
    assert response.status_code == 200
    token = response.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # 1. Get Patients list
    response = client.get("/api/doctors/patients", headers=headers)
    assert response.status_code == 200
    assert len(response.json()) > 0
    # Make sure pre-seeded patient Robert Miller is present
    emails = [p["email"] for p in response.json()]
    assert "patient@oainsight.com" in emails

    # 2. Get Analytics
    response = client.get("/api/doctors/analytics", headers=headers)
    assert response.status_code == 200
    analytics = response.json()
    assert "total_patients" in analytics
    assert "total_assessments" in analytics
    assert "severity_distribution" in analytics

def test_assessment_submission_and_report():
    # Login as pre-seeded patient
    login_data = {
        "email": "patient@oainsight.com",
        "password": "Password123!"
    }
    response = client.post("/api/auth/login", json=login_data)
    assert response.status_code == 200
    token = response.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # Prepare dummy CSV signal data (need enough samples for filtering, e.g., 2000 samples)
    import math
    signal_values = [str(0.1 * math.sin(i * 0.05)) for i in range(2000)]
    csv_content = "signal\n" + "\n".join(signal_values)
    file_tuple = ("test_signal.csv", io.BytesIO(csv_content.encode("utf-8")), "text/csv")

    form_data = {
        "pain_score": 6,
        "stiffness_score": 3,
        "mobility_score": 75,
        "walking_difficulty": 2,
        "stair_climbing": 2,
        "daily_activity_impact": 2
    }

    # Submit assessment
    response = client.post(
        "/api/assessments/submit",
        headers=headers,
        data=form_data,
        files={"file": file_tuple}
    )
    
    assert response.status_code == 200
    assessment_data = response.json()
    assert assessment_data["womac_score"] is not None
    assert assessment_data["koos_score"] is not None
    assert assessment_data["severity"] in ["Normal", "Mild OA", "Moderate OA", "Severe OA"]
    
    assessment_id = assessment_data["id"]

    # Download report PDF
    response = client.get(f"/api/assessments/{assessment_id}/download-report", headers=headers)
    assert response.status_code == 200
    assert response.headers["content-type"] == "application/pdf"
    assert len(response.content) > 0

    # Clean up files created during test
    db = SessionLocal()
    ass_record = db.query(Assessment).filter(Assessment.id == assessment_id).first()
    if ass_record:
        # Delete signal file
        filename = ass_record.signal_file_path.split("/")[-1]
        sig_path = os.path.join("./uploads", "signals", filename)
        if os.path.exists(sig_path):
            os.remove(sig_path)
        
        # Delete report PDF
        pdf_path = os.path.join("./uploads", "reports", f"report_{assessment_id}.pdf")
        if os.path.exists(pdf_path):
            os.remove(pdf_path)

        # Delete plot images
        prefix = filename.split(".")[0]
        sig_plot = os.path.join("./uploads", "reports", f"{prefix}_signals.png")
        spec_plot = os.path.join("./uploads", "reports", f"{prefix}_spectrogram.png")
        if os.path.exists(sig_plot):
            os.remove(sig_plot)
        if os.path.exists(spec_plot):
            os.remove(spec_plot)

        db.delete(ass_record)
        db.commit()
    db.close()
