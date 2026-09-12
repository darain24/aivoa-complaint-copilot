from app.database import Settings


def test_neon_url_uses_installed_psycopg_driver():
    for scheme in ("postgresql://", "postgres://"):
        supplied = scheme + "user:password@example.neon.tech/db?sslmode=require"
        config = Settings(database_url=supplied, _env_file=None)
        assert (
            config.database_url
            == "postgresql+psycopg://user:password@example.neon.tech/db?sslmode=require"
        )


def test_explicit_driver_url_is_preserved():
    supplied = "postgresql+psycopg://user:password@localhost:5433/db"
    assert Settings(database_url=supplied, _env_file=None).database_url == supplied
