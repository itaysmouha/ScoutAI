import json
import os

import pytest


def put_job(aws, job_id="job-1", status="COMPLETED", **extra):
    aws.table.put_item(Item={
        "jobId": job_id,
        "userId": "user-42",
        "status": status,
        "s3KeyInput": "uploads/a.mp4",
        "createdAt": "2026-11-28T00:00:00+00:00",
        **extra,
    })


def test_create_job_stores_pending_job_and_enqueues_it(client, aws):
    res = client.post("/jobs", json={"s3_key_input": "uploads/a.mp4", "match_id": "m-1"})

    assert res.status_code == 201
    job = res.json()
    assert job["status"] == "PENDING"
    assert job["matchId"] == "m-1"
    assert aws.table.get_item(Key={"jobId": job["jobId"]})["Item"]["status"] == "PENDING"
    messages = aws.sqs.receive_message(QueueUrl=os.environ["SQS_JOBS_URL"])["Messages"]
    assert json.loads(messages[0]["Body"]) == {"jobId": job["jobId"], "s3KeyInput": "uploads/a.mp4"}


def test_list_jobs_filters_by_user_newest_first(client, aws):
    put_job(aws, "job-old", createdAt="2026-01-01T00:00:00+00:00")
    put_job(aws, "job-new", createdAt="2026-02-01T00:00:00+00:00")
    put_job(aws, "job-other", userId="someone-else")

    res = client.get("/jobs", params={"userId": "user-42"})

    assert [j["jobId"] for j in res.json()] == ["job-new", "job-old"]


def test_list_jobs_pages_through_scan(client, aws, monkeypatch):
    from services.api.routers import jobs

    for i in range(3):
        put_job(aws, f"job-{i}")
    scan = jobs.ddb.scan
    monkeypatch.setattr(jobs.ddb, "scan", lambda **kw: scan(Limit=1, **kw))  # one item per page

    assert len(client.get("/jobs").json()) == 3


def test_get_job(client, aws):
    put_job(aws)

    res = client.get("/jobs/job-1")

    assert res.status_code == 200
    assert res.json()["jobId"] == "job-1"


def test_get_missing_job_returns_404(client):
    assert client.get("/jobs/nope").status_code == 404


def test_metrics_returns_json_from_s3(client, aws):
    put_job(aws, metricsKey="metrics/job-1.json")
    aws.s3.put_object(Bucket="test-bucket", Key="metrics/job-1.json", Body=json.dumps({"shots": 3}))

    res = client.get("/jobs/job-1/metrics")

    assert res.json() == {"jobId": "job-1", "metrics": {"shots": 3}}


def test_metrics_missing_from_s3_returns_404(client, aws):
    put_job(aws, metricsKey="metrics/job-1.json")

    assert client.get("/jobs/job-1/metrics").status_code == 404


def test_output_returns_presigned_get_url(client, aws):
    put_job(aws, s3KeyOutput="outputs/job-1.mp4")

    url = client.get("/jobs/job-1/output").json()["outputUrl"]

    assert url.startswith("https://test-bucket.s3.eu-central-1.amazonaws.com/outputs/job-1.mp4?")
    assert "X-Amz-Signature=" in url


@pytest.mark.parametrize("path", ["metrics", "output"])
def test_results_before_completion_return_409(client, aws, path):
    put_job(aws, status="PROCESSING", metricsKey="metrics/job-1.json", s3KeyOutput="outputs/job-1.mp4")

    assert client.get(f"/jobs/job-1/{path}").status_code == 409
