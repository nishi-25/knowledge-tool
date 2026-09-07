from typing import Optional
from pydantic import BaseModel, Field


class Article(BaseModel):
    id: int
    title: str
    folder: Optional[str] = None
    tags: list[str] = Field(default_factory=list)
    updated: str
    views: int = 0
    favorite: bool = False
    excerpt: str = ""
    bodyHtml: str = ""


class ArticleIn(BaseModel):
    title: str
    folder: Optional[str] = None
    tags: list[str] = Field(default_factory=list)
    bodyHtml: str = ""


class Folder(BaseModel):
    id: str
    label: str
    icon: str
    color: str
    tint: str
    builtin: bool = False


class FolderIn(BaseModel):
    label: str


class Tag(BaseModel):
    label: str
    builtin: bool = False


class TagIn(BaseModel):
    label: str


class StorageConfig(BaseModel):
    provider: str  # local | aws | gdrive | spo | box
    # local
    dataRoot: Optional[str] = "local"  # local | browse
    dataPath: Optional[str] = None
    # AWS S3
    awsAccessKeyId: Optional[str] = None
    awsSecretAccessKey: Optional[str] = None
    awsRegion: Optional[str] = None
    awsBucket: Optional[str] = None
    awsPrefix: Optional[str] = None
    # Box
    boxClientId: Optional[str] = None
    boxClientSecret: Optional[str] = None
    boxEnterpriseId: Optional[str] = None
    boxFolderId: Optional[str] = None
    # Google ドライブ
    gdriveServiceAccountJson: Optional[str] = None
    gdriveFolderId: Optional[str] = None
    # SharePoint Online
    spoTenantId: Optional[str] = None
    spoClientId: Optional[str] = None
    spoClientSecret: Optional[str] = None
    spoSiteUrl: Optional[str] = None
    spoSiteId: Optional[str] = None
    spoFolderPath: Optional[str] = None


class ProjectCreateIn(BaseModel):
    name: str
    storageConfig: StorageConfig


class OrganizeIn(BaseModel):
    keywords: str


class Comment(BaseModel):
    id: str
    articleId: int
    author: str
    authorId: str
    text: str
    createdAt: str


class CommentIn(BaseModel):
    text: str


class SignupIn(BaseModel):
    email: str
    password: str
    displayName: str


class LoginIn(BaseModel):
    email: str
    password: str


class InviteRequestIn(BaseModel):
    pass


class AdminLoginIn(BaseModel):
    username: str
    password: str


class AdminSetupIn(BaseModel):
    username: str
    password: str
    setupToken: str


class AdminChangePasswordIn(BaseModel):
    currentPassword: str
    newPassword: str


class AdminCreateUserIn(BaseModel):
    email: str
    displayName: str
    password: str


class AdminLoginSettingsIn(BaseModel):
    loginEnabled: bool


class AdminMoveArticleIn(BaseModel):
    folder: Optional[str] = None


class AdminProjectUpdateIn(BaseModel):
    name: str
