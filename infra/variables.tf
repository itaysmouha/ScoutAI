variable "region" {
  type    = string
  default = "eu-central-1"
}

variable "bucket_name" {
  type    = string
  default = "scoutai-itaysmouha-media" # "scoutai-itaysmouha" is still reserved after the old account's deletion
}

variable "cors_origins" {
  description = "Origins allowed to upload to the bucket from the browser"
  type        = list(string)
  default     = ["http://127.0.0.1:5173", "http://localhost:5173"]
}
