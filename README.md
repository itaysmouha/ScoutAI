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
                         │  scoutai-itaysmouha-media     │
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

## Run locally

You need Python 3.12+, Node 20+, Terraform 1.5+ and AWS CLI v2.

1. **Sign in to AWS** as your IAM user, not root:
   ```sh
   aws login --region eu-central-1
   ```
   `aws login` reuses whoever the browser is signed in as. If that's root, open the link it prints in a private window instead.
2. **Create the infrastructure.** Do this once per AWS account; skip it if the resources already exist.
   ```sh
   terraform -chdir=infra init && terraform -chdir=infra apply
   ```
   The state is kept locally in `infra/terraform.tfstate`, so don't delete it.
3. **Add the app profile.** The API and worker run as the `scoutai-app` role, which can only touch ScoutAI's resources. Add this to `~/.aws/config`, replacing `<account-id>`:
   ```ini
   [profile scoutai-app]
   role_arn = arn:aws:iam::<account-id>:role/scoutai-app
   source_profile = default
   region = eu-central-1
   ```
4. **Create the env files** with your account ID filled in:
   ```sh
   ACCT=$(aws sts get-caller-identity --query Account --output text)
   for s in api worker; do sed "s/<account-id>/$ACCT/" services/$s/.env.example > services/$s/.env; done
   ```
5. **Install, then run each service in its own terminal:**
   ```sh
   make install
   make api      # http://127.0.0.1:8000/docs
   make worker
   make web      # http://localhost:5173
   ```

Upload a short `.mp4` on the Upload page. The job should go from PENDING to COMPLETED within a few seconds; the analysis is still a stub.
