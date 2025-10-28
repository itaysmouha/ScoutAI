from pydantic import BaseModel, Field
from typing import Optional


# Request body when asking for an unsigned upload URL, meaning the request was signed beforehand instead of by the uploader, so it already contains a valid AWS signature
class PresignedRequest(BaseModel):
    content_type: str = Field("video/mp4")

#Response eith both the s3 key that we generated and also the preigned URL to PUT to
class PresignedResponse(BaseModel):
    key: str
    url: str


#Request body to create a new job record
class CreateJobRequest(BaseModel):
    # The S3 object key that the client has already uploaded in presign
    s3_key_input: str = Field(..., description="e.g. uploads/<uuid>.mp4")

    #for local testing, let the user is be "user-42"
    user_id: Optional[str] = "user-42"
    match_id: Optional[str] = None

#The format of the job returned by the API, mirroring the format of the DynamoDB job
class JobItem(BaseModel):
    jobId: str
    userId: str
    status: str
    s3KeyInput: str
    createdAt: str
    matchId: Optional[str] = None
    s3KeyOutput: Optional[str] = None
    metricsKey: Optional[str] = None
    updatedAt: Optional[str] = None