# ScoutAI

                         ┌──────────────────────────────┐
                         │          Frontend             │
                         │    (React + Vite App)         │
                         └──────────────┬───────────────┘
                                        │
                                        │ 1. Request presigned upload URL
                                        ▼
                         ┌──────────────────────────────┐
                         │         FastAPI API           │
                         │   /upload-url, /jobs, /jobs/id│
                         └──────────────┬───────────────┘
                                        │
                         2. Generate presigned S3 URL    │
                                        │
                                        ▼
                         ┌──────────────────────────────┐
                         │        AWS S3 Bucket          │
                         │  scoutai-itaysmouha           │
                         └──────────────┬───────────────┘
                                        │
                                        │ 3. Upload raw video directly
                                        │    via presigned URL (PUT)
                                        │
                                        ▼
                         ┌──────────────────────────────┐
                         │         FastAPI API           │
                         │ (POST /jobs after upload)     │
                         └──────────────┬───────────────┘
                                        │
                         4. Create job in DynamoDB       │
                                        │
                                        ▼
                         ┌──────────────────────────────┐
                         │       DynamoDB Table          │
                         │        ScoutAI-Jobs           │
                         │ jobId, status, s3KeyInput...  │
                         └──────────────┬───────────────┘
                                        │
                         5. Push job msg to SQS          │
                                        │
                                        ▼
      ┌──────────────────────────────┐  │   ┌──────────────────────────────┐
      │         SQS Queue            │◄─┘──►│      Worker (Python)         │
      │       ScoutAI-Jobs           │      │ worker.py                    │
      │  (with DLQ for failures)     │      │ polls SQS, processes job     │
      └──────────────────────────────┘      └──────────────┬───────────────┘
                                                           │
             6. Worker marks job PROCESSING                │
                                                           ▼
                                          ┌──────────────────────────────┐
                                          │         AWS S3 Bucket        │
                                          │       metrics/, outputs/     │
                                          └──────────────┬───────────────┘
                                                         │
             7. Worker writes: metrics JSON, output file │
                                                         │
                                                         ▼
                                          ┌──────────────────────────────┐
                                          │       DynamoDB Table         │
                                          │   Update job → COMPLETED     │
                                          │ metricsKey, s3KeyOutput      │
                                          └──────────────┬───────────────┘
                                                         │
                   8. Frontend polls /jobs/{id}          │
                                                         ▼
                                          ┌──────────────────────────────┐
                                          │          Frontend             │
                                          │ Shows status & results        │
                                          └──────────────────────────────┘
