import os
import asyncio
import requests
from typing import List, Dict

PEXELS_API_KEY = os.getenv("PEXELS_API_KEY", "")
UNSPLASH_ACCESS_KEY = os.getenv("UNSPLASH_ACCESS_KEY", "")


async def fetch_media(keywords: List[str]) -> List[Dict]:
    all_tasks = []
    for kw in keywords[:3]:
        all_tasks.append(fetch_pexels(kw))
        all_tasks.append(fetch_unsplash(kw))

    results = await asyncio.gather(*all_tasks, return_exceptions=True)

    media = []
    for result in results:
        if isinstance(result, list):
            media.extend(result)

    seen = set()
    unique = []
    for m in media:
        if m["url"] not in seen:
            seen.add(m["url"])
            unique.append(m)

    return unique


async def fetch_pexels(keyword: str) -> List[Dict]:
    if not PEXELS_API_KEY:
        return []
    try:
        resp = requests.get(
            "https://api.pexels.com/videos/search",
            headers={"Authorization": PEXELS_API_KEY},
            params={"query": keyword, "per_page": 3, "orientation": "portrait"},
            timeout=10
        )
        data = resp.json()
        results = []
        for video in data.get("videos", []):
            file = video.get("video_files", [{}])[0]
            if file.get("link"):
                results.append({
                    "url": file["link"], "type": "video", "source": "pexels",
                    "duration": video.get("duration", 10),
                    "width": file.get("width", 1080), "height": file.get("height", 1920),
                })
        return results
    except Exception:
        return []


async def fetch_unsplash(keyword: str) -> List[Dict]:
    if not UNSPLASH_ACCESS_KEY:
        return []
    try:
        resp = requests.get(
            "https://api.unsplash.com/search/photos",
            headers={"Authorization": f"Client-ID {UNSPLASH_ACCESS_KEY}"},
            params={"query": keyword, "per_page": 3, "orientation": "portrait"},
            timeout=10
        )
        data = resp.json()
        results = []
        for photo in data.get("results", []):
            results.append({
                "url": photo["urls"]["raw"], "type": "image", "source": "unsplash",
                "duration": None,
                "width": photo.get("width", 1080), "height": photo.get("height", 1920),
            })
        return results
    except Exception:
        return []
