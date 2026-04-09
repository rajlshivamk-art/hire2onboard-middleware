import httpx
from typing import Optional, Dict, Any
from backend.config import settings
from datetime import datetime
from functools import wraps
import time
import asyncio

# ==========================================================
# TTL CACHE
# ==========================================================
def async_ttl_cache(ttl_seconds):
    def decorator(func):
        cache = {}

        @wraps(func)
        async def wrapper(*args, **kwargs):
            key = str(args) + str(kwargs)
            now = time.time()

            if key in cache:
                result, timestamp = cache[key]
                if now - timestamp < ttl_seconds:
                    return result

            result = await func(*args, **kwargs)
            cache[key] = (result, now)
            return result

        wrapper.cache_clear = lambda: cache.clear()
        return wrapper
    return decorator


# ==========================================================
# ERP SERVICE
# ==========================================================
class ERPService:
    BASE_URL = settings.ERP_BASE_URL

    # 🔥 REUSE CLIENT (PERFORMANCE BOOST)
    _client = httpx.AsyncClient(timeout=10.0)

    # ======================================================
    # LOGIN
    # ======================================================
    @classmethod
    async def login(cls, username: Optional[str] = None, password: Optional[str] = None) -> Optional[httpx.Cookies]:
        login_url = f"{cls.BASE_URL}/api/method/login"

        usr = username or settings.ERP_USER
        pwd = password or settings.ERP_PASSWORD

        try:
            response = await cls._client.post(login_url, data={
                "usr": usr,
                "pwd": pwd
            })

            data = response.json() if response.content else {}

            if response.status_code == 200 and data.get("message") == "Logged In":
                return response.cookies

        except Exception as e:
            print(f"ERP Login Error: {e}")

        return None


    # ======================================================
    # USER INFO
    # ======================================================
    @classmethod
    async def get_user_info(cls, cookies: httpx.Cookies) -> Optional[Dict[str, Any]]:
        try:
            resp = await cls._client.get(
                f"{cls.BASE_URL}/api/method/frappe.auth.get_logged_user",
                cookies=cookies
            )

            if resp.status_code == 200:
                user_email = resp.json().get("message")

                user_resp = await cls._client.get(
                    f"{cls.BASE_URL}/api/resource/User/{user_email}",
                    cookies=cookies
                )

                if user_resp.status_code == 200:
                    data = user_resp.json().get("data", {})
                    return {
                        "full_name": data.get("full_name"),
                        "email": data.get("email"),
                        "company": "TBD"
                    }

        except Exception as e:
            print(f"Error fetching User Info: {e}")

        return None


    # ======================================================
    # COMPANIES
    # ======================================================
    @classmethod
    @async_ttl_cache(ttl_seconds=300)
    async def get_all_companies(cls) -> list:
        cookies = await cls.login()
        if not cookies:
            return []

        try:
            resp = await cls._client.get(
                f"{cls.BASE_URL}/api/resource/Company",
                cookies=cookies
            )

            if resp.status_code == 200:
                return [c["name"] for c in resp.json().get("data", [])]

        except Exception as e:
            print(f"Error fetching companies: {e}")

        return []


    # ======================================================
    # EMPLOYEES
    # ======================================================
    @classmethod
    @async_ttl_cache(ttl_seconds=300)
    async def get_employees_by_company(cls, company_name: str) -> list:
        cookies = await cls.login()
        if not cookies:
            return []

        params = {
            "filters": f'[["company","=","{company_name}"], ["status","=","Active"]]',
            "fields": '["name","employee_name","company_email","user_id"]',
            "limit_page_length": 50
        }

        try:
            resp = await cls._client.get(
                f"{cls.BASE_URL}/api/resource/Employee",
                params=params,
                cookies=cookies
            )

            if resp.status_code == 200:
                return resp.json().get("data", [])

        except Exception as e:
            print(f"Error fetching employees: {e}")

        return []


    # ======================================================
    # CREATE JOB APPLICANT
    # ======================================================
    @classmethod
    async def create_job_applicant(cls, application_data: Dict[str, Any], job_title: str):
        cookies = await cls.login()
        if not cookies:
            print("ERP Sync Failed: login failed")
            return

        payload = {
            "applicant_name": application_data.get("name"),
            "email_id": application_data.get("email"),
            "job_title": job_title,
            "status": "Open",
            "cover_letter": application_data.get("coverLetter"),
            "source": application_data.get("source") or "Website"
        }

        try:
            resp = await cls._client.post(
                f"{cls.BASE_URL}/api/resource/Job Applicant",
                json=payload,
                cookies=cookies
            )

            if resp.status_code != 200:
                print(f"ERP Applicant Sync Failed: {resp.text}")

        except Exception as e:
            print(f"ERP Applicant Error: {e}")


    # ======================================================
    # CREATE JOB OPENING
    # ======================================================
    @classmethod
    async def create_job_opening(cls, job_data: Dict[str, Any]):
        cookies = await cls.login()
        if not cookies:
            print("ERP Sync Failed: login failed")
            return

        payload = {
            "job_title": job_data.get("title"),
            "status": "Open",
            "company": job_data.get("company") or settings.ERP_USER,
            "description": job_data.get("description"),
        }

        try:
            resp = await cls._client.post(
                f"{cls.BASE_URL}/api/resource/Job Opening",
                json=payload,
                cookies=cookies
            )

            if resp.status_code != 200:
                print(f"ERP Job Sync Failed: {resp.text}")

        except Exception as e:
            print(f"ERP Job Error: {e}")


    # ======================================================
    # UPDATE STATUS
    # ======================================================
    @classmethod
    async def update_applicant_status(cls, applicant_email: str, status: str):
        cookies = await cls.login()
        if not cookies:
            return

        try:
            params = {"filters": f'[["email_id","=","{applicant_email}"]]'}
            find_resp = await cls._client.get(
                f"{cls.BASE_URL}/api/resource/Job Applicant",
                params=params,
                cookies=cookies
            )

            if find_resp.status_code == 200:
                data = find_resp.json().get("data", [])
                if not data:
                    return

                applicant_id = data[0]["name"]

                erp_status = {
                    "Rejected": "Rejected",
                    "Hired": "Accepted",
                    "Offer": "Replied"
                }.get(status, "Open")

                await cls._client.put(
                    f"{cls.BASE_URL}/api/resource/Job Applicant/{applicant_id}",
                    json={"status": erp_status},
                    cookies=cookies
                )

        except Exception as e:
            print(f"ERP Status Update Error: {e}")