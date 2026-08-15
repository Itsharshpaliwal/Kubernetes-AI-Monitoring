from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    insforge_base_url: str = ""
    insforge_api_key: str = ""
    openrouter_api_key: str = ""
    ai_model: str = "openrouter/free"

    model_config = SettingsConfigDict(
        env_file=".env",
        extra="ignore",
    )


settings = Settings()
