# pipeline.py
"""
Phase 1: YOLO pipeline skeleton.

Later this module will:
  - download the video from S3 (or receive a local path),
  - run YOLOv8 detection + tracking,
  - compute football-specific metrics,
  - generate an annotated video.

For now it just returns dummy metrics + a placeholder output.
"""

from datetime import datetime, timezone
from typing import Dict, Tuple


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def run_yolo_pipeline_stub(
    job_id: str,
    s3_bucket: str,
    s3_key_input: str,
) -> Tuple[Dict, bytes]:
    """
    Phase 1 stub for the YOLO pipeline.

    Args:
        job_id: The job identifier from DynamoDB/SQS.
        s3_bucket: Name of the input bucket.
        s3_key_input: S3 key of the input video.

    Returns:
        metrics: dict that matches what the frontend expects.
        output_bytes: binary content for the “annotated” output.
    """

    # later:
    # 1. Download from S3 to /tmp/job-{job_id}.mp4
    # 2. Run YOLOv8 inference + tracking
    # 3. Generate metrics + annotated video
    # 4. Return (metrics_dict, annotated_video_bytes)

    metrics = {
        "jobId": job_id,
        "generatedAt": now_iso(),
        "summary": {
            "playersDetected": 22,
            "frames": 3450,
            "durationSeconds": 115.0,
        },
        "teams": {
            "home": {
                "name": "Home FC",
                "shots": 5,
                "xg": 0.9,
                "possessionPercent": 54,
            },
            "away": {
                "name": "Away United",
                "shots": 3,
                "xg": 0.6,
                "possessionPercent": 46,
            },
        },
        "topPlayers": [
            {
                "name": "Player 10",
                "distanceKm": 1.8,
                "topSpeedKmh": 28.4,
                "touches": 24,
            },
            {
                "name": "Player 8",
                "distanceKm": 1.4,
                "topSpeedKmh": 27.1,
                "touches": 18,
            },
        ],
    }

    # For now just a text placeholder; later this will be actual video bytes
    output_bytes = f"Placeholder output for job {job_id}\nInput: s3://{s3_bucket}/{s3_key_input}\n".encode(
        "utf-8"
    )

    return metrics, output_bytes
