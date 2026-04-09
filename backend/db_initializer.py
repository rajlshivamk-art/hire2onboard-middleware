from backend.models import User, Job

async def initialize_db(db=None):
    """
    SaaS-safe DB initializer.
    No default users are created.
    Each company must register via /register-company.
    """

    print("🚀 Database initialized (SaaS mode)")

    # Optional: log stats (safe)
    users_count = await User.find_all().count()
    jobs_count = await Job.find_all().count()

    print(f"Users count: {users_count}")
    print(f"Jobs count: {jobs_count}")