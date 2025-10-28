# -----------------------------------------------------------
# ScoutAI Worker
# -----------------------------------------------------------
# This script runs continuously in the background.
# It listens to the SQS job queue, retrieves one job at a time,
# performs the required processing (dummy work for now),
# uploads the results to S3, and updates DynamoDB to mark
# the job as completed.
# -----------------------------------------------------------

import os, json, time, uuid
from datetime import datetime, timezone

import boto3
from botocore.exceptions import ClientError

# ----------------------------
# Environment configuration
# ----------------------------
# Read the AWS resource configuration from environment variables.
# This allows the worker to be portable between local runs,
# Docker containers, and Kubernetes pods.
REGION    = os.getenv("AWS_REGION", "eu-central-1")
QUEUE_URL = os.environ["SQS_JOBS_URL"]          # SQS queue that holds job messages
BUCKET    = os.environ["S3_BUCKET"]             # S3 bucket for inputs/outputs
JOBS_TABLE= os.environ["JOBS_TABLE"]            # DynamoDB table tracking job statuses

# ----------------------------
# Initialize AWS service clients
# ----------------------------
# These boto3 clients allow the worker to interact with
# SQS (message queue), S3 (file storage), and DynamoDB (NoSQL DB).
sqs = boto3.client("sqs", region_name=REGION)
s3  = boto3.client("s3", region_name=REGION)
ddb = boto3.resource("dynamodb", region_name=REGION).Table(JOBS_TABLE)

# ----------------------------
# Utility: current UTC timestamp in ISO 8601 format
# ----------------------------
def now_iso():
    return datetime.now(timezone.utc).isoformat()

# ----------------------------
# Update job status in DynamoDB
# ----------------------------
def update_status(job_id, status, extra=None):
    # DynamoDB uses an UpdateExpression to modify existing attributes
    expr = "SET #s=:s, updatedAt=:u"
    names = {"#s": "status"}  # status is reserved keyword, so we alias it
    vals  = {":s": status, ":u": now_iso()}

    # If additional fields (extra) are provided, append them dynamically
    if extra:
        for k, v in extra.items():
            expr += f", {k} = :{k}"
            vals[f":{k}"] = v

    # Perform the atomic update on the DynamoDB item
    ddb.update_item(
        Key={"jobId": job_id},
        UpdateExpression=expr,
        ExpressionAttributeNames=names,
        ExpressionAttributeValues=vals
    )

# ----------------------------
# Process one job from the queue
# ----------------------------
def process(job):
    job_id    = job["jobId"]
    s3_key_in = job.get("s3KeyInput", "uploads/sample.mp4")

    # 1️⃣ Mark job as "PROCESSING" in DynamoDB
    try:
        update_status(job_id, "PROCESSING")
    except ClientError as e:
        print("WARN: could not mark PROCESSING:", e)

    # 2️⃣ Simulate processing time (replace with YOLO inference later)
    time.sleep(2)

    # 3️⃣ Create dummy output data (to be replaced with real results)
    metrics = {
        "jobId": job_id,
        "summary": {"playersDetected": 0, "frames": 0},  # placeholder stats
        "generatedAt": now_iso()
    }

    # Define output file paths in S3
    metrics_key = f"metrics/{job_id}.json"  # metrics JSON file
    output_key  = f"outputs/{job_id}.txt"   # placeholder for annotated video

    # 4️⃣ Upload the results to S3
    s3.put_object(Bucket=BUCKET, Key=metrics_key, Body=json.dumps(metrics).encode("utf-8"))
    s3.put_object(Bucket=BUCKET, Key=output_key,  Body=b"placeholder output")

    # 5️⃣ Mark job as COMPLETED and store output paths in DynamoDB
    update_status(
        job_id,
        "COMPLETED",
        extra={"metricsKey": metrics_key, "s3KeyOutput": output_key}
    )

# ----------------------------
# Main event loop
# ----------------------------
def main():
    print("Worker started. Listening to queue:", QUEUE_URL)

    # This infinite loop constantly polls the queue for new messages
    while True:
        # Receive one message at a time, waiting up to 20s for long polling
        resp = sqs.receive_message(
            QueueUrl=QUEUE_URL,
            MaxNumberOfMessages=1,
            WaitTimeSeconds=20,   # reduces empty responses and cost
            VisibilityTimeout=300 # other workers can’t see this msg for 5 mins
        )

        # If no messages are returned, go back to the start of the loop
        if "Messages" not in resp:
            continue

        # Extract the message body and receipt handle (needed to delete it)
        msg = resp["Messages"][0]
        receipt = msg["ReceiptHandle"]
        job = json.loads(msg["Body"])

        # 6️⃣ Process the job safely
        try:
            process(job)
            # Delete the message only if processing succeeded
            sqs.delete_message(QueueUrl=QUEUE_URL, ReceiptHandle=receipt)
        except Exception as e:
            print("ERROR processing job:", e)
            # If processing fails, message isn’t deleted.
            # SQS will re-deliver it after the VisibilityTimeout,
            # and eventually move it to the DLQ after maxReceiveCount.
        
        # Tiny sleep to avoid tight looping when queue is empty
        time.sleep(1)

# ----------------------------
# Entry point
# ----------------------------
if __name__ == "__main__":
    main()
