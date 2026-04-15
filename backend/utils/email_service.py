import httpx
from backend.config import settings

async def send_email(*, to: str, subject: str, html: str):
    url = f"{settings.EMAIL_SERVICE_URL}/send-email"

    headers = {
        "X-API-Key": settings.EMAIL_API_KEY,
        "Content-Type": "application/json"
    }

    payload = {
        "to": to,
        "subject": subject,
        "html": html
    }

    async with httpx.AsyncClient() as client:
        response = await client.post(url, json=payload, headers=headers)

        if response.status_code != 200:
            raise Exception(f"Email failed: {response.text}")

        return response.json()