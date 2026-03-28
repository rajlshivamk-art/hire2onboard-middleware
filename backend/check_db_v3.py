import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
from backend.config import settings
import sys

# Windows console encoding fix
sys.stdout.reconfigure(encoding='utf-8')

async def check_db():
    print(f"Connecting to MongoDB...")
    try:
        # Connect without DB in URL path to list databases
        base_url = settings.MONGODB_URL.split('/')[0] + "//" + settings.MONGODB_URL.split('/')[2]
        client = AsyncIOMotorClient(base_url)
        
        dbs = await client.list_database_names()
        print(f"Found Databases: {dbs}")
        
        for db_name in dbs:
            if db_name in ['admin', 'local', 'config']: continue
            
            print(f"\n--- Checking DB: {db_name} ---")
            db = client[db_name]
            cols = await db.list_collection_names()
            print(f"Collections: {cols}")
            
            for col in cols:
                count = await db[col].count_documents({})
                print(f"  -> {col}: {count} docs")
                
                if count > 0 and col in ['Job', 'User', 'Application']:
                     docs = await db[col].find().to_list(length=5)
                     for d in docs:
                         print(f"     * {d.get('title') or d.get('name') or d.get('email')}")

        client.close()
        
    except Exception as e:
        print(f"ERROR: {e}")

if __name__ == "__main__":
    asyncio.run(check_db())
