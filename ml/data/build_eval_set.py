"""Build the eval set (#22): copy chosen SoccerNet GSR-2025 test clips to S3.

Reads only the needed members of the remote test.zip (8.9 GB) with HTTP Range
requests, so nothing is written to local disk. The S3 layout matches SoccerNet's:

    datasets/eval/<clip>/Labels-GameState.json
    datasets/eval/<clip>/img1/000001.jpg ... 000750.jpg

Usage:
    AWS_PROFILE=scoutai-app S3_BUCKET=scoutai-itaysmouha-media python ml/data/build_eval_set.py

SoccerNet data is for non-commercial research only: keep it in the private
bucket and never commit it to this repo (decision in #21).
"""

import io
import os
import urllib.request
import zipfile
from concurrent.futures import ThreadPoolExecutor

import boto3

ZIP_URL = "https://huggingface.co/datasets/SoccerNet/SN-GSR-2025/resolve/main/test.zip"
PREFIX = "datasets/eval"
# Two clips from each test-split game (7, 8, 11); none of these games appear in
# train or valid. A mix of set pieces and open play.
CLIPS = ["SNGS-116", "SNGS-123", "SNGS-138", "SNGS-148", "SNGS-190", "SNGS-194"]


class HttpFile(io.RawIOBase):
    """Seekable read-only file over HTTP Range requests."""

    def __init__(self, url):
        with urllib.request.urlopen(urllib.request.Request(url, method="HEAD")) as r:
            self.url = r.url  # the redirected CDN URL
            self.size = int(r.headers["Content-Length"])
        self.pos = 0

    def readable(self):
        return True

    def seekable(self):
        return True

    def tell(self):
        return self.pos

    def seek(self, offset, whence=io.SEEK_SET):
        self.pos = {io.SEEK_SET: 0, io.SEEK_CUR: self.pos, io.SEEK_END: self.size}[
            whence
        ] + offset
        return self.pos

    def readinto(self, b):
        n = min(len(b), self.size - self.pos)
        if n <= 0:
            return 0
        headers = {"Range": f"bytes={self.pos}-{self.pos + n - 1}"}
        with urllib.request.urlopen(
            urllib.request.Request(self.url, headers=headers)
        ) as r:
            data = r.read()
        b[: len(data)] = data
        self.pos += len(data)
        return len(data)


def main():
    s3 = boto3.client("s3")
    bucket = os.environ["S3_BUCKET"]
    # A large buffer turns the clip's many small, in-order member reads into a few big requests.
    zf = zipfile.ZipFile(io.BufferedReader(HttpFile(ZIP_URL), buffer_size=64 << 20))
    with ThreadPoolExecutor(16) as pool:
        for clip in CLIPS:
            members = sorted(
                (
                    i
                    for i in zf.infolist()
                    if i.filename.startswith(f"{clip}/") and not i.is_dir()
                ),
                key=lambda i: i.header_offset,
            )
            if not members:
                raise SystemExit(f"{clip} not found in {ZIP_URL}")
            uploads = [
                pool.submit(
                    s3.put_object,
                    Bucket=bucket,
                    Key=f"{PREFIX}/{m.filename}",
                    Body=zf.read(m),
                )
                for m in members
            ]
            for u in uploads:
                u.result()
            print(f"{clip}: {len(members)} files -> s3://{bucket}/{PREFIX}/{clip}/")


if __name__ == "__main__":
    main()
