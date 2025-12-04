import os, json, boto3
from datetime import datetime, timezone
from botocore.exceptions import ClientError
from fastapi import APIRouter, HTTPException
from typing import List, Optional
from fastapi import Query

from ..models.schema import CreateJobRequest, JobItem

# -----------------------------------------------------------------------------
# Config from environment
# -----------------------------------------------------------------------------
REGION     = os.getenv("AWS_REGION", "eu-central-1")
BUCKET     = os.environ["S3_BUCKET"]
JOBS_TABLE = os.environ["JOBS_TABLE"]
SQS_URL    = os.environ["SQS_JOBS_URL"]

# -----------------------------------------------------------------------------
# AWS clients
# -----------------------------------------------------------------------------
sqs = boto3.client("sqs", region_name=REGION)
ddb = boto3.resource("dynamodb", region_name=REGION).Table(JOBS_TABLE)
s3  = boto3.client("s3", region_name=REGION)   # used for metrics + output from S3


def now_iso():
    """Return current UTC time as ISO string."""
    return datetime.now(timezone.utc).isoformat()


# This router handles /jobs
router = APIRouter(prefix="/jobs", tags=["jobs"])


# -----------------------------------------------------------------------------
# Helper: actual DynamoDB lookup for a job
# -----------------------------------------------------------------------------
def get_job(job_id: str):
    """
    Internal helper to fetch a job from DynamoDB.
    Used by the GET /jobs/{job_id} endpoint and others.
    """
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


# -----------------------------------------------------------------------------
# POST /jobs  -> create a job + enqueue to SQS
# -----------------------------------------------------------------------------
@router.post("", response_model=JobItem, status_code=201)
def create_job(body: CreateJobRequest):
    """
    Create a new job item in DynamoDB (status=PENDING),
    and enqueue a message on SQS for the worker.
    """
    job_id = f"job-{os.urandom(8).hex()}"

    job_item = {
        "jobId": job_id,
        "userId": body.user_id,
        "status": "PENDING",
        "s3KeyInput": body.s3_key_input,
        "createdAt": now_iso(),
    }
    if body.match_id:
        job_item["matchId"] = body.match_id

    try:
        # 1) Store the job in DynamoDB
        ddb.put_item(Item=job_item)

        # 2) Send a message to SQS for the worker
        sqs.send_message(
            QueueUrl=SQS_URL,
            MessageBody=json.dumps({
                "jobId": job_id,
                "s3KeyInput": body.s3_key_input,
            }),
            MessageAttributes={
                "jobType": {
                    "DataType": "String",
                    "StringValue": "video-analysis",
                }
            },
        )

        return job_item

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# -----------------------------------------------------------------------------
# GET /jobs  -> list jobs (optionally by userId)
# -----------------------------------------------------------------------------

@router.get("", response_model=List[JobItem])
def list_jobs(userId: Optional[str] = Query(default=None, alias="userId")):
    """
    List jobs, optionally filtered by userId.

    NOTE: Uses a DynamoDB scan for now (fine for dev).
    Later you can add a GSI on userId and switch to query().
    """
    try:
        resp = ddb.scan()
        items = resp.get("Items", [])

        if userId:
            items = [item for item in items if item.get("userId") == userId]

        # sort by createdAt descending if present
        items.sort(key=lambda x: x.get("createdAt", ""), reverse=True)

        return items
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# -----------------------------------------------------------------------------
# GET /jobs/{job_id}  -> fetch job from DynamoDB
# -----------------------------------------------------------------------------
@router.get("/{job_id}", response_model=JobItem)
def read_job(job_id: str):
    """
    Lookup a single job by id and return its current status/item.
    """
    return get_job(job_id)


# -----------------------------------------------------------------------------
# GET /jobs/{job_id}/metrics  -> fetch metrics JSON from S3
# -----------------------------------------------------------------------------
@router.get("/{job_id}/metrics")
def get_job_metrics(job_id: str):
    """
    Fetch metrics JSON for a job from S3.

    Worker writes metrics to something like:
        metrics/{jobId}.json

    and also stores the key in DynamoDB as `metricsKey`.
    """
    # 1) Get the job item from DynamoDB to find metricsKey
    item = get_job(job_id)

    status = item.get("status", "UNKNOWN")
    # Optional: enforce that job is completed before exposing metrics
    if status not in ("COMPLETED", "FAILED"):
        raise HTTPException(
            status_code=409,
            detail=f"Job not completed yet (status={status})",
        )

    metrics_key = item.get("metricsKey")
    if not metrics_key:
        raise HTTPException(status_code=404, detail="Metrics not available for this job")

    # 2) Fetch the metrics JSON from S3
    try:
        obj = s3.get_object(Bucket=BUCKET, Key=metrics_key)
        body = obj["Body"].read().decode("utf-8")
        metrics = json.loads(body)
        return {"jobId": job_id, "metrics": metrics}

    except ClientError as e:
        # Handle the case where the object doesn't exist
        error_code = e.response["Error"]["Code"]
        if error_code == "NoSuchKey":
            raise HTTPException(status_code=404, detail="Metrics file not found in S3")
        raise HTTPException(status_code=500, detail=f"S3 error: {error_code}")

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# -----------------------------------------------------------------------------
# GET /jobs/{job_id}/output  -> presigned URL for output artifact
# -----------------------------------------------------------------------------
@router.get("/{job_id}/output")
def get_job_output(job_id: str):
    """
    Return a pre-signed URL for the job's output artifact
    (e.g. annotated video or placeholder text file).

    Worker stores the output key in DynamoDB as `s3KeyOutput`.
    """
    item = get_job(job_id)

    status = item.get("status", "UNKNOWN")
    if status != "COMPLETED":
        raise HTTPException(
            status_code=409,
            detail=f"Job not completed yet (status={status})",
        )

    output_key = item.get("s3KeyOutput")
    if not output_key:
        raise HTTPException(status_code=404, detail="No output file for this job")

    try:
        url = s3.generate_presigned_url(
            "get_object",
            Params={"Bucket": BUCKET, "Key": output_key},
            ExpiresIn=3600,  # 1 hour
        )
    except ClientError as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate URL: {e}")

    return {"jobId": job_id, "outputUrl": url}
