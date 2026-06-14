import urllib.request
import json
from app.config import settings

def send_email_notification(to_email: str, subject: str, html_content: str) -> bool:
    """
    Dispatches email notifications using the Resend API.
    """
    if not settings.RESEND_API_KEY or settings.RESEND_API_KEY.startswith("re_YOUR_KEY"):
        print("Resend API key not initialized. Skipping email dispatch.")
        return False
        
    url = "https://api.resend.com/emails"
    headers = {
        "Authorization": f"Bearer {settings.RESEND_API_KEY}",
        "Content-Type": "application/json"
    }
    
    # Resend sandbox requires sending from 'onboarding@resend.dev'
    data = {
        "from": "OA Insight Portal <onboarding@resend.dev>",
        "to": [to_email],
        "subject": subject,
        "html": html_content
    }
    
    try:
        req = urllib.request.Request(
            url, 
            data=json.dumps(data).encode('utf-8'), 
            headers=headers,
            method='POST'
        )
        # Set a 5 second timeout to prevent blocking thread execution
        with urllib.request.urlopen(req, timeout=5) as response:
            res_body = response.read().decode('utf-8')
            print(f"Resend notification dispatch successful. Response: {res_body}")
            return True
    except Exception as e:
        print(f"Failed to dispatch email via Resend endpoint: {e}")
        return False
