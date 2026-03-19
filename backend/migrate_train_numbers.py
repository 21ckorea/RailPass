import asyncio
from app.core.database import engine
from sqlalchemy import text

async def migrate():
    async with engine.begin() as conn:
        await conn.execute(text('ALTER TABLE reservation_jobs ADD COLUMN IF NOT EXISTS train_numbers JSON'))
        print("Migration successful: Added train_numbers column")

if __name__ == "__main__":
    asyncio.run(migrate())
