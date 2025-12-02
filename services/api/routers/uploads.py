import boto3, os,uuid
from fastapi import APIRouter, HTTPException
from ..models.schema import PresignedRequest, PresignedResponse

# Config from environment
REGION = os.getenv("AWS_REGION", "eu-central-1")
BUCKET = os.environ["S3_BUCKET"]      
PRESIGN_TTL = int(os.getenv("PRESIGN_TTL", "900"))  

s3 = boto3.client("s3", region_name=REGION)

router = APIRouter(prefix="/upload-url", tags=["uploads"])

@router.post("", response_model=PresignedResponse)

# Create a presigned PUT URL that lets the browser upload directly to S3.
def create_presigned_put(req: PresignedRequest):
    key = f"uploads/{uuid.uuid4()}.mp4"
    try:
        url = s3.generate_presigned_url("put_object", Params={"Bucket": BUCKET, "Key":key, "ContentType": req.content_type}, ExpiresIn=PRESIGN_TTL)
        return PresignedResponse(key=key, url=url)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
