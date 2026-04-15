import asyncio
from datetime import datetime
from motor.motor_asyncio import AsyncIOMotorClient
from uuid import uuid4
from passlib.context import CryptContext
from pydantic_settings import BaseSettings

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

class Settings(BaseSettings):
    MONGODB_URL: str = "mongodb://127.0.0.1:27017/old_hire2onboard_db"
    model_config = {"env_file": ".env", "extra": "ignore"}

settings = Settings()

SAMPLE_COMPANY = {"name": "TechCorp Solutions"}

SAMPLE_JOBS = [
    {
        "title": "Senior Python Developer",
        "department": "Engineering",
        "location": "San Francisco, CA",
        "type": "Full-time",
        "description": "We are looking for a Senior Python Developer to join our growing team.",
        "requirements": ["5+ years Python experience", "FastAPI/Flask", "MongoDB", "Redis", "AWS"],
        "salaryMin": 120000,
        "salaryMax": 160000,
        "openings": 2
    },
    {
        "title": "Frontend React Developer",
        "department": "Engineering",
        "location": "Remote",
        "type": "Full-time",
        "description": "Join our frontend team to build beautiful, responsive web applications.",
        "requirements": ["3+ years React", "TypeScript", "Tailwind CSS", "Figma", "GraphQL"],
        "salaryMin": 90000,
        "salaryMax": 130000,
        "openings": 3
    },
    {
        "title": "DevOps Engineer",
        "department": "Infrastructure",
        "location": "Austin, TX",
        "type": "Full-time",
        "description": "Looking for a DevOps Engineer to improve our CI/CD pipelines.",
        "requirements": ["Kubernetes", "Docker", "Terraform", "AWS/GCP", "GitHub Actions"],
        "salaryMin": 110000,
        "salaryMax": 140000,
        "openings": 1
    },
    {
        "title": "Data Scientist",
        "department": "Data",
        "location": "New York, NY",
        "type": "Full-time",
        "description": "Join our data team to build ML models and analyze large datasets.",
        "requirements": ["Python", "TensorFlow/PyTorch", "SQL", "Statistics", "NLP"],
        "salaryMin": 130000,
        "salaryMax": 170000,
        "openings": 2
    },
    {
        "title": "Product Manager",
        "department": "Product",
        "location": "Seattle, WA",
        "type": "Full-time",
        "description": "Lead product development from conception to launch.",
        "requirements": ["3+ years PM experience", "Agile", "User research", "SQL", "Roadmapping"],
        "salaryMin": 100000,
        "salaryMax": 140000,
        "openings": 1
    },
    {
        "title": "UX Designer",
        "department": "Design",
        "location": "Los Angeles, CA",
        "type": "Full-time",
        "description": "Design intuitive user interfaces and experiences.",
        "requirements": ["Figma", "User research", "Prototyping", "Design systems", "UI/UX"],
        "salaryMin": 80000,
        "salaryMax": 110000,
        "openings": 2
    },
    {
        "title": "Mobile Developer (iOS)",
        "department": "Engineering",
        "location": "Chicago, IL",
        "type": "Full-time",
        "description": "Build native iOS applications using Swift and SwiftUI.",
        "requirements": ["Swift", "SwiftUI", "Xcode", "iOS APIs", "App Store"],
        "salaryMin": 100000,
        "salaryMax": 140000,
        "openings": 1
    },
    {
        "title": "Backend Go Developer",
        "department": "Engineering",
        "location": "Denver, CO",
        "type": "Full-time",
        "description": "Develop high-performance backend services in Go.",
        "requirements": ["Go", "gRPC", "PostgreSQL", "Microservices", "Docker"],
        "salaryMin": 110000,
        "salaryMax": 150000,
        "openings": 2
    },
    {
        "title": "QA Engineer",
        "department": "Quality",
        "location": "Boston, MA",
        "type": "Full-time",
        "description": "Ensure our products meet the highest quality standards.",
        "requirements": ["Selenium", "Python", "Test automation", "CI/CD", "Jira"],
        "salaryMin": 70000,
        "salaryMax": 95000,
        "openings": 2
    },
    {
        "title": "Technical Writer",
        "department": "Documentation",
        "location": "Remote",
        "type": "Part-time",
        "description": "Create technical documentation for our products and APIs.",
        "requirements": ["Technical writing", "API docs", "Markdown", "Git", "Developer tools"],
        "salaryMin": 50000,
        "salaryMax": 70000,
        "openings": 1
    }
]

