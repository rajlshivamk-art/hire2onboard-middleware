from motor.motor_asyncio import AsyncIOMotorGridFSBucket
from beanie import PydanticObjectId

# Global FS bucket instance
_fs = None

def init_gridfs(db):
    """Initializes the GridFS bucket with the given database."""
    global _fs
    _fs = AsyncIOMotorGridFSBucket(db)

async def get_gridfs():
    """Returns the GridFS bucket, raising an error if not initialized."""
    global _fs
    if _fs is None:
        raise RuntimeError("GridFS has not been initialized. Call init_gridfs(db) first.")
    return _fs

async def upload_file_from_stream(filename: str, source_stream, content_type: str) -> str:
    """Uploads a file to GridFS from a stream."""
    fs = await get_gridfs()
    file_id = await fs.upload_from_stream(
        filename,
        source_stream,
        metadata={"contentType": content_type}
    )
    return str(file_id)

async def get_file_stream(file_id: str):
    """Returns a GridOut stream for the file."""
    fs = await get_gridfs()
    try:
        return await fs.open_download_stream(PydanticObjectId(file_id))
    except Exception:
        return None
