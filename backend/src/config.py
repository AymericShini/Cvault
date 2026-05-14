from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
    )

    groq_api_key: str
    groq_model: str = "llama-3.3-70b-versatile"


# Single instance imported everywhere
settings = Settings()
