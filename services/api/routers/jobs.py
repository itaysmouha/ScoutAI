import os, json, boto3
from fastapi import APIRouter, HTTPException
from ..models.schema import CreateJobRequest, JobItem
from datetime import datetime, timezone


# Config from environment
REGION = os.getenv("AWS_REGION", "eu-central-1")
BUCKET = os.environ["S3_BUCKET"]  
JOBS_TABLE = os.environ["JOBS_TABLE"]
SQS_URL = os.environ["SQS_JOBS_URL"]

# AWS clients
sqs = boto3.client("sqs", region_name=REGION)
ddb = boto3.resource("dynamodb", region_name=REGION).Table(JOBS_TABLE)

def now_iso():
    return datetime.now(timezone.utc).isoformat()

# This router handles /jobs
router = APIRouter(prefix="/jobs", tags=["jobs"])
@router.post("", response_model=JobItem, status_code=201)
# Create a new job item in DynamoDB (status=PENDING), and enqueue a message on SQS for the worker.
def create_job(body: CreateJobRequest):
    job_id = f"job-{os.urandom(8).hex()}"

    job_item = {
        "jobId": job_id,
        "userId": body.user_id,
        "status": "PENDING",
        "s3KeyInput": body.s3_key_input,
        "createdAt": now_iso()
    }
    if body.match_id:
        job_item["matchId"] = body.match_id

    try:
        ddb.put_item(Item = job_item)
        sqs.send_message(QueueUrl = SQS_URL, MessageBody=json.dumps({"jobId": job_id,"s3KeyInput": body.s3_key_input}),
                          MessageAttributes={"jobType":{"DataType":"String","StringValue":"video-analysis"}})
        return job_item
    
    except Exception as e:
        raise HTTPException(status_code=500, setail=str(e))
    
@router.get("/{job_id}", response_model=JobItem)

# Lookup a job in DynamoDB by its primary key
def get_job(job_id: str):
    try:
        res = ddb.get_item(Key={"jobId": job_id})
        item = res.get("Item")
        if not item:
            raise HTTPException(status_code=404, detail="Job not found")
        return item
    except HTTPException:
        # Preserve the 404 if we raised it above
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

