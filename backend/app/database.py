from datetime import datetime, timezone

from pydantic_settings import BaseSettings, SettingsConfigDict
from sqlalchemy import JSON, DateTime, String, create_engine
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, sessionmaker


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")
    database_url: str = "postgresql+psycopg://aivoa:aivoa@localhost:5432/aivoa"
    groq_api_key: str = ""
    groq_model: str = "llama-3.3-70b-versatile"
    ai_mode: str = "demo"
    frontend_origin: str = "http://localhost:5173"


settings = Settings()
engine = create_engine(settings.database_url, pool_pre_ping=True)
Session = sessionmaker(engine)


class Base(DeclarativeBase):
    pass


class Record(Base):
    __tablename__ = "complaints"
    id: Mapped[str] = mapped_column(String(40), primary_key=True)
    request_id: Mapped[str] = mapped_column(String(100), unique=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )
    status: Mapped[str] = mapped_column(String(40), default="Open")
    complaint: Mapped[dict] = mapped_column(JSON)
    assessment: Mapped[dict] = mapped_column(JSON)
    audit: Mapped[list] = mapped_column(JSON)
