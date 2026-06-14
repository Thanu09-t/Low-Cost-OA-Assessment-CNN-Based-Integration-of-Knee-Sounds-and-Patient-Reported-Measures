import datetime
import uuid
from sqlalchemy import Column, String, Integer, Float, DateTime, ForeignKey, Text, JSON
from sqlalchemy.orm import relationship
from app.database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    email = Column(String(255), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    first_name = Column(String(100), nullable=False)
    last_name = Column(String(100), nullable=False)
    role = Column(String(20), nullable=False)  # "patient" or "doctor"
    dob = Column(String(20), nullable=True)     # YYYY-MM-DD
    gender = Column(String(20), nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    # Relationships
    patient_assessments = relationship("Assessment", foreign_keys="Assessment.patient_id", back_populates="patient")
    doctor_assessments = relationship("Assessment", foreign_keys="Assessment.doctor_id", back_populates="doctor")

class Assessment(Base):
    __tablename__ = "assessments"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    patient_id = Column(String(36), ForeignKey("users.id"), nullable=False)
    doctor_id = Column(String(36), ForeignKey("users.id"), nullable=True)
    assessment_date = Column(DateTime, default=datetime.datetime.utcnow)
    status = Column(String(20), default="completed")  # "pending", "completed"
    
    # Clinical metrics
    womac_score = Column(Float, nullable=True)
    koos_score = Column(Float, nullable=True)
    
    # AI prediction results
    severity = Column(String(20), nullable=True)      # "Normal", "Mild OA", "Moderate OA", "Severe OA"
    confidence = Column(Float, nullable=True)         # Percentage (0-100)
    risk_score = Column(Float, nullable=True)         # Score out of 100
    
    # Acoustic signal attachment
    signal_file_name = Column(String(255), nullable=True)
    signal_file_path = Column(String(255), nullable=True)
    
    # Clinical output
    recommendations = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    # Relationships
    patient = relationship("User", foreign_keys=[patient_id], back_populates="patient_assessments")
    doctor = relationship("User", foreign_keys=[doctor_id], back_populates="doctor_assessments")
    questionnaire = relationship("Questionnaire", back_populates="assessment", uselist=False, cascade="all, delete-orphan")

class Questionnaire(Base):
    __tablename__ = "questionnaires"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    assessment_id = Column(String(36), ForeignKey("assessments.id"), nullable=False)
    
    # Scoring dimensions (0-100 or sums)
    pain_score = Column(Integer, nullable=False)
    stiffness_score = Column(Integer, nullable=False)
    mobility_score = Column(Integer, nullable=False)
    walking_difficulty = Column(Integer, nullable=False)
    stair_climbing = Column(Integer, nullable=False)
    daily_activity_impact = Column(Integer, nullable=False)
    
    # Stores the full questionnaire response set
    raw_responses = Column(JSON, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    # Relationship
    assessment = relationship("Assessment", back_populates="questionnaire")
