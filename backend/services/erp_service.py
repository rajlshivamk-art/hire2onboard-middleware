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
    async def login(cls, username: Optional[str] = None, password: Optional[str] = None) -> Optional[httpx.Cookies]:
        """
        Authenticate against ERPNext/Frappe.
        If username/password provided, uses them (User Auth).
        Otherwise uses Settings credentials (Admin/System Sync).
        """
        login_url = f"{cls.BASE_URL}/api/method/login"
        
        usr = username or settings.ERP_USER
        pwd = password or settings.ERP_PASSWORD
        
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                response = await client.post(login_url, data={
                    'usr': usr,
                    'pwd': pwd
                })
                
                if response.status_code == 200 and response.json().get('message') == 'Logged In':
                    return response.cookies
                # For auth check, if it fails, return None (Invalid credentials)
        except Exception as e:
            print(f"ERP Login Error: {e}")
            return None
        return None

    @classmethod
    async def get_user_info(cls, cookies: httpx.Cookies) -> Optional[Dict[str, Any]]:
        """
        Fetch logged in user's info from ERPNext.
        """
        try:
            async with httpx.AsyncClient(cookies=cookies, timeout=10.0) as client:
                # /api/method/frappe.auth.get_logged_user returns user id
                # But better to fetch 'User' document
                resp = await client.get(f"{cls.BASE_URL}/api/method/frappe.auth.get_logged_user")
                if resp.status_code == 200:
                    user_email = resp.json().get('message')
                    
                    # Now fetch User details (Full Name, etc)
                    user_resp = await client.get(f"{cls.BASE_URL}/api/resource/User/{user_email}")
                    if user_resp.status_code == 200:
                         data = user_resp.json().get('data')
                         return {
                             "full_name": data.get("full_name"),
                             "email": data.get("email"),
                             "company": "TBD" # ERPNext User doesn't always have Company directly linked, often in Employee
                         }
        except Exception as e:
            print(f"Error fetching User Info: {e}")
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

    @classmethod
    async def create_job_opening(cls, job_data: Dict[str, Any]):
        """
        Create a Job Opening in ERPNext.
        """
        cookies = await cls.login()
        if not cookies:
            print("ERP Sync Failed: Could not login")
            return

        try:
            # Map fields to ERPNext 'Job Opening' Doctype
            # Note: Fields depend on specific ERPNext customization. 
            # Standard fields: job_title, status, company, description
            payload = {
                "job_title": job_data.get("title"),
                "status": "Open", 
                "company": job_data.get("company") or settings.ERP_USER, # Fallback to default company or user
                "description": job_data.get("description"),
                # "route": ... (optional)
            }
            
            async with httpx.AsyncClient(cookies=cookies, timeout=10.0) as client:
                resp = await client.post(f"{cls.BASE_URL}/api/resource/Job Opening", json=payload)
                
                if resp.status_code == 200:
                    print(f"Successfully synced Job Opening '{job_data.get('title')}' to ERP")
                else:
                    print(f"Failed to sync Job Opening to ERP: {resp.text}")
                    
        except Exception as e:
            print(f"Error creating Job Opening in ERP: {e}")

    @classmethod
    async def create_job_offer(cls, offer_data: Dict[str, Any], applicant_email: str, job_title: str):
        """
        Create a Job Offer in ERPNext.
        """
        cookies = await cls.login()
        if not cookies: return

        try:
            async with httpx.AsyncClient(cookies=cookies, timeout=10.0) as client:
                # 1. Look up Applicant ID first (Robust Linkage)
                params = {"filters": f'[["email_id","=","{applicant_email}"]]'}
                find_resp = await client.get(f"{cls.BASE_URL}/api/resource/Job Applicant", params=params)
                
                applicant_id = applicant_email # Fallback to email if not found (might fail but worth trying)
                
                if find_resp.status_code == 200:
                    data = find_resp.json().get('data', [])
                    if data:
                        applicant_id = data[0]['name']
                    else:
                        print(f"Warning: Could not find Job Applicant for {applicant_email}, relying on email.")

                # 2. Create Job Offer
                payload = {
                    "job_applicant": applicant_id, # Correct field name for ERPNext is usually 'job_applicant'
                    "offer_date": datetime.now().strftime("%Y-%m-%d"),
                    "job_title": job_title,
                    "status": "Pending",
                    "salary": offer_data.get("salary"),
                    "applicant_name": applicant_id # Some versions use this
                }
                
                resp = await client.post(f"{cls.BASE_URL}/api/resource/Job Offer", json=payload)
                if resp.status_code == 200:
                    print(f"Synced Job Offer for {applicant_email} (Linked to {applicant_id})")
                else:
                    print(f"Failed to sync Job Offer: {resp.text}")
        except Exception as e:
            print(f"Error syncing Job Offer: {e}")

    @classmethod
    async def update_applicant_status(cls, applicant_email: str, status: str):
        """
        Update Job Applicant Status in ERPNext (e.g. Open -> Replied -> Rejected/Hired)
        """
        cookies = await cls.login()
        if not cookies: return

        try:
            # 1. Find Applicant ID by Email
            async with httpx.AsyncClient(cookies=cookies, timeout=10.0) as client:
                params = {"filters": f'[["email_id","=","{applicant_email}"]]'}
                find_resp = await client.get(f"{cls.BASE_URL}/api/resource/Job Applicant", params=params)
                
                if find_resp.status_code == 200:
                    data = find_resp.json().get('data', [])
                    if data:
                        applicant_id = data[0]['name']
                        
                        # 2. Update Status
                        # Map internal API status to ERPNext status
                        erp_status = "Open"
                        if status == "Rejected": erp_status = "Rejected"
                        elif status == "Hired": erp_status = "Accepted"
                        elif status == "Offer": erp_status = "Replied"
                        
                        update_resp = await client.put(f"{cls.BASE_URL}/api/resource/Job Applicant/{applicant_id}", json={"status": erp_status})
                        if update_resp.status_code == 200:
                            print(f"Updated ERP Status for {applicant_email} to {erp_status}")
        except Exception as e:
            print(f"Error updating ERP status: {e}")

    @classmethod
    async def sync_interview_feedback(cls, feedback_data: Dict[str, Any], applicant_email: str, job_title: str):
        """
        Create an Interview Feedback note/doc in ERPNext.
        """
        # This usually maps to a custom DocType or 'Interviews'
        # We will skip implementing complex Interview sync unless defined.
        print(f"Skipping Interview Feedback sync for {applicant_email} (Not fully configured on ERP side)")
        pass
