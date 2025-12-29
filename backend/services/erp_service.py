import requests
from typing import Optional, Dict, Any
from backend.config import settings
from datetime import datetime

from functools import wraps
import time

def ttl_cache(ttl_seconds):
    """
    Simple request-agnostic TTL cache decorator.
    Stores results in a dictionary with a timestamp.
    """
    def decorator(func):
        cache = {}
        
        @wraps(func)
        def wrapper(*args, **kwargs):
            # Create a key based on args. 
            # Note: unhashable args will raise TypeError, which is standard for lru_cache too.
            # We assume simple args here (strings, none).
            key = str(args) + str(kwargs)
            now = time.time()
            
            if key in cache:
                result, timestamp = cache[key]
                if now - timestamp < ttl_seconds:
                    return result
            
            result = func(*args, **kwargs)
            cache[key] = (result, now)
            return result
            
        wrapper.cache_clear = lambda: cache.clear()
        return wrapper
    return decorator

class ERPService:
    BASE_URL = settings.ERP_BASE_URL
    
    @classmethod
    def login(cls, username: str, password: str) -> Optional[requests.cookies.RequestsCookieJar]:
        """
        Authenticate against ERPNext/Frappe.
        Returns cookies if successful, None otherwise.
        """
        login_url = f"{cls.BASE_URL}/api/method/login"
        try:
            response = requests.post(login_url, data={
                'usr': username,
                'pwd': password
            }, timeout=10)
            
            if response.status_code == 200 and response.json().get('message') == 'Logged In':
                return response.cookies
        except Exception as e:
            print(f"ERP Login Error: {e}")
            return None
        return None

    @classmethod
    @ttl_cache(ttl_seconds=300) # Cache for 5 minutes
    def get_all_companies(cls) -> list:
        """Fetch list of all companies from ERP"""
        cookies = cls.login(settings.ERP_USER, settings.ERP_PASSWORD)
        if not cookies: return []
        
        try:
            resp = requests.get(f"{cls.BASE_URL}/api/resource/Company", cookies=cookies, timeout=10)
            if resp.status_code == 200:
                data = resp.json().get('data', [])
                return [c['name'] for c in data]
        except Exception as e:
            print(f"Error fetching companies: {e}")
        return []

    @classmethod
    @ttl_cache(ttl_seconds=300) # Cache for 5 minutes
    def get_employees_by_company(cls, company_name: str) -> list:
        """Fetch list of Employees for a specific company"""
        cookies = cls.login(settings.ERP_USER, settings.ERP_PASSWORD)
        if not cookies: return []

        try:
            # Fetch employees filtered by company
            # We want 'user_id' to know if they have a login, and 'employee_name', 'company_email'
            params = {
                "filters": f'[["company","=","{company_name}"], ["status","=","Active"]]',
                "fields": '["name","employee_name","company_email","user_id"]',
                "limit_page_length": 50
            }
            resp = requests.get(f"{cls.BASE_URL}/api/resource/Employee", params=params, cookies=cookies, timeout=10)
            
            if resp.status_code == 200:
                return resp.json().get('data', [])
        except Exception as e:
            print(f"Error fetching employees: {e}")
        return []

    @classmethod
    def get_user_info(cls, cookies: requests.cookies.RequestsCookieJar) -> Optional[Dict[str, Any]]:
        """
        Fetch logged in user info to get the Company/User specifics.
        """
        if not cookies:
            return None
            
        try:
            # Get basic logged in user details
            response = requests.get(f"{cls.BASE_URL}/api/method/frappe.auth.get_logged_user", cookies=cookies, timeout=10)
            if response.status_code != 200:
                return None
                
            user_data = response.json()
            # user_data might look like: 
            # {
            #     "message": {
            #         "user": "administrator",
            #         "email": "admin@example.com",
            #         ...
            #     }
            # }
            
            message_obj = user_data.get('message')
            if isinstance(message_obj, str):
                 user_id = message_obj 
            elif isinstance(message_obj, dict):
                 user_id = message_obj.get('user')
            else:
                 user_id = None

            if not user_id:
                return None
                
            user_details_resp = requests.get(f"{cls.BASE_URL}/api/resource/User/{user_id}", cookies=cookies, timeout=10)
            if user_details_resp.status_code == 200:
                user_doc = user_details_resp.json().get('data', {})
                # Note: 'User' doc in ERPNext doesn't strictly have 'company' usually (it's in Employee or Roles or Permissions)
                # But sometimes it might be linked. 
                # For this implementation, if no company is found, we might defaults or use the user's name as a proxy for tenant if simpler.
                # However, usually ERPNext is multi-company but one 'User' can access multiple companies. 
                # If we want to restrict, we need to know WHICH company they are logging into contextually or default.
                
                # Let's try to find an 'Employee' record linked to this user, which definitely has 'company'
                employee_resp = requests.get(
                    f"{cls.BASE_URL}/api/resource/Employee", 
                    params={"filters": f'[["user_id","=","{user_id}"]]'}, 
                    cookies=cookies,
                    timeout=10
                )
                
                company = None
                if employee_resp.status_code == 200:
                     data = employee_resp.json().get('data', [])
                     if data:
                         # We found an employee record!
                         # Now fetch that employee to get the company
                         emp_name = data[0].get('name')
                         full_emp_resp = requests.get(f"{cls.BASE_URL}/api/resource/Employee/{emp_name}", cookies=cookies, timeout=10)
                         if full_emp_resp.status_code == 200:
                             company = full_emp_resp.json().get('data', {}).get('company')

                # Extract roles
                roles = [r.get('role') for r in user_doc.get('roles', [])]

                return {
                    "username": user_id,
                    "full_name": user_doc.get('full_name') or user_id,
                    "email": user_doc.get('email') or user_id,
                    "company": company,
                    "roles": roles
                }
                
        except Exception as e:
            print(f"ERP User Info Error: {e}")
            return None
        return None

    @classmethod
    def _ensure_dependency(cls, doctype: str, name: str, cookies, extra_data: dict = None):
        """Ensures a dependency document exists (Designation, Department, etc.)"""
        try:
            # Check if exists
            check = requests.get(f"{cls.BASE_URL}/api/resource/{doctype}/{name}", cookies=cookies, timeout=10)
            if check.status_code == 200:
                return True
            
            # Create if not exists
            payload = {"doctype": doctype, "name": name}
            
            if doctype == "Designation":
                payload["designation_name"] = name
            elif doctype == "Department":
                payload["department_name"] = name
            elif doctype == "Interview Round":
                payload["round_name"] = name 
                itype = "Technical" if "Technical" in name else "HR"
                try:
                    t_check = requests.get(f"{cls.BASE_URL}/api/resource/Interview Type/{itype}", cookies=cookies, timeout=10)
                    if t_check.status_code != 200:
                        requests.post(f"{cls.BASE_URL}/api/resource/Interview Type", json={"doctype": "Interview Type", "name": itype}, cookies=cookies, timeout=10)
                except: pass
                payload["interview_type"] = itype

                try:
                    sk_check = requests.get(f"{cls.BASE_URL}/api/resource/Skill/Communication", cookies=cookies, timeout=10)
                    if sk_check.status_code != 200:
                        requests.post(f"{cls.BASE_URL}/api/resource/Skill", json={"doctype": "Skill", "skill_name": "Communication"}, cookies=cookies, timeout=10)
                except: pass
                payload["expected_skill_set"] = [{"skill": "Communication"}]
            
            if extra_data:
                payload.update(extra_data)
                
            create = requests.post(f"{cls.BASE_URL}/api/resource/{doctype}", json=payload, cookies=cookies, timeout=10)
            if create.status_code == 200:
                print(f"Created dependency: {doctype} - {name}")
                return True
            else:
                print(f"Failed to create {doctype}: {create.status_code}")
                with open("dependency_error.txt", "w", encoding="utf-8") as f:
                    f.write(f"DocType: {doctype}\nPayload: {payload}\nResponse: {create.text}")
                return False
        except Exception as e:
            print(f"Error ensuring {doctype}: {e}")
            return False

    @classmethod
    def create_job_opening(cls, job_data: dict):
        """
        Creates a 'Job Opening' in ERPNext.
        Uses admin credentials from settings to perform the request.
        """
        # 1. Login as Admin Service Account
        cookies = cls.login(settings.ERP_USER, settings.ERP_PASSWORD)
        if not cookies:
            print("Failed to login as Service Account for Job Sync")
            return None

        # 2. Dependency Check: Designation
        # Map Title -> Designation
        job_title = job_data.get("title")
        cls._ensure_dependency("Designation", job_title, cookies)
        
        # 3. Dependency Check: Department
        # Default to "HR" or "Human Resources" or first available?
        # Let's try to ensure "Recruitment" exists for all companies or use a safe default?
        # Actually, for Demo, let's just force "HR" and create if missing.
        dept = "HR"
        cls._ensure_dependency("Department", dept, cookies, {"company": job_data.get("company") or "Default Company"})
            
        # 4. Prepare payload
        payload = {
            "doctype": "Job Opening",
            "job_title": job_data.get("title"),
            "status": "Open" if job_data.get("status") == "Active" else "Closed",
            "company": job_data.get("company") or "Default Company",
            "description": job_data.get("description"),
            "designation": job_title,
            "department": dept
        }
        
        try:
            response = requests.post(f"{cls.BASE_URL}/api/resource/Job Opening", json=payload, cookies=cookies, timeout=10)
            if response.status_code == 200:
                print(f"Synced job to ERP: {response.json()}")
                return response.json()
            else:
                print(f"Failed to sync job to ERP: {response.status_code} {response.text}")
                return None
        except Exception as e:
             print(f"ERP Sync Error: {e}")
             return None

    @classmethod
    def get_job_id(cls, job_title: str, cookies) -> str:
        """Resolve Job Opening ID from Title"""
        try:
             j_resp = requests.get(
                 f"{cls.BASE_URL}/api/resource/Job Opening",
                 params={"filters": f'[["job_title","=","{job_title}"]]'},
                 cookies=cookies,
                 timeout=10
             )
             if j_resp.status_code == 200 and j_resp.json().get('data'):
                 return j_resp.json().get('data')[0].get('name')
        except:
             pass
        return job_title # Fallback to title if not found (or maybe return None?)

    @classmethod
    def create_job_applicant(cls, app_data: dict, job_title: str):
        """
        Creates a 'Job Applicant' in ERPNext.
        """
        cookies = cls.login(settings.ERP_USER, settings.ERP_PASSWORD)
        if not cookies:
            return None
        
        job_id = cls.get_job_id(job_title, cookies)

        payload = {
            "doctype": "Job Applicant",
            "applicant_name": app_data.get("name"),
            "email_id": app_data.get("email"),
            "status": "Open", 
            "job_title": job_id, 
            "phone_number": app_data.get("phone", "")
        }
        
        try:
            response = requests.post(f"{cls.BASE_URL}/api/resource/Job Applicant", json=payload, cookies=cookies, timeout=10)
            if response.status_code == 200:
                print(f"Synced Applicant to ERP: {response.json()}")
                return response.json()
            else:
                 print(f"Failed to sync Applicant: {response.status_code}")
                 with open("applicant_sync_error.txt", "w", encoding="utf-8") as f:
                     f.write(response.text)
                 return None
        except Exception as e:
             print(f"ERP Sync Error: {e}")
             return None

    @classmethod
    def create_job_offer(cls, offer_data: dict, applicant_email: str, job_title: str):
        """
        Creates a 'Job Offer' in ERPNext.
        """
        cookies = cls.login(settings.ERP_USER, settings.ERP_PASSWORD)
        if not cookies:
            return None
            
        # First find the Job Applicant ID by email
        applicant_id = None
        try:
             # Search for applicant
             resp = requests.get(
                 f"{cls.BASE_URL}/api/resource/Job Applicant", 
                 params={"filters": f'[["email_id","=","{applicant_email}"]]'},
                 cookies=cookies,
                 timeout=10
             )
             if resp.status_code == 200 and resp.json().get('data'):
                 applicant_id = resp.json().get('data')[0].get('name')
        except:
             pass
             
        if not applicant_id:
             print(f"Could not find ERP Applicant ID for {applicant_email}, cannot create Offer.")
             return None

        payload = {
            "doctype": "Job Offer",
            "job_applicant": applicant_id,
            "offer_date": str(datetime.now().date()),
            "status": "Awaiting Response", # ERPNext expects 'Awaiting Response' not 'Sent'
            "job_title": cls.get_job_id(job_title, cookies),
            "designation": job_title, # Include designation as it is mandatory
            "applicant_name": applicant_id, # ERPNext often uses ID or Name here
            # "offer_details": ...
        }
        
        try:
            response = requests.post(f"{cls.BASE_URL}/api/resource/Job Offer", json=payload, cookies=cookies, timeout=10)
            if response.status_code == 200:
                print(f"Synced Offer to ERP: {response.json()}")
                return response.json()
            else:
                 print(f"Failed to sync Offer: {response.status_code}")
                 with open("offer_sync_error.txt", "w", encoding="utf-8") as f:
                     f.write(response.text)
                 return None
        except Exception as e:
             print(f"ERP Offer Sync Error: {e}")
             return None

    @classmethod
    def sync_interview_feedback(cls, feedback_data: dict, applicant_email: str, job_title: str):
        """
        Creates an 'Interview' record in ERPNext to store feedback.
        """
        cookies = cls.login(settings.ERP_USER, settings.ERP_PASSWORD)
        if not cookies: return None

        # 1. Resolve Applicant ID
        applicant_id = None
        try:
             resp = requests.get(
                 f"{cls.BASE_URL}/api/resource/Job Applicant",
                 params={"filters": f'[["email_id","=","{applicant_email}"]]'},
                 cookies=cookies,
                 timeout=10
             )
             if resp.status_code == 200 and resp.json().get('data'):
                 applicant_id = resp.json().get('data')[0].get('name')
        except: pass
        
        if not applicant_id:
             print(f"Could not find ERP Applicant for {applicant_email}")
             return None

        # 2. Ensure Interview Round Exists
        round_name = feedback_data.get('roundName') or feedback_data.get('stage')
        cls._ensure_dependency("Interview Round", round_name, cookies)
        
        # Resolve Job ID
        job_id = cls.get_job_id(job_title, cookies)

        # Map Decision to Interview Status
        decision_to_status = {
            "Advance": "Cleared",
            "Reject": "Rejected",
            "Hold": "Under Review"
        }
        interview_status = decision_to_status.get(feedback_data.get('decision'), "Pending")

        # 3. Create 'Interview' (Parent)
        interview_name = None
        interview_payload = {
            "doctype": "Interview",
            "job_applicant": applicant_id,
            "interview_round": round_name,
            "status": interview_status, 
            "scheduled_on": str(datetime.now().date()),
            "job_opening": job_id,
            "interview_details": [{"interviewer": settings.ERP_USER or "administrator"}]
        }
        
        try:
            int_resp = requests.post(f"{cls.BASE_URL}/api/resource/Interview", json=interview_payload, cookies=cookies, timeout=10)
            if int_resp.status_code == 200:
                interview_name = int_resp.json().get('data').get('name')
                print(f"Created Interview: {interview_name}")
            else:
                print(f"Failed to create Interview: {int_resp.status_code}")
                with open("interview_creation_error.txt", "w", encoding="utf-8") as f:
                    f.write(int_resp.text)
                return None
        except Exception as e:
            print(f"Error creating Interview: {e}")
            return None

        # 4. Create 'Interview Feedback'
        # Map Decision
        decision_map = {
            "Advance": "Cleared",
            "Reject": "Rejected",
            "Hold": "Cleared" # Or empty/null if 'Hold' implies no result yet, but Feedback usually imply result.
        }
        erp_result = decision_map.get(feedback_data.get('decision'), "")
        
        # Normalize Rating (1-5 to 0-1)
        raw_rating = feedback_data.get('rating', 0)
        norm_rating = raw_rating / 5.0 if raw_rating else 0
        
        # Prepare Skill Assessment Child Table
        skill_table = []
        # Mapping from frontend keys to ERP Skill names
        skill_map = {
            "technicalSkills": "Technical",
            "communication": "Communication",
            "problemSolving": "Problem Solving",
            "cultureFit": "Culture Fit",
            "codeQuality": "Code Quality"
        }
        
        for key, skill_name in skill_map.items():
            score = feedback_data.get(key)
            if score:
                # Ensure Skill exists
                try:
                    s_check = requests.get(f"{cls.BASE_URL}/api/resource/Skill/{skill_name}", cookies=cookies, timeout=10)
                    if s_check.status_code != 200:
                         requests.post(f"{cls.BASE_URL}/api/resource/Skill", json={"doctype": "Skill", "skill_name": skill_name}, cookies=cookies, timeout=10)
                except: pass
                
                skill_table.append({
                    "skill": skill_name,
                    "rating": score # Assuming 1-5, which is typical for Skill Assessment
                })
        
        # If empty, add at least one dummy to pass mandatory (using Communication)
        if not skill_table:
             skill_table.append({"skill": "Communication", "rating": raw_rating or 3})

        feedback_payload = {
            "doctype": "Interview Feedback",
            "interview": interview_name,
            "job_applicant": applicant_id,
            "interview_round": round_name,
            "feedback": feedback_data.get('comments'),
            "result": erp_result,
            "average_rating": norm_rating,
            "skill_assessment": skill_table,
            # Assign interviewer if we have email, else leaving blank might default to logged in user (Admin)
            "interviewer": settings.ERP_USER or "administrator"
        }

        try:
            fb_resp = requests.post(f"{cls.BASE_URL}/api/resource/Interview Feedback", json=feedback_payload, cookies=cookies, timeout=10)
            if fb_resp.status_code == 200:
                print(f"Synced Interview Feedback: {fb_resp.json().get('data').get('name')}")
                
                 # Optional: Update Interview status to Completed? 
                 # Usually Feedback submission does this.
                return fb_resp.json()
            else:
                print(f"Failed to sync Feedback: {fb_resp.status_code}")
                with open("feedback_sync_error.txt", "w", encoding="utf-8") as f:
                    f.write(fb_resp.text)
                return None
        except Exception as e:
            print(f"Error creating Feedback: {e}")
            return None
