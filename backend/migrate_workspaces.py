"""
Migration script to create default workspace and assign existing processes
Run this once after deploying workspace feature
"""
import asyncio
import sys
sys.path.insert(0, '/app/backend')
from motor.motor_asyncio import AsyncIOMotorClient
from datetime import datetime, timezone
import uuid

MONGO_URL = "mongodb://localhost:27017"
DB_NAME = "flowforge_db"

async def migrate():
    client = AsyncIOMotorClient(MONGO_URL)
    db = client[DB_NAME]
    
    print("🔄 Starting workspace migration...")
    
    # Check if default workspace already exists
    existing = await db.workspaces.find_one({"isDefault": True})
    
    if existing:
        print(f"✅ Default workspace already exists: {existing['name']}")
        default_workspace_id = existing['id']
    else:
        # Create default workspace
        default_workspace = {
            "id": str(uuid.uuid4()),
            "name": "My Workspace",
            "description": "Default workspace for all processes",
            "color": "blue",
            "icon": "folder",
            "createdAt": datetime.now(timezone.utc).isoformat(),
            "updatedAt": datetime.now(timezone.utc).isoformat(),
            "processCount": 0,
            "isDefault": True
        }
        
        await db.workspaces.insert_one(default_workspace)
        default_workspace_id = default_workspace['id']
        print(f"✅ Created default workspace: {default_workspace['name']}")
    
    # Count processes without workspaceId
    unassigned_count = await db.processes.count_documents({
        "$or": [
            {"workspaceId": {"$exists": False}},
            {"workspaceId": None}
        ]
    })
    
    if unassigned_count > 0:
        print(f"🔄 Assigning {unassigned_count} processes to default workspace...")
        
        # Assign all processes without workspaceId to default workspace
        result = await db.processes.update_many(
            {
                "$or": [
                    {"workspaceId": {"$exists": False}},
                    {"workspaceId": None}
                ]
            },
            {"$set": {"workspaceId": default_workspace_id}}
        )
        
        print(f"✅ Assigned {result.modified_count} processes to default workspace")
    else:
        print("✅ All processes already have workspaces assigned")
    
    # Update workspace process count
    process_count = await db.processes.count_documents({"workspaceId": default_workspace_id})
    await db.workspaces.update_one(
        {"id": default_workspace_id},
        {"$set": {"processCount": process_count}}
    )
    
    print(f"✅ Updated workspace process count: {process_count}")
    print("✅ Migration complete!")
    
    client.close()

if __name__ == "__main__":
    asyncio.run(migrate())
