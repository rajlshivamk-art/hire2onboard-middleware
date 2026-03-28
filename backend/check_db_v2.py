import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
from backend.config import settings
import sys

# Windows console encoding fix
sys.stdout.reconfigure(encoding='utf-8')

async def check_db():
    print(f"Connecting to MongoDB URL: {settings.MONGODB_URL}")
    try:
        client = AsyncIOMotorClient(settings.MONGODB_URL)
        
        # Explicitly select 'recruitment_db' just to be 100% sure
        # logic: verify if url string has it, but manually selecting is safer for debug
        db_name = "recruitment_db"
        db = client[db_name]
        
        print(f"\n=== DATABASE REPORT [{db_name}] ===")
        
        # Collections
        collections = await db.list_collection_names()
        print(f"Collections: {', '.join(collections)}")
        
        # JOB POSTINGS
        print("\n--- JOB POSTINGS ---")
        jobs = await db["Job"].find().to_list(length=100)
        print(f"Total Jobs: {len(jobs)}")
        for i, j in enumerate(jobs, 1):
            print(f"{i}. {j.get('title')} ({j.get('status')}) - IDs: {j.get('_id')}")

        # USERS
        print("\n--- USERS ---")
        users = await db["User"].find().to_list(length=100)
        print(f"Total Users: {len(users)}")
        for i, u in enumerate(users, 1):
            print(f"{i}. {u.get('name')} <{u.get('email')}> Role: {u.get('role')}")
            
        print("\n=======================")
        client.close()
        
    except Exception as e:
        print(f"ERROR: {e}")

if __name__ == "__main__":
    asyncio.run(check_db())
