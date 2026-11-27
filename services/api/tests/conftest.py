import os
from types import SimpleNamespace

import boto3
import pytest
from fastapi.testclient import TestClient
from moto import mock_aws

# The routers read config and build their boto3 clients at import time, so this
# has to run before the app is imported. Fake credentials keep tests off real AWS.
REGION = "eu-central-1"
os.environ.pop("AWS_PROFILE", None)
os.environ.update(
    AWS_ACCESS_KEY_ID="testing",
    AWS_SECRET_ACCESS_KEY="testing",
    AWS_REGION=REGION,
    S3_BUCKET="test-bucket",
    JOBS_TABLE="test-jobs",
    SQS_JOBS_URL=f"https://sqs.{REGION}.amazonaws.com/123456789012/test-jobs",
    CORS_ORIGINS="http://allowed.example,http://also-allowed.example",
)


@pytest.fixture
def aws():
    """Fresh fake S3 bucket, DynamoDB table and SQS queue for each test."""
    with mock_aws():
        s3 = boto3.client("s3", region_name=REGION)
        s3.create_bucket(
            Bucket=os.environ["S3_BUCKET"],
            CreateBucketConfiguration={"LocationConstraint": REGION},
        )
        table = boto3.resource("dynamodb", region_name=REGION).create_table(
            TableName=os.environ["JOBS_TABLE"],
            KeySchema=[{"AttributeName": "jobId", "KeyType": "HASH"}],
            AttributeDefinitions=[{"AttributeName": "jobId", "AttributeType": "S"}],
            BillingMode="PAY_PER_REQUEST",
        )
        sqs = boto3.client("sqs", region_name=REGION)
        sqs.create_queue(QueueName="test-jobs")
        yield SimpleNamespace(s3=s3, table=table, sqs=sqs)


@pytest.fixture
def client(aws):
    from services.api.main import app

    return TestClient(app)
