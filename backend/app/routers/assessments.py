import os
import uuid
import json
from datetime import datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form, BackgroundTasks
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import User, Assessment, Questionnaire
from app.schemas import AssessmentOut, AssessmentUpdate, DoctorAnalytics, SeverityDistributionItem, TrendItem
from app.auth import get_current_user, require_role
from app.config import settings
from app.ml.processor import SignalProcessor
from app.ml.model import oa_model
from app.utils.pdf_generator import generate_pdf_report
from app.utils.notifier import send_email_notification

router = APIRouter(prefix="/assessments", tags=["Assessments"])
processor = SignalProcessor()

@router.post("/submit", response_model=AssessmentOut)
async def submit_assessment(
    background_tasks: BackgroundTasks,
    pain_score: int = Form(...),
    stiffness_score: int = Form(...),
    mobility_score: int = Form(...),
    walking_difficulty: int = Form(...),
    stair_climbing: int = Form(...),
    daily_activity_impact: int = Form(...),
    patient_id: Optional[str] = Form(None),
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Submit a new knee osteoarthritis assessment.
    Accepts: Patient-Reported Measures, joint acoustic emission file (.wav/.csv), patient ID (required for Doctors, defaults to self for Patients).
    Processes: Noise-filtering, normalization, spectrogram generation, CNN classification, report generation.
    """
    # 1. Authorize role and verify target patient
    target_patient_id = current_user.id
    doctor_id = None
    
    if current_user.role == "doctor":
        if not patient_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Patient ID is required for doctor submissions"
            )
        target_patient_id = patient_id
        doctor_id = current_user.id
        
        # Verify patient exists
        patient_exists = db.query(User).filter(User.id == target_patient_id, User.role == "patient").first()
        if not patient_exists:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Target patient record not found"
            )
    else:
        # Patient is submitting for themselves. Verify patient role is valid
        if current_user.role != "patient":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only patients or doctors can submit assessments"
            )

    # 2. Save uploaded signal file
    file_ext = os.path.splitext(file.filename)[1].lower()
    if file_ext not in ['.wav', '.csv']:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid file format. Only .wav and .csv files are supported."
        )
        
    unique_prefix = f"{uuid.uuid4()}"
    filename = f"{unique_prefix}{file_ext}"
    file_dir = os.path.join(settings.UPLOAD_DIR, "signals")
    os.makedirs(file_dir, exist_ok=True)
    file_path = os.path.join(file_dir, filename)
    
    with open(file_path, "wb") as buffer:
        content = await file.read()
        buffer.write(content)

    # 3. Calculate Clinical Scores
    # WOMAC Index calculation (sum of Pain 0-20, Stiffness 0-8, and Normalized Mobility inverted to 0-68)
    # Mobility score is out of 100 (100 = full mobility, 0 = no mobility).
    # WOMAC difficulty score = 68 * (1.0 - mobility/100)
    womac_pain = pain_score
    womac_stiff = stiffness_score
    womac_mobility_difficulty = int(68.0 * (1.0 - (mobility_score / 100.0)))
    total_womac = float(womac_pain + womac_stiff + womac_mobility_difficulty)
    
    # KOOS Outcome Score (average of normalized subscales: Pain, Symptoms, Activities of Daily Living)
    # Each subscale is 0-100 where 100 is best (no symptoms).
    koos_pain_subscale = (1.0 - (womac_pain / 20.0)) * 100.0
    koos_symptom_subscale = (1.0 - (womac_stiff / 8.0)) * 100.0
    koos_adl_subscale = float(mobility_score)
    total_koos = float((koos_pain_subscale + koos_symptom_subscale + koos_adl_subscale) / 3.0)

    # 4. Signal Processing & Plots
    try:
        raw_signal, sr = processor.load_signal(file_path)
        filtered_signal = processor.filter_noise(raw_signal, sr)
        norm_signal = processor.normalize(filtered_signal)
        spectrogram = processor.generate_spectrogram(norm_signal, sr)
        
        # Save plots
        plot_dir = os.path.join(settings.UPLOAD_DIR, "reports")
        plots = processor.generate_plots(
            raw_signal, norm_signal, spectrogram, sr, 
            plot_dir, prefix=unique_prefix
        )
    except Exception as e:
        # Cleanup uploaded file on error
        if os.path.exists(file_path):
            os.remove(file_path)
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Failed to process acoustic emission signal: {str(e)}"
        )

    # 5. Multimodal CNN Classifier Prediction
    clinical_dict = {
        'pain_score': womac_pain,
        'stiffness_score': womac_stiff,
        'mobility_score': mobility_score,
        'walking_difficulty': walking_difficulty,
        'stair_climbing': stair_climbing,
        'daily_activity_impact': daily_activity_impact
    }
    
    prediction = oa_model.predict_severity(spectrogram, clinical_dict)
    
    # 6. Database record persistence
    new_assessment = Assessment(
        patient_id=target_patient_id,
        doctor_id=doctor_id,
        womac_score=round(total_womac, 1),
        koos_score=round(total_koos, 1),
        severity=prediction["severity"],
        confidence=prediction["confidence"],
        risk_score=prediction["risk_score"],
        signal_file_name=file.filename,
        signal_file_path=f"/api/uploads/signals/{filename}",
        recommendations=prediction["xai_insights"]["recommendations"]
    )
    
    db.add(new_assessment)
    db.commit()
    db.refresh(new_assessment)
    
    # Save the detailed survey responses
    raw_responses_dict = {
        "pain": womac_pain,
        "stiffness": womac_stiff,
        "mobility": mobility_score,
        "walking_difficulty": walking_difficulty,
        "stair_climbing": stair_climbing,
        "daily_activity_impact": daily_activity_impact,
        "xai_insights": prediction["xai_insights"]
    }
    
    new_questionnaire = Questionnaire(
        assessment_id=new_assessment.id,
        pain_score=womac_pain,
        stiffness_score=womac_stiff,
        mobility_score=mobility_score,
        walking_difficulty=walking_difficulty,
        stair_climbing=stair_climbing,
        daily_activity_impact=daily_activity_impact,
        raw_responses=raw_responses_dict
    )
    
    db.add(new_questionnaire)
    db.commit()
    
    # 7. Generate PDF Report in background
    patient_record = db.query(User).filter(User.id == target_patient_id).first()
    pdf_filename = f"report_{new_assessment.id}.pdf"
    pdf_path = os.path.join(plot_dir, pdf_filename)
    
    try:
        background_tasks.add_task(
            generate_pdf_report,
            assessment=new_assessment,
            patient=patient_record,
            questionnaire=new_questionnaire,
            output_path=pdf_path,
            signal_plot_path=plots['signals'],
            spec_plot_path=plots['spectrogram']
        )
    except Exception as e:
        print(f"Error scheduling PDF compilation: {e}")
        # Not throwing HTTP error here since database records are saved successfully.
 
    # Send email alert to patient in background
    try:
        subject = f"OA Insight - Knee Assessment Registered ({prediction['severity']})"
        html_content = f"""
        <h3>Knee OA Diagnostic Report Compiled</h3>
        <p>Hello {patient_record.first_name},</p>
        <p>Your Knee Osteoarthritis assessment has been processed using the dual-branch CNN classifier.</p>
        <ul>
            <li><b>Diagnostic Result:</b> {prediction['severity']}</li>
            <li><b>Model Confidence:</b> {prediction['confidence']}%</li>
            <li><b>Composite Joint Risk Index:</b> {prediction['risk_score']}/100</li>
        </ul>
        <p>Log in to your patient dashboard to download the comprehensive PDF report and view signal plots.</p>
        <br/>
        <p>Regards,<br/>OA Insight Diagnostics</p>
        """
        background_tasks.add_task(send_email_notification, patient_record.email, subject, html_content)
    except Exception as email_err:
        print(f"Failed to schedule submission email alert: {email_err}")

    # Fetch fresh assessment with relations populated
    result = db.query(Assessment).filter(Assessment.id == new_assessment.id).first()
    return result

@router.get("/my-assessments", response_model=List[AssessmentOut])
def get_my_assessments(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get a patient's historical assessments.
    """
    if current_user.role != "patient":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only patients can view personal assessments."
        )
    return db.query(Assessment).filter(
        Assessment.patient_id == current_user.id
    ).order_by(Assessment.assessment_date.desc()).all()

