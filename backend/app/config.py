import os
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    PROJECT_NAME: str = "OA Insight"
    SECRET_KEY: str = os.getenv("SECRET_KEY", "supersecretkeyforoainsightdevelopment12345!")
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24  # 1 day
    
    # Database configuration: will fallback to local sqlite if not set
    DATABASE_URL: str = os.getenv(
        "DATABASE_URL", 
        "sqlite:///./oa_insight.db"
    )
    
    # Path settings
    UPLOAD_DIR: str = os.getenv("UPLOAD_DIR", "./uploads")
    
    # Resend Email Notification Integration API Key
    RESEND_API_KEY: str = os.getenv("RESEND_API_KEY", "re_HULvQS3G_jTzvEJJyMSFBgX6g8fKHtXgt")
    
    class Config:
        case_sensitive = True

settings = Settings()

# Ensure directories exist
os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
os.makedirs(os.path.join(settings.UPLOAD_DIR, "signals"), exist_ok=True)
os.makedirs(os.path.join(settings.UPLOAD_DIR, "reports"), exist_ok=True)
