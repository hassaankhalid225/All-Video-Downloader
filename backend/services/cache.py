"""TTL metadata cache with per-key single-flight.

Extraction is the expensive part of every request (0.5–6 s, and it hits the platform's
servers). Two things matter:

* **TTL** — signed CDN URLs inside the extraction expire, so a long-lived cache would hand
  out dead links. Default 5 minutes.
* **Single-flight** — when a link is shared and twenty people paste it at once, exactly one
  extraction should run. Without the per-key lock, twenty concurrent misses become twenty
  yt-dlp processes and a platform-side rate limit.
"""

from __future__ import annotations

import asyncio
from typing import Any, Awaitable, Callable, TypeVar

from cachetools import TTLCache

from config import settings

T = TypeVar("T")


class MetadataCache:
    def __init__(self, maxsize: int | None = None, ttl: int | None = None) -> None:
        self._cache: TTLCache[str, Any] = TTLCache(
            maxsize=maxsize or settings.cache_max_entries,
            ttl=ttl or settings.cache_ttl_seconds,
        )
        self._locks: dict[str, asyncio.Lock] = {}
        self._guard = asyncio.Lock()
        self.hits = 0
        self.misses = 0

    def get(self, key: str) -> Any | None:
        try:
            value = self._cache[key]
        except KeyError:
            return None
        return value

    def set(self, key: str, value: Any) -> None:
        self._cache[key] = value

    def invalidate(self, key: str) -> None:
        self._cache.pop(key, None)

    def clear(self) -> None:
        self._cache.clear()

    @property
    def size(self) -> int:
        return len(self._cache)

    def stats(self) -> dict[str, int]:
        return {
            "entries": len(self._cache),
            "maxsize": self._cache.maxsize,
            "hits": self.hits,
            "misses": self.misses,
        }

    async def _lock_for(self, key: str) -> asyncio.Lock:
        async with self._guard:
            lock = self._locks.get(key)
            if lock is None:
                lock = asyncio.Lock()
                self._locks[key] = lock
            return lock

    async def _release_lock(self, key: str) -> None:
        async with self._guard:
            lock = self._locks.get(key)
            # Only drop the lock once nobody is queued behind it, otherwise a waiter
            # would acquire a lock object that is no longer the canonical one.
            if lock is not None and not lock.locked():
                self._locks.pop(key, None)

    async def get_or_set(self, key: str, factory: Callable[[], Awaitable[T]]) -> T:
        """Return the cached value, or run ``factory`` exactly once across callers.

        Failures are not cached: a transient platform error should not poison the key for
        the full TTL.
        """
        cached = self.get(key)
        if cached is not None:
            self.hits += 1
            return cached

        lock = await self._lock_for(key)
        async with lock:
            # A queued caller may have been unblocked by the winner's write.
            cached = self.get(key)
            if cached is not None:
                self.hits += 1
                return cached

            self.misses += 1
            try:
                value = await factory()
            finally:
                await self._release_lock(key)

            self.set(key, value)
            return value


metadata_cache = MetadataCache()