@router.get("/{assessment_id}", response_model=AssessmentOut)
def get_assessment(
    assessment_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get detailed breakdown of a specific assessment.
    """
    assessment = db.query(Assessment).filter(Assessment.id == assessment_id).first()
    if not assessment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Assessment record not found"
        )
        
    # Security check: patients can only access their own assessments
    if current_user.role == "patient" and assessment.patient_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied"
        )
        
    return assessment

@router.put("/{assessment_id}", response_model=AssessmentOut)
def update_assessment(
    assessment_id: str,
    update_data: AssessmentUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Doctor updates recommendations/notes on a patient's assessment.
    """
    if current_user.role != "doctor":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only clinicians can update recommendations"
        )
        
    assessment = db.query(Assessment).filter(Assessment.id == assessment_id).first()
    if not assessment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Assessment record not found"
        )
        
    assessment.recommendations = update_data.recommendations
    assessment.doctor_id = current_user.id
    db.commit()
    db.refresh(assessment)
    
    # Regenerate PDF Report with updated recommendations
    patient_record = db.query(User).filter(User.id == assessment.patient_id).first()
    questionnaire = db.query(Questionnaire).filter(Questionnaire.assessment_id == assessment.id).first()
    
    pdf_path = os.path.join(settings.UPLOAD_DIR, "reports", f"report_{assessment.id}.pdf")
    
    # Attempt to locate plots
    unique_prefix = assessment.signal_file_path.split("/")[-1].split(".")[0] if assessment.signal_file_path else ""
    signal_plot_path = os.path.join(settings.UPLOAD_DIR, "reports", f"{unique_prefix}_signals.png")
    spec_plot_path = os.path.join(settings.UPLOAD_DIR, "reports", f"{unique_prefix}_spectrogram.png")
    
    try:
        generate_pdf_report(
            assessment=assessment,
            patient=patient_record,
            questionnaire=questionnaire,
            output_path=pdf_path,
            signal_plot_path=signal_plot_path if os.path.exists(signal_plot_path) else None,
            spec_plot_path=spec_plot_path if os.path.exists(spec_plot_path) else None
        )
    except Exception as e:
        print(f"Error regenerating PDF report: {e}")
        
    # Send notification email to patient about updated recommendations
    try:
        subject = "OA Insight - Clinician Care Plan Updated"
        html_content = f"""
        <h3>Clinical Care Guidelines Updated</h3>
        <p>Hello {patient_record.first_name},</p>
        <p>Your assessing clinician has added new treatment recommendations to your Knee Assessment (ID: {assessment.id[:8]}).</p>
        <blockquote style="background-color: #f1f5f9; padding: 12px; border-left: 4px solid #2563eb; color: #1e293b;">
            {update_data.recommendations}
        </blockquote>
        <p>Please log in to your portal to download the updated PDF assessment report.</p>
        <br/>
        <p>Regards,<br/>OA Insight Portal</p>
        """
        send_email_notification(patient_record.email, subject, html_content)
    except Exception as email_err:
        print(f"Failed to send update email alert: {email_err}")
        
    return assessment

@router.get("/{assessment_id}/download-report")
def download_pdf_report(
    assessment_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Serves the printable PDF clinical report for download.
    """
    assessment = db.query(Assessment).filter(Assessment.id == assessment_id).first()
    if not assessment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Assessment not found"
        )
        
    if current_user.role == "patient" and assessment.patient_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied"
        )
        
    pdf_path = os.path.join(settings.UPLOAD_DIR, "reports", f"report_{assessment.id}.pdf")
    if not os.path.exists(pdf_path):
        # If PDF was missing, try to regenerate it on the fly
        patient_record = db.query(User).filter(User.id == assessment.patient_id).first()
        questionnaire = db.query(Questionnaire).filter(Questionnaire.assessment_id == assessment.id).first()
        try:
            generate_pdf_report(assessment, patient_record, questionnaire, pdf_path)
        except Exception:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="PDF report file not found on server"
            )
            
    return FileResponse(
        pdf_path, 
        media_type="application/pdf", 
        filename=f"OA_Assessment_{assessment.id[:8]}.pdf"
    )
