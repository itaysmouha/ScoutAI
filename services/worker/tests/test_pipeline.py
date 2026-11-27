import json

import pytest
from pydantic import ValidationError

from metrics_schema import Metrics
from pipeline import run_yolo_pipeline_stub


def test_stub_output_validates_against_metrics_model():
    metrics, _ = run_yolo_pipeline_stub("job-1", "bucket", "uploads/a.mp4")

    parsed = Metrics.model_validate(json.loads(json.dumps(metrics)))  # as stored in S3

    assert parsed.schemaVersion == 1
    assert parsed.jobId == "job-1"


@pytest.mark.parametrize("change", [{"schemaVersion": 2}, {"unknownField": 1}])
def test_metrics_model_rejects_other_versions_and_unknown_fields(change):
    metrics, _ = run_yolo_pipeline_stub("job-1", "bucket", "uploads/a.mp4")

    with pytest.raises(ValidationError):
        Metrics.model_validate({**metrics, **change})
