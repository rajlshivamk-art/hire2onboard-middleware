from typing import List, Dict, Any, Optional
from fastapi import UploadFile
from fastapi_mail import FastMail, MessageSchema, ConnectionConfig, MessageType
from pydantic import EmailStr
from backend.config import settings
from backend.models import EmailTracking
from datetime import datetime
import uuid


# ============================================================
# Mail Configuration (PRODUCTION SAFE)
# ============================================================
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
    VALIDATE_CERTS=settings.VALIDATE_CERTS,
)


# ============================================================
# Base HTML Layout (Professional & Branded)
# ============================================================
BASE_TEMPLATE = """
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
</head>
<body style="margin:0; padding:0; background-color:#f4f6f8; font-family:Arial, sans-serif; color:#333;">

<table width="100%" cellpadding="0" cellspacing="0">
<tr>
<td align="center" style="padding:24px 0;">

<table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff; border-radius:8px; overflow:hidden; box-shadow:0 2px 8px rgba(0,0,0,0.05);">

<!-- Header -->
<tr>
<td style="padding:20px 24px; border-bottom:1px solid #eee;">
<img src="{logo_url}" alt="Indian Wellness" width="140" style="display:block;" />
</td>
</tr>

<!-- Content -->
<tr>
<td style="padding:28px 24px;">
{content}
</td>
</tr>

<!-- Footer -->
<tr>
<td style="padding:16px 24px; font-size:12px; color:#777; border-top:1px solid #eee;">
<p style="margin:0;">
This is an automated message from <strong>Indian Wellness</strong>.<br/>
Please do not reply to this email.
</p>
</td>
</tr>

</table>

</td>
</tr>
</table>

{tracking_pixel}

</body>
</html>
"""


# ============================================================
# Professional Email Contents
# ============================================================
TEMPLATES = {

    "candidate_application_confirmation": """
    <h2 style="margin-top:0;">Application Received</h2>
    <p>Dear <strong>{name}</strong>,</p>
    <p>
        Thank you for applying for the position of
        <strong>{job_title}</strong> at Indian Wellness.
    </p>
    <p>
        Our recruitment team is reviewing your profile.  
        If shortlisted, we will reach out to you with the next steps.
    </p>
    <p style="margin-top:24px;">
        Warm regards,<br/>
        <strong>Indian Wellness Recruitment Team</strong>
    </p>
    """,

    "recruiter_new_application_alert": """
    <h2 style="margin-top:0;">New Candidate Application</h2>
    <p>
        A new candidate <strong>{name}</strong> has applied for
        <strong>{job_title}</strong>.
    </p>
    <p>
        Please review the application in the ATS.
    </p>
    """,

    "candidate_stage_update": """
    <h2 style="margin-top:0;">Application Status Update</h2>
    <p>Dear <strong>{name}</strong>,</p>
    <p>{message}</p>
    <p style="margin-top:24px;">
        Best regards,<br/>
        <strong>Indian Wellness Recruitment Team</strong>
    </p>
    """,

    "candidate_offer_letter": """
    <h2 style="margin-top:0;">Offer of Employment</h2>
    <p>Dear <strong>{name}</strong>,</p>
    <p>
        We are pleased to offer you the position of
        <strong>{job_title}</strong> at Indian Wellness.
    </p>
    <p>
        <strong>Proposed Salary:</strong> ₹{salary:,}<br/>
        <strong>Joining Date:</strong> {start_date}
    </p>
    <p>
        Our HR team will contact you shortly with further details.
    </p>
    """,

    "candidate_document_upload": """
    <h2 style="margin-top:0;">Upload Required Documents</h2>
    <p>Dear <strong>{name}</strong>,</p>
    <p>
        To proceed with your onboarding, please upload the required documents
        using the secure link below.
    </p>

    <p style="margin:24px 0;">
        <a href="{upload_link}"
           style="background:#1f7ae0; color:#ffffff; padding:12px 20px;
                  text-decoration:none; border-radius:6px; display:inline-block;">
            Upload Documents
        </a>
    </p>

    <p style="color:#555;">
        <strong>Link Expiry:</strong> {expires_at}
    </p>

    <p style="margin-top:24px;">
        Regards,<br/>
        <strong>Indian Wellness HR Team</strong>
    </p>
    """
}


# ============================================================
# Send Email (PRODUCTION READY)
# ============================================================
async def send_email(
    recipients: List[EmailStr],
    subject: str,
    template_name: str,
    context: Dict[str, Any],
    attachments: Optional[List[UploadFile]] = None,
):
    if template_name not in TEMPLATES:
        raise ValueError(f"Email template '{template_name}' not found")

    # --------------------------------------------------------
    # Render content
    # --------------------------------------------------------
    content_html = TEMPLATES[template_name].format(**context)

    # --------------------------------------------------------
    # Tracking (Best-effort, Safe)
    # --------------------------------------------------------
    tracking_pixel = ""
    application_id = context.get("application_id") or context.get("applicationId")

    if application_id:
        tracking_id = str(uuid.uuid4())

        await EmailTracking(
            applicationId=application_id,
            candidateEmail=recipients[0],
            trackingId=tracking_id,
            template=template_name,
            subject=subject,
            sentAt=datetime.utcnow(),
        ).insert()

        tracking_pixel = f"""
        <img src="{settings.BASE_URL}/api/applications/email/track/{tracking_id}?r={uuid.uuid4()}"
             width="1" height="1" style="display:block;" alt="" />
        """

    # --------------------------------------------------------
    # Final HTML
    # --------------------------------------------------------
    html_body = BASE_TEMPLATE.format(
        logo_url="https://dummyimage.com/200x50/ffffff/000000&text=Indian+Wellness",
        content=content_html,
        tracking_pixel=tracking_pixel,
    )

    # --------------------------------------------------------
    # Send
    # --------------------------------------------------------
    message = MessageSchema(
        subject=subject,
        recipients=recipients,
        body=html_body,
        subtype=MessageType.html,
        attachments=attachments or [],
    )

    fm = FastMail(conf)
    await fm.send_message(message)