SAMPLE_CANDIDATES = [
    {"name": "Alice Johnson", "email": "alice.johnson@email.com", "phone": "555-0101", "yearsOfExperience": 7, "skills": ["Python", "FastAPI", "MongoDB", "AWS"], "source": "LinkedIn", "currentSalary": 115000, "expectedSalary": 140000},
    {"name": "Bob Smith", "email": "bob.smith@email.com", "phone": "555-0102", "yearsOfExperience": 5, "skills": ["React", "TypeScript", "GraphQL", "Figma"], "source": "Indeed", "currentSalary": 95000, "expectedSalary": 120000},
    {"name": "Carol Williams", "email": "carol.williams@email.com", "phone": "555-0103", "yearsOfExperience": 6, "skills": ["Kubernetes", "Terraform", "AWS", "Docker"], "source": "Referral", "currentSalary": 120000, "expectedSalary": 145000},
    {"name": "David Brown", "email": "david.brown@email.com", "phone": "555-0104", "yearsOfExperience": 4, "skills": ["Python", "TensorFlow", "SQL", "NLP"], "source": "LinkedIn", "currentSalary": 100000, "expectedSalary": 130000},
    {"name": "Emma Davis", "email": "emma.davis@email.com", "phone": "555-0105", "yearsOfExperience": 8, "skills": ["Product Management", "Agile", "SQL", "Figma"], "source": "Company Website", "currentSalary": 130000, "expectedSalary": 150000},
    {"name": "Frank Miller", "email": "frank.miller@email.com", "phone": "555-0106", "yearsOfExperience": 4, "skills": ["Figma", "Sketch", "Prototyping", "User Research"], "source": "Dribbble", "currentSalary": 85000, "expectedSalary": 105000},
    {"name": "Grace Lee", "email": "grace.lee@email.com", "phone": "555-0107", "yearsOfExperience": 3, "skills": ["Swift", "SwiftUI", "iOS", "Xcode"], "source": "LinkedIn", "currentSalary": 90000, "expectedSalary": 115000},
    {"name": "Henry Wilson", "email": "henry.wilson@email.com", "phone": "555-0108", "yearsOfExperience": 6, "skills": ["Go", "gRPC", "PostgreSQL", "Docker"], "source": "GitHub", "currentSalary": 110000, "expectedSalary": 135000},
    {"name": "Ivy Chen", "email": "ivy.chen@email.com", "phone": "555-0109", "yearsOfExperience": 5, "skills": ["Selenium", "Python", "Test Automation", "CI/CD"], "source": "Indeed", "currentSalary": 80000, "expectedSalary": 95000},
    {"name": "Jack Taylor", "email": "jack.taylor@email.com", "phone": "555-0110", "yearsOfExperience": 2, "skills": ["Technical Writing", "Markdown", "Git", "API Docs"], "source": "Company Website", "currentSalary": 45000, "expectedSalary": 55000}
]

async def seed_data():
    print(f"Connecting to: {settings.MONGODB_URL}")
    
    client = AsyncIOMotorClient(settings.MONGODB_URL)
    db = client.get_default_database()
    
    print("Connected to MongoDB")
    
    companies = db.companies
    users = db.users
    jobs = db.jobs
    applications = db.applications
    
    company = await companies.find_one({"name": SAMPLE_COMPANY["name"]})
    if not company:
        result = await companies.insert_one({
            "name": SAMPLE_COMPANY["name"],
            "createdAt": datetime.utcnow()
        })
        company = await companies.find_one({"_id": result.inserted_id})
        print(f"Created company: {company['name']}")
    else:
        print(f"Using existing company: {company['name']}")
    
    await users.delete_one({"email": "admin@techcorp.com"})
    
    hashed_password = pwd_context.hash("password123")
    await users.insert_one({
        "name": "John Admin",
        "email": "admin@techcorp.com",
        "password": hashed_password,
        "role": "Admin",
        "company": "TechCorp Solutions",
        "companyId": company["_id"],
        "canViewSalary": True,
        "canMoveCandidate": True,
        "canEditJob": True,
        "canManageUsers": True,
        "isSuperUser": False
    })
    print(f"Created user: admin@techcorp.com")
    
    existing_jobs_count = await jobs.count_documents({"companyId": company["_id"]})
    print(f"Current jobs: {existing_jobs_count}")
    
    if existing_jobs_count == 0:
        print("Creating jobs...")
        job_docs = []
        for job_data in SAMPLE_JOBS:
            job_doc = {
                **job_data,
                "postedDate": datetime.utcnow(),
                "status": "Active",
                "company": SAMPLE_COMPANY["name"],
                "companyId": company["_id"],
                "postingChannels": ["Indeed", "LinkedIn"]
            }
            result = await jobs.insert_one(job_doc)
            job_doc["_id"] = result.inserted_id
            job_docs.append(job_doc)
        print(f"Created {len(job_docs)} jobs")
        
        job_list = await jobs.find({"companyId": company["_id"]}).to_list(10)
        
        print("Creating candidates...")
        for i, candidate_data in enumerate(SAMPLE_CANDIDATES):
            job_index = i % len(job_list)
            app_doc = {
                "jobId": str(job_list[job_index]["_id"]),
                "name": candidate_data["name"],
                "email": candidate_data["email"],
                "phone": candidate_data["phone"],
                "resumeUrl": f"https://example.com/resumes/{uuid4()}.pdf",
                "yearsOfExperience": candidate_data["yearsOfExperience"],
                "skills": candidate_data["skills"],
                "source": candidate_data["source"],
                "currentSalary": candidate_data["currentSalary"],
                "expectedSalary": candidate_data["expectedSalary"],
                "stage": "Applied",
                "appliedDate": datetime.utcnow(),
                "company": SAMPLE_COMPANY["name"],
                "companyId": company["_id"]
            }
            await applications.insert_one(app_doc)
        print(f"Created {len(SAMPLE_CANDIDATES)} candidates")
    else:
        print("Jobs already exist, skipping seed")
    
    print("\nSeed complete!")
    print(f"   Company: {SAMPLE_COMPANY['name']}")
    print(f"   Login: admin@techcorp.com / password123")

if __name__ == "__main__":
    asyncio.run(seed_data())