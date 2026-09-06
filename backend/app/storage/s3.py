import json
from typing import Any, Optional

import boto3
from botocore.config import Config
from botocore.exceptions import ClientError

from .base import StorageAdapter


class S3Storage(StorageAdapter):
    """AWS S3 バケットに1アイテム=1オブジェクト（JSON）として保存するアダプター。"""

    def __init__(self, access_key_id: str, secret_access_key: str, region: str, bucket: str, prefix: str):
        self.bucket = bucket
        self.prefix = prefix.strip("/")
        self._client = boto3.client(
            "s3",
            region_name=region or "us-east-1",
            aws_access_key_id=access_key_id,
            aws_secret_access_key=secret_access_key,
            config=Config(signature_version="s3v4"),
        )

    def _key(self, item_id: str) -> str:
        return f"{self.prefix}/{item_id}.json" if self.prefix else f"{item_id}.json"

    def list(self) -> list[dict[str, Any]]:
        items = []
        prefix = f"{self.prefix}/" if self.prefix else ""
        paginator = self._client.get_paginator("list_objects_v2")
        for page in paginator.paginate(Bucket=self.bucket, Prefix=prefix):
            for obj in page.get("Contents", []):
                if not obj["Key"].endswith(".json"):
                    continue
                body = self._client.get_object(Bucket=self.bucket, Key=obj["Key"])["Body"].read()
                items.append(json.loads(body))
        return items

    def read(self, item_id: str) -> Optional[dict[str, Any]]:
        try:
            body = self._client.get_object(Bucket=self.bucket, Key=self._key(item_id))["Body"].read()
        except ClientError as e:
            if e.response.get("Error", {}).get("Code") in ("NoSuchKey", "404"):
                return None
            raise
        return json.loads(body)

    def write(self, item_id: str, data: dict[str, Any]) -> None:
        self._client.put_object(
            Bucket=self.bucket,
            Key=self._key(item_id),
            Body=json.dumps(data, ensure_ascii=False, indent=2).encode("utf-8"),
            ContentType="application/json",
        )

    def delete(self, item_id: str) -> None:
        self._client.delete_object(Bucket=self.bucket, Key=self._key(item_id))
