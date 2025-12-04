# -----------------------------------------------------------
# ScoutAI Worker
# -----------------------------------------------------------
# This script runs continuously in the background.
# It listens to the SQS job queue, retrieves one job at a time,
# calls the analysis pipeline, uploads the results to S3,
# and updates DynamoDB to mark the job as completed.
# -----------------------------------------------------------

import os, json, time
from datetime import datetime, timezone

import boto3
from botocore.exceptions import ClientError

from pipeline import run_yolo_pipeline_stub  # <-- NEW

# ----------------------------
# Environment configuration
# ----------------------------
REGION     = os.getenv("AWS_REGION", "eu-central-1")
QUEUE_URL  = os.environ["SQS_JOBS_URL"]   # SQS queue that holds job messages
BUCKET     = os.environ["S3_BUCKET"]      # S3 bucket for inputs/outputs
JOBS_TABLE = os.environ["JOBS_TABLE"]     # DynamoDB table tracking job statuses

# ----------------------------
# Initialize AWS service clients
# ----------------------------
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
    expr = "SET #s=:s, updatedAt=:u"
    names = {"#s": "status"}  # status is reserved keyword, so we alias it
    vals  = {":s": status, ":u": now_iso()}

    if extra:
        for k, v in extra.items():
            expr += f", {k} = :{k}"
            vals[f":{k}"] = v

    ddb.update_item(
        Key={"jobId": job_id},
        UpdateExpression=expr,
        ExpressionAttributeNames=names,
        ExpressionAttributeValues=vals,
    )

# ----------------------------
# Process one job from the queue
# ----------------------------
def process(job: dict):
    job_id    = job["jobId"]
    s3_key_in = job.get("s3KeyInput", "uploads/sample.mp4")

    # 1️⃣ Mark job as "PROCESSING" in DynamoDB
    try:
        update_status(job_id, "PROCESSING")
    except ClientError as e:
        print("WARN: could not mark PROCESSING:", e)

    # 2️⃣ Call the analysis pipeline (stub for now)
    try:
        metrics, output_bytes = run_yolo_pipeline_stub(
            job_id=job_id,
            s3_bucket=BUCKET,
            s3_key_input=s3_key_in,
        )
    except Exception as e:
        print("ERROR in pipeline:", e)
        update_status(job_id, "FAILED", extra={"error": str(e)})
        return

    # 3️⃣ Define S3 output keys
    metrics_key = f"metrics/{job_id}.json"  # metrics JSON file
    output_key  = f"outputs/{job_id}.txt"   # placeholder for annotated video

    # 4️⃣ Upload the results to S3
    try:
        s3.put_object(
            Bucket=BUCKET,
            Key=metrics_key,
            Body=json.dumps(metrics).encode("utf-8"),
            ContentType="application/json",
        )
        s3.put_object(
            Bucket=BUCKET,
            Key=output_key,
            Body=output_bytes,
            ContentType="text/plain",
        )
    except ClientError as e:
        print("ERROR uploading results to S3:", e)
        update_status(job_id, "FAILED", extra={"error": f"S3 upload failed: {e}"})
        return

    # 5️⃣ Mark job as COMPLETED and store output paths in DynamoDB
    update_status(
        job_id,
        "COMPLETED",
        extra={"metricsKey": metrics_key, "s3KeyOutput": output_key},
    )

# ----------------------------
# Main event loop
# ----------------------------
def main():
    print("Worker started. Listening to queue:", QUEUE_URL)

    while True:
        resp = sqs.receive_message(
            QueueUrl=QUEUE_URL,
            MaxNumberOfMessages=1,
            WaitTimeSeconds=20,   # long polling
            VisibilityTimeout=300 # hide from other workers for 5 mins
        )

        if "Messages" not in resp:
            continue

        msg = resp["Messages"][0]
        receipt = msg["ReceiptHandle"]
        job = json.loads(msg["Body"])

        try:
            process(job)
            sqs.delete_message(QueueUrl=QUEUE_URL, ReceiptHandle=receipt)
        except Exception as e:
            print("ERROR processing job:", e)
            # msg not deleted -> SQS will retry or send to DLQ

        time.sleep(1)  # avoid tight loop

# ----------------------------
# Entry point
# ----------------------------
if __name__ == "__main__":
    main()
