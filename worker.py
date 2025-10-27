import os, json, time, uuid
from datetime import datetime, timezone

import boto3
from botocore.exceptions import ClientError

REGION   = os.getenv("AWS_REGION", "eu-central-1")
QUEUE_URL = os.environ["SQS_JOBS_URL"]          # e.g. https://sqs.eu-central-1.../ScoutAI-Jobs
BUCKET    = os.environ["S3_BUCKET"]             # e.g. scoutai-itaysmouha
JOBS_TABLE= os.environ["JOBS_TABLE"]            # e.g. ScoutAI-Jobs

sqs = boto3.client("sqs", region_name=REGION)
s3  = boto3.client("s3", region_name=REGION)
ddb = boto3.resource("dynamodb", region_name=REGION).Table(JOBS_TABLE)

def now_iso():
    return datetime.now(timezone.utc).isoformat()

def update_status(job_id, status, extra=None):
    expr = "SET #s=:s, updatedAt=:u"
    names = {"#s":"status"}
    vals  = {":s": status, ":u": now_iso()}
    if extra:
        for k,v in extra.items():
            expr += f", {k} = :{k}"
            vals[f":{k}"] = v
    ddb.update_item(
        Key={"jobId": job_id},
        UpdateExpression=expr,
        ExpressionAttributeNames=names,
        ExpressionAttributeValues=vals
    )

def process(job):
    job_id      = job["jobId"]
    s3_key_in   = job.get("s3KeyInput", "uploads/sample.mp4")

    # mark processing
    try:
        update_status(job_id, "PROCESSING")
    except ClientError as e:
        print("WARN: could not mark PROCESSING:", e)

    # --- pretend work (replace with YOLO later) ---
    time.sleep(2)
    metrics = {
        "jobId": job_id,
        "summary": {"playersDetected": 0, "frames": 0},
        "generatedAt": now_iso()
    }
    metrics_key  = f"metrics/{job_id}.json"
    output_key   = f"outputs/{job_id}.txt"  # placeholder “annotated video”; replace later

    s3.put_object(Bucket=BUCKET, Key=metrics_key, Body=json.dumps(metrics).encode("utf-8"))
    s3.put_object(Bucket=BUCKET, Key=output_key,  Body=b"placeholder output")

    update_status(job_id, "COMPLETED",
                  extra={"metricsKey": metrics_key, "s3KeyOutput": output_key})

def main():
    print("Worker started. Queue:", QUEUE_URL)
    while True:
        resp = sqs.receive_message(
            QueueUrl=QUEUE_URL,
            MaxNumberOfMessages=1,
            WaitTimeSeconds=20,
            VisibilityTimeout=300
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
            # Let SQS re-deliver (DLQ after maxReceiveCount)
        # small pause to avoid tight loop when empty
        time.sleep(1)

if __name__ == "__main__":
    main()
