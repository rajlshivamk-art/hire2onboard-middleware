from typing import List, Dict, Any, Optional
from fastapi import UploadFile
from fastapi_mail import FastMail, MessageSchema, ConnectionConfig, MessageType
from pydantic import EmailStr
from backend.config import settings
from pathlib import Path

# Configuration for fastapi-mail
conf = ConnectionConfig(
    MAIL_USERNAME=settings.MAIL_USERNAME,
    MAIL_PASSWORD=settings.MAIL_PASSWORD,
    MAIL_FROM=settings.MAIL_FROM,
    MAIL_PORT=settings.MAIL_PORT,
    MAIL_SERVER=settings.MAIL_SERVER,
    MAIL_FROM_NAME=settings.MAIL_FROM_NAME,
    MAIL_STARTTLS=settings.MAIL_STARTTLS,
    MAIL_SSL_TLS=settings.MAIL_SSL_TLS,
    USE_CREDENTIALS=settings.USE_CREDENTIALS,
    VALIDATE_CERTS=settings.VALIDATE_CERTS
)

async def send_email(
    recipients: List[EmailStr], 
    subject: str, 
    template_name: str, 
    context: Dict[str, Any],
    attachments: Optional[List[UploadFile]] = None
):
    """
    Sends an email using a simple HTML template string.
    """
    
    # Simple HTML templates
    templates = {
        "candidate_application_confirmation": """
        <html>
            <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
                <h2>Application Received - {data[job_title]}</h2>
                <p>Dear {data[name]},</p>
                <p>Thank you for your interest in the <strong>{data[job_title]}</strong> position at Indian Wellness. We acknowledge receipt of your application and our recruitment team will review your qualifications shortly.</p>
                <p>We appreciate the time you took to apply and will keep you informed of the next steps.</p>
                <p>Best Regards,<br><strong>Indian Wellness Recruitment Team</strong></p>
            </body>
        </html>
        """,
        "recruiter_new_application_alert": """
        <html>
            <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
                <h2>New Candidate Application</h2>
                <p>Hello Team,</p>
                <p>A new candidate, <strong>{data[name]}</strong>, has applied for the position of <strong>{data[job_title]}</strong>.</p>
                <p>Please log in to the recruitment portal to review their application and resume.</p>
                <p><strong>Applicant Email:</strong> {data[email]}</p>
                <p>Best Regards,<br><strong>System Notification</strong></p>
            </body>
        </html>
        """,
        "candidate_stage_update": """
        <html>
            <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
                <h2>Update on Your Application</h2>
                <p>Dear {data[name]},</p>
                <p>We are writing to provide an update regarding your application for the <strong>{data[job_title]}</strong> position.</p>
                <p>{data[message]}</p>
                <p>Thank you for your continued interest in Indian Wellness.</p>
                <p>Best Regards,<br><strong>Indian Wellness Recruitment Team</strong></p>
            </body>
        </html>
        """,
        "candidate_offer_letter": """
        <html>
            <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
                <h2>Employment Offer - {data[job_title]}</h2>
                <p>Dear {data[name]},</p>
                <p>We are pleased to offer you the position of <strong>{data[job_title]}</strong> at Indian Wellness.</p>
                <p>We were all very impressed with your background and qualifications.</p>
                <div style="background-color: #f9f9f9; padding: 15px; border-left: 4px solid #4CAF50; margin: 20px 0;">
                    <p style="margin: 0;"><strong>Proposed Annual Salary:</strong> ₹{data[salary]:,}</p>
                    <p style="margin: 10px 0 0;"><strong>Target Joining Date:</strong> {data[start_date]}</p>
                </div>
                <p>We are confident that you will make a significant contribution to the success of our team.</p>
                <p>Please log in to your candidate portal to view the formal offer letter, which details terms and conditions.</p>
                <p>We look forward to welcoming you to the Indian Wellness family.</p>
                <p>Best Regards,<br><strong>Human Resources Department<br>Indian Wellness</strong></p>
            </body>
        </html>
        """,
        "candidate_onboarding_welcome": """
        <html>
            <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
                <h2>Welcome to Indian Wellness!</h2>
                <p>Dear {data[name]},</p>
                <p>We are thrilled to have you onboard for the position of <strong>{data[job_title]}</strong>.</p>
                <p>To ensure a smooth joining process, please ensure you have the following documents ready:</p>
                <ul>
                    {data[documents_html]}
                </ul>
                <p>Please log in to the candidate portal to track your onboarding tasks.</p>
                <p>Best Regards,<br><strong>HR Team<br>Indian Wellness</strong></p>
            </body>
        </html>
        """,
        "candidate_document_request": """
        <html>
            <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
                <h2>Action Required: Pending Onboarding Documents</h2>
                <p>Dear {data[name]},</p>
                <p>This is a reminder that the following onboarding documents/tasks are currently <strong>pending</strong>:</p>
                <ul>
                    {data[documents_html]}
                </ul>
                <p>Please complete these items or upload the necessary documents at your earliest convenience to avoid delays in your joining process.</p>
                <p>Best Regards,<br><strong>HR Team<br>Indian Wellness</strong></p>
            </body>
        </html>
        """
    }

    if template_name not in templates:
        print(f"Error: Template '{template_name}' not found.")
        return

    # Pre-process documents list if present
    if "documents" in context and isinstance(context["documents"], list):
        context["documents_html"] = "".join([f"<li>{doc}</li>" for doc in context["documents"]])
    
    # Render template manually
    try:
        html_content = templates[template_name].format(data=context)
    except KeyError as e:
        print(f"Error rendering email template: Missing key {e}")
        return

    message = MessageSchema(
        subject=subject,
        recipients=recipients,
        body=html_content,
        subtype=MessageType.html,
        attachments=attachments or []
    )

    fm = FastMail(conf)
    try:
        await fm.send_message(message)
        print(f"Email sent to {recipients}")
    except Exception as e:
        # Check if it's actually a success (250 status code)
        if "250" in str(e) and "Ok" in str(e):
             print(f"Email sent to {recipients} (Confirmed via exception handling)")
        else:
             print(f"Failed to send email: {e}")
