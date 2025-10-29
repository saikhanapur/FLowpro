"""
Create default admin user and migrate existing data
"""
import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
from passlib.context import CryptContext
import uuid
from datetime import datetime, timezone
import os
from dotenv import load_dotenv

load_dotenv()

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

async def create_admin_and_migrate():
    # Connect to MongoDB
    mongo_url = os.environ['MONGO_URL']
    client = AsyncIOMotorClient(mongo_url)
    db = client[os.environ.get('DB_NAME', 'flowforge')]
    
    print("🔄 Starting admin creation and data migration...")
    
    # 1. Create default admin user
    admin_email = "sannu.sai@gmail.com"
    admin_password = "FlowForge2024!"  # Strong default password
    
    # Check if admin exists
    existing_admin = await db.users.find_one({"email": admin_email})
    
    if not existing_admin:
        admin_user = {
            "id": str(uuid.uuid4()),
            "email": admin_email,
            "name": "Admin User",
            "password_hash": pwd_context.hash(admin_password),
            "auth_method": "email",
            "picture": None,
            "createdAt": datetime.now(timezone.utc).isoformat(),
            "updatedAt": datetime.now(timezone.utc).isoformat()
        }
        
        await db.users.insert_one(admin_user)
        print(f"✅ Created admin user: {admin_email}")
        print(f"🔑 Admin password: {admin_password}")
        print(f"⚠️  IMPORTANT: Change this password after first login!")
        admin_id = admin_user['id']
    else:
        admin_id = existing_admin['id']
        print(f"ℹ️  Admin user already exists: {admin_email}")
    
    # 2. Create default workspace for admin if not exists
    default_workspace = await db.workspaces.find_one({"userId": admin_id, "isDefault": True})
    
    if not default_workspace:
        workspace = {
            "id": str(uuid.uuid4()),
            "name": "My Workspace",
            "description": "Default workspace",
            "color": "blue",
            "icon": "folder",
            "userId": admin_id,
            "createdAt": datetime.now(timezone.utc).isoformat(),
            "updatedAt": datetime.now(timezone.utc).isoformat(),
            "processCount": 0,
            "isDefault": True
        }
        
        await db.workspaces.insert_one(workspace)
        print(f"✅ Created default workspace")
        default_workspace_id = workspace['id']
    else:
        default_workspace_id = default_workspace['id']
        print(f"ℹ️  Default workspace already exists")
    
    # 3. Migrate existing processes without userId
    processes_updated = await db.processes.update_many(
        {"userId": {"$exists": False}},
        {"$set": {"userId": admin_id}}
    )
    print(f"✅ Migrated {processes_updated.modified_count} processes to admin user")
    
    # 4. Migrate existing workspaces without userId
    workspaces_updated = await db.workspaces.update_many(
        {"userId": {"$exists": False}},
        {"$set": {"userId": admin_id}}
    )
    print(f"✅ Migrated {workspaces_updated.modified_count} workspaces to admin user")
    
    # 5. Assign orphaned processes to default workspace
    orphaned_updated = await db.processes.update_many(
        {"workspaceId": None, "userId": admin_id},
        {"$set": {"workspaceId": default_workspace_id}}
    )
    print(f"✅ Assigned {orphaned_updated.modified_count} orphaned processes to default workspace")
    
    # 6. Update process counts
    workspaces = await db.workspaces.find({"userId": admin_id}).to_list(length=None)
    for workspace in workspaces:
        count = await db.processes.count_documents({"workspaceId": workspace['id']})
        await db.workspaces.update_one(
            {"id": workspace['id']},
            {"$set": {"processCount": count}}
        )
    print(f"✅ Updated process counts for all workspaces")
    
    print("\n🎉 Migration complete!")
    print(f"\n📝 Admin Credentials:")
    print(f"   Email: {admin_email}")
    print(f"   Password: {admin_password}")
    print(f"\n⚠️  Please change the admin password after first login!")
    
    client.close()

if __name__ == "__main__":
    asyncio.run(create_admin_and_migrate())
