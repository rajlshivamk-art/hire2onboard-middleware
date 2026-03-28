from typing import List, Dict, Any, Optional
from fastapi import UploadFile
from fastapi_mail import FastMail, MessageSchema, ConnectionConfig, MessageType
from pydantic import EmailStr
from backend.config import settings
from backend.models import EmailTracking
from datetime import datetime
from urllib.parse import quote
import uuid
import re


# ============================================================
# Mail Configuration
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
# Base Layout
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

<table width="600" cellpadding="0" cellspacing="0"
       style="background:#ffffff; border-radius:8px; overflow:hidden;">

<tr>
<td style="padding:20px 24px; border-bottom:1px solid #eee;">
<img src="{logo_url}" alt="Indian Wellness" width="140" />
</td>
</tr>

<tr>
<td style="padding:28px 24px;">
{content}
</td>
</tr>

<tr>
<td style="padding:16px 24px; font-size:12px; color:#777; border-top:1px solid #eee;">
This is an automated message from <strong>Indian Wellness</strong>.<br/>
Please do not reply to this email.
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
# Templates
# ============================================================

DEFAULT_CTA_TEMPLATES = [
    "candidate_application_confirmation",
    "candidate_stage_update",
    "candidate_offer_letter",
]


TEMPLATES = {

    "candidate_application_confirmation": """
    <h2>Application Received</h2>
    <p>Dear <strong>{name}</strong>,</p>
    <p>Thank you for applying for the position of <strong>{job_title}</strong>.</p>
    """,

    "candidate_stage_update": """
    <h2>Application Status Update</h2>
    <p>Dear <strong>{name}</strong>,</p>
    <p>{message}</p>
    """,

    "candidate_offer_letter": """
    <h2>Offer of Employment</h2>
    <p>Dear <strong>{name}</strong>,</p>
    <p>We are pleased to offer you the position of <strong>{job_title}</strong>.</p>
    <p><strong>Salary:</strong> ₹{salary:,}</p>
    <p><strong>Joining Date:</strong> {start_date}</p>
    """,

    "recruiter_new_application_alert": """
    <h2>New Candidate Application</h2>
    <p>A new candidate <strong>{name}</strong> has applied for
    <strong>{job_title}</strong>.</p>
    <p>Please review the application in the ATS.</p>
    """,

    "candidate_document_upload": """
    <h2>Upload Required Documents</h2>
    <p>Dear <strong>{name}</strong>,</p>

    <p style="margin:24px 0;">
        <a href="{upload_link}"
           style="background:#1f7ae0; color:#ffffff; padding:12px 20px;
                  text-decoration:none; border-radius:6px; display:inline-block;">
            Upload Documents
        </a>
    </p>

    <p><strong>Link Expiry:</strong> {expires_at}</p>
    """
}


# ============================================================
# Link Tracking Wrapper
# ============================================================

def wrap_links_with_tracking(html: str, tracking_id: str) -> str:
    pattern = r'href="(.*?)"'

    def replacer(match):
        original_url = match.group(1)

        if original_url.startswith(("mailto:", "tel:")):
            return match.group(0)

        encoded = quote(original_url, safe="")
        tracked = (
            f"{settings.BASE_URL}/api/applications/email/click/"
            f"{tracking_id}?redirect={encoded}"
        )

        return f'href="{tracked}"'

    return re.sub(pattern, replacer, html)


# ============================================================
# Send Email (PRODUCTION SAFE)
# ============================================================

async def send_email(
    recipients: List[EmailStr],
    subject: str,
    template_name: str,
    context: Dict[str, Any],
    attachments: Optional[List[UploadFile]] = None,
):

    if template_name not in TEMPLATES:
        raise ValueError(f"Template '{template_name}' not found")

    application_id = context.get("application_id") or context.get("applicationId")
    tracking_id = None
    tracking_pixel = ""

    # --------------------------------------------------------
    # Create Tracking Record
    # --------------------------------------------------------

    if application_id:
        tracking_id = str(uuid.uuid4())

        await EmailTracking(
            applicationId=application_id,
            candidateEmail=recipients[0],
            trackingId=tracking_id,
            template=template_name,
            subject=subject,
            sentAt=datetime.utcnow(),
            clickCount=0,
            openCount=0,
            events=[]
        ).insert()

    # --------------------------------------------------------
    # Render Template
    # --------------------------------------------------------

    content_html = TEMPLATES[template_name].format(**context)

    # --------------------------------------------------------
    # Inject Default CTA Button
    # --------------------------------------------------------

    if tracking_id and template_name in DEFAULT_CTA_TEMPLATES:
        frontend_link = f"{settings.FRONTEND_URL}/application/{application_id}"
        encoded = quote(frontend_link, safe="")

        tracked_link = (
            f"{settings.BASE_URL}/api/applications/email/click/"
            f"{tracking_id}?redirect={encoded}"
        )

        cta_button = f"""
        <p style="margin:24px 0;">
            <a href="{tracked_link}"
               style="background:#111; color:#fff; padding:12px 20px;
                      text-decoration:none; border-radius:6px; display:inline-block;">
                View Details
            </a>
        </p>
        """

        content_html += cta_button

    # --------------------------------------------------------
    # Wrap ALL Links
    # --------------------------------------------------------

    if tracking_id:
        content_html = wrap_links_with_tracking(content_html, tracking_id)

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
