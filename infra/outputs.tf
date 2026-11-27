# Values for the API and worker environment variables
output "s3_bucket" {
  value = aws_s3_bucket.media.id
}

output "jobs_table" {
  value = aws_dynamodb_table.jobs.name
}

output "sqs_jobs_url" {
  value = aws_sqs_queue.jobs.url
}

output "app_role_arn" {
  value = aws_iam_role.app.arn
}
