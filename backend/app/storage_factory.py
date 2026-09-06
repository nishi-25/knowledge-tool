import uuid
from pathlib import Path

from .config import LOCAL_ROOT, is_within_browse_root
from .storage.local_file import LocalFileStorage
from .storage.s3 import S3Storage
from .storage.box import BoxStorage
from .storage.gdrive import GDriveStorage
from .storage.sharepoint import SharePointStorage, resolve_site_id

SECRET_FIELDS = {"awsSecretAccessKey", "boxClientSecret", "gdriveServiceAccountJson", "spoClientSecret"}


def mask_storage_config(config: dict) -> dict:
    masked = dict(config)
    for field in SECRET_FIELDS:
        if masked.get(field):
            masked[field] = True  # 「設定済み」を示す真偽値のみ返し、値自体は返さない
    return masked


def resolved_local_path(config: dict, project_id: str) -> str:
    if config.get("dataRoot") == "browse" and config.get("dataPath"):
        return str(Path(config["dataPath"]) / "kv-project" / project_id)
    return str(LOCAL_ROOT / "projects" / project_id)


def build_adapter(config: dict, project_id: str, kind: str):
    provider = config.get("provider", "local")
    name_prefix = f"{project_id}-{kind}-"

    if provider == "local":
        if config.get("dataRoot") == "browse" and config.get("dataPath"):
            target = Path(config["dataPath"])
            if not is_within_browse_root(target):
                raise ValueError("許可されていないパスです")
            base = target / "kv-project" / project_id
        else:
            base = LOCAL_ROOT / "projects" / project_id
        return LocalFileStorage(base / kind)

    if provider == "aws":
        if not config.get("awsAccessKeyId") or not config.get("awsSecretAccessKey") or not config.get("awsBucket"):
            raise ValueError("AWSのアクセスキー・シークレットキー・バケット名を入力してください")
        return S3Storage(
            access_key_id=config.get("awsAccessKeyId", ""),
            secret_access_key=config.get("awsSecretAccessKey", ""),
            region=config.get("awsRegion", ""),
            bucket=config.get("awsBucket", ""),
            prefix=f"{(config.get('awsPrefix') or 'knowledge-tool').strip('/')}/{project_id}/{kind}",
        )

    if provider == "box":
        if not config.get("boxClientId") or not config.get("boxClientSecret") or not config.get("boxEnterpriseId") or not config.get("boxFolderId"):
            raise ValueError("BoxのClient ID・Client Secret・Enterprise ID・フォルダIDを入力してください")
        return BoxStorage(
            client_id=config.get("boxClientId", ""),
            client_secret=config.get("boxClientSecret", ""),
            enterprise_id=config.get("boxEnterpriseId", ""),
            folder_id=config.get("boxFolderId", ""),
            name_prefix=name_prefix,
        )

    if provider == "gdrive":
        if not config.get("gdriveServiceAccountJson") or not config.get("gdriveFolderId"):
            raise ValueError("Googleサービスアカウントの鍵（JSON）とフォルダIDを入力してください")
        return GDriveStorage(
            service_account_json=config.get("gdriveServiceAccountJson", ""),
            folder_id=config.get("gdriveFolderId", ""),
            name_prefix=name_prefix,
        )

    if provider == "spo":
        if not config.get("spoTenantId") or not config.get("spoClientId") or not config.get("spoClientSecret") or not config.get("spoSiteId"):
            raise ValueError("SharePointのテナントID・Client ID・Client Secret・サイトIDを入力してください")
        return SharePointStorage(
            tenant_id=config.get("spoTenantId", ""),
            client_id=config.get("spoClientId", ""),
            client_secret=config.get("spoClientSecret", ""),
            site_id=config.get("spoSiteId", ""),
            folder_path=config.get("spoFolderPath") or "",
            name_prefix=name_prefix,
        )

    raise ValueError(f"未知の保存先です: {provider}")


def test_storage_config(config: dict) -> tuple[bool, str, dict]:
    """保存先の設定で実際に書き込み・読み込み・削除ができるか検証する。

    戻り値: (成功したか, メッセージ, 解決済みconfig（SharePointのsiteId解決結果などを含む）)
    """
    working_config = dict(config)
    try:
        if working_config.get("provider") == "spo" and not working_config.get("spoSiteId") and working_config.get("spoSiteUrl"):
            working_config["spoSiteId"] = resolve_site_id(
                working_config.get("spoTenantId", ""),
                working_config.get("spoClientId", ""),
                working_config.get("spoClientSecret", ""),
                working_config["spoSiteUrl"],
            )

        adapter = build_adapter(working_config, project_id="_connection_test", kind="ping")
        test_id = f"ping-{uuid.uuid4().hex[:8]}"
        adapter.write(test_id, {"ping": "pong"})
        readback = adapter.read(test_id)
        adapter.delete(test_id)

        if readback and readback.get("ping") == "pong":
            extra = ""
            if working_config.get("provider") == "spo" and working_config.get("spoSiteId"):
                extra = f"（サイトID: {working_config['spoSiteId']}）"
            elif working_config.get("provider") == "local":
                extra = f"（保存先: {resolved_local_path(working_config, '_connection_test')}）"
            return True, f"接続に成功しました。書き込み・読み込み・削除を確認できました。{extra}", working_config
        return False, "書き込んだデータを正しく読み込めませんでした。", working_config
    except ValueError as e:
        return False, str(e), working_config
    except Exception as e:
        return False, f"接続に失敗しました: {e}", working_config
