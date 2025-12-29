from backend.models import User, Job
from backend.schemas import UserCreate, JobCreate

async def initialize_db(db=None):
    """Seeds the database with default data if empty."""
    
    # Check if users exist
    print("Seeding/Updating default users...")
    
    # Define ONLY the admin user for live deployment preparation
    admin_user = {
        "name": "System Admin", 
        "email": "admin@company.com", 
        "password": "password", # User should change this immediately
        "role": "Admin", 
        "company": "My Company",
        "canViewSalary": True, 
        "canMoveCandidate": True, 
        "canEditJob": True, 
        "canManageUsers": True
    }

    existing_user = await User.find_one(User.email == admin_user["email"])
    if existing_user:
        # Update existing admin to ensure permissions are correct
        # We generally avoid resetting passwords for existing users to prevent lockout
        # but we ensure the role and permissions are set.
        u_update = admin_user.copy()
        if "password" in u_update:
            del u_update["password"] 
            
        await existing_user.set(u_update)
        print(f"Admin user {admin_user['email']} updated.")
    else:
        # Create new admin user
        user = User(**admin_user)
        await user.insert()
        print(f"Admin user {admin_user['email']} created.")

    # Check if jobs exist
    # For live system, we do NOT want to seed demo jobs. 
    # Just checking logic remains for future use or verification.
    existing_jobs_count = await Job.find_all().count()
    print(f"Database contains {existing_jobs_count} job postings.")

