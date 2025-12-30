import httpx
from typing import Optional, Dict, Any
from backend.config import settings
from datetime import datetime
from functools import wraps
import time
import asyncio

def async_ttl_cache(ttl_seconds):
    """
    Async TTL cache decorator.
    Stores results in a dictionary with a timestamp.
    """
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

class ERPService:
    BASE_URL = settings.ERP_BASE_URL
    
    @classmethod
    async def login(cls) -> Optional[httpx.Cookies]:
        """
        Authenticate against ERPNext/Frappe.
        Returns cookies if successful, None otherwise.
        """
        login_url = f"{cls.BASE_URL}/api/method/login"
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                response = await client.post(login_url, data={
                    'usr': settings.ERP_USER,
                    'pwd': settings.ERP_PASSWORD
                })
                
                if response.status_code == 200 and response.json().get('message') == 'Logged In':
                    return response.cookies
        except Exception as e:
            print(f"ERP Login Error: {e}")
            return None
        return None

    @classmethod
    @async_ttl_cache(ttl_seconds=300) # Cache for 5 minutes
    async def get_all_companies(cls) -> list:
        """Fetch list of all companies from ERP"""
        cookies = await cls.login()
        if not cookies: return []
        
        try:
            async with httpx.AsyncClient(cookies=cookies, timeout=10.0) as client:
                resp = await client.get(f"{cls.BASE_URL}/api/resource/Company")
                if resp.status_code == 200:
                    data = resp.json().get('data', [])
                    return [c['name'] for c in data]
        except Exception as e:
            print(f"Error fetching companies: {e}")
        return []

    @classmethod
    @async_ttl_cache(ttl_seconds=300) # Cache for 5 minutes
    async def get_employees_by_company(cls, company_name: str) -> list:
        """Fetch list of Employees for a specific company"""
        cookies = await cls.login()
        if not cookies: return []

        try:
            # Fetch employees filtered by company
            params = {
                "filters": f'[["company","=","{company_name}"], ["status","=","Active"]]',
                "fields": '["name","employee_name","company_email","user_id"]',
                "limit_page_length": 50
            }
            async with httpx.AsyncClient(cookies=cookies, timeout=10.0) as client:
                resp = await client.get(f"{cls.BASE_URL}/api/resource/Employee", params=params)
                
                if resp.status_code == 200:
                    return resp.json().get('data', [])
        except Exception as e:
            print(f"Error fetching employees: {e}")
        return []

    @classmethod
    async def create_job_applicant(cls, application_data: Dict[str, Any], job_title: str):
        """
        Create a Job Applicant in ERPNext.
        """
        cookies = await cls.login()
        if not cookies:
            print("ERP Sync Failed: Could not login")
            return

        try:
            # Map fields to ERPNext 'Job Applicant' Doctype
            payload = {
                "applicant_name": application_data.get("name"),
                "email_id": application_data.get("email"),
                "job_title": job_title,
                "status": "Open", 
                "cover_letter": application_data.get("coverLetter"),
                # Add source if available
                "source": application_data.get("source") or "Website"
            }
            
            async with httpx.AsyncClient(cookies=cookies, timeout=10.0) as client:
                resp = await client.post(f"{cls.BASE_URL}/api/resource/Job Applicant", json=payload)
                
                if resp.status_code == 200:
                    print(f"Successfully synced applicant {application_data.get('email')} to ERP")
                else:
                    print(f"Failed to sync applicant to ERP: {resp.text}")
                    
        except Exception as e:
            print(f"Error creating job applicant in ERP: {e}")
