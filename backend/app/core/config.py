import os
from pydantic import Field, AliasChoices
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    supabase_url: str = Field("", validation_alias=AliasChoices("SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_URL"))
    supabase_service_key: str = Field("", validation_alias=AliasChoices("SUPABASE_SERVICE_KEY"))
    supabase_anon_key: str = Field("", validation_alias=AliasChoices("SUPABASE_ANON_KEY", "NEXT_PUBLIC_SUPABASE_ANON_KEY"))
    gemini_api_key: str = ""
    gmail_client_id: str = ""
    gmail_client_secret: str = ""
    gmail_redirect_uri: str = "http://localhost:8000/api/gmail/callback"
    frontend_url: str = "http://localhost:3000"
    secret_key: str = "changeme-use-strong-secret-in-production"


settings = Settings()
