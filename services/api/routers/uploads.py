import boto3
import os
import uuid
from botocore.config import Config
from fastapi import APIRouter, HTTPException
from ..models.schema import PresignedRequest, PresignedResponse

# Config from environment
REGION = os.getenv("AWS_REGION", "eu-central-1")
BUCKET = os.environ["S3_BUCKET"]      
PRESIGN_TTL = int(os.getenv("PRESIGN_TTL", "900"))
VIDEO_EXTENSIONS = {"video/mp4": ".mp4", "video/quicktime": ".mov", "video/webm": ".webm", "video/x-matroska": ".mkv"}

# Virtual addressing makes presigned URLs use the regional endpoint; the global one 307-redirects for new buckets
s3 = boto3.client("s3", region_name=REGION, config=Config(s3={"addressing_style": "virtual"}))

router = APIRouter(prefix="/upload-url", tags=["uploads"])

@router.post("", response_model=PresignedResponse)

# Create a presigned PUT URL that lets the browser upload directly to S3.
def create_presigned_put(req: PresignedRequest):
    ext = VIDEO_EXTENSIONS.get(req.content_type)
    if ext is None:
        raise HTTPException(status_code=400, detail=f"Unsupported content type: {req.content_type}")
    key = f"uploads/{uuid.uuid4()}{ext}"
    try:
        url = s3.generate_presigned_url("put_object", Params={"Bucket": BUCKET, "Key":key, "ContentType": req.content_type}, ExpiresIn=PRESIGN_TTL)
        return PresignedResponse(key=key, url=url)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
