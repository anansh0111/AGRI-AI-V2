"""
MongoDB connection manager.
Automatically falls back to in-memory storage if MongoDB is not running.
The app works fully without MongoDB installed.
"""
import os
import logging

logger = logging.getLogger(__name__)

_client = None
_db     = None


async def connect_db():
    global _client, _db
    uri     = os.getenv("MONGO_URI",      "mongodb://localhost:27017")
    db_name = os.getenv("MONGO_DB_NAME",  "precision_agriculture")
    try:
        import motor.motor_asyncio
        _client = motor.motor_asyncio.AsyncIOMotorClient(
            uri, serverSelectionTimeoutMS=3000
        )
        await _client.admin.command("ping")
        _db = _client[db_name]
        await _db.predictions.create_index([("timestamp", -1)])
        await _db.alerts.create_index([("timestamp", -1)])
        logger.info(f"Connected to MongoDB: {db_name}")
    except Exception as e:
        logger.warning(f"MongoDB not available ({e}). Using in-memory storage.")
        _db = InMemoryDB()


async def close_db():
    global _client
    if _client:
        _client.close()


def get_db():
    if _db is None:
        raise RuntimeError("Database not initialized. Call connect_db() first.")
    return _db


# ── In-memory fallback (works without MongoDB installed) ──────────────────────

class InMemoryCollection:
    def __init__(self):
        self._data    = []
        self._counter = 0

    async def insert_one(self, doc: dict):
        self._counter += 1
        saved = {**doc, "_id": str(self._counter)}
        self._data.append(saved)

        class Result:
            inserted_id = str(self._counter)
        return Result()

    def find(self, query=None, projection=None):
        return InMemoryCursor(list(reversed(self._data)))

    async def find_one(self, query=None, projection=None):
        if query and "username" in query:
            val = query["username"]
            return next((d for d in self._data if d.get("username") == val), None)
        return self._data[-1] if self._data else None

    async def count_documents(self, query=None):
        return len(self._data)

    async def update_one(self, query, update):
        pass  # no-op for in-memory

    async def create_index(self, *args, **kwargs):
        pass  # no-op for in-memory


class InMemoryCursor:
    def __init__(self, data):
        self._data    = data
        self._skip_n  = 0
        self._limit_n = 100

    def sort(self, *args, **kwargs):
        return self

    def skip(self, n):
        self._skip_n = n
        return self

    def limit(self, n):
        self._limit_n = n
        return self

    async def to_list(self, length=None):
        result = self._data[self._skip_n:]
        return result[:self._limit_n]


class InMemoryDB:
    def __init__(self):
        self.predictions  = InMemoryCollection()
        self.alerts       = InMemoryCollection()
        self.sensor_data  = InMemoryCollection()
        self.images       = InMemoryCollection()
        self.users        = InMemoryCollection()
        self.model_health = InMemoryCollection()
