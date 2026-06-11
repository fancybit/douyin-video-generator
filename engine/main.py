import os
import re
import json
import logging
from datetime import datetime
from pathlib import Path

from dotenv import load_dotenv
load_dotenv()

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from supabase import create_client, Client

from pipeline.script import generate_script
from pipeline.voice import synthesize_voice
from pipeline.media import fetch_media
from pipeline.compose import compose_scenes
from pipeline.subtitle import generate_subtitle
from pipeline.export import export_video

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="Douyin Video Engine")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

supabase: Client = create_client(
    os.getenv("SUPABASE_URL", ""),
    os.getenv("SUPABASE_SERVICE_ROLE_KEY", "")
)

WORK_DIR = Path(__file__).parent / "workspace"
WORK_DIR.mkdir(exist_ok=True)


class GenerateRequest(BaseModel):
    task_id: str
    title: str
    keywords: str = ""


@app.post("/generate")
async def generate_video(req: GenerateRequest):
    task_id = req.task_id
    title = req.title
    keywords_raw = req.keywords or ""

    # 解析关键词：支持逗号/空格/换行分隔
    keywords = [k.strip() for k in re.split(r'[,，\s\n]+', keywords_raw) if k.strip()]
    if not keywords:
        keywords = [title]

    supabase.table("tasks").update({"status": "processing", "progress": 5}).eq("id", task_id).execute()

    try:
        video_url = await run_pipeline(task_id, title, keywords)
        return {"status": "completed", "task_id": task_id, "video_url": video_url}
    except Exception as e:
        logger.error(f"[{task_id}] Failed: {e}")
        supabase.table("tasks").update({
            "status": "failed",
            "error_message": str(e)
        }).eq("id", task_id).execute()
        raise HTTPException(status_code=500, detail=str(e))


async def update_progress(task_id: str, progress: int):
    supabase.table("tasks").update({"progress": progress}).eq("id", task_id).execute()


async def run_pipeline(task_id: str, title: str, keywords: list) -> str:
    task_dir = WORK_DIR / task_id
    task_dir.mkdir(exist_ok=True)

    await update_progress(task_id, 10)
    logger.info(f"[{task_id}] Generating script...")
    script = await generate_script(title, keywords)
    supabase.table("tasks").update({"script": script}).eq("id", task_id).execute()

    await update_progress(task_id, 25)
    logger.info(f"[{task_id}] Synthesizing voice...")
    audio_path = await synthesize_voice(script, task_dir)

    await update_progress(task_id, 40)
    logger.info(f"[{task_id}] Fetching media...")
    media_list = await fetch_media(keywords)

    await update_progress(task_id, 55)
    logger.info(f"[{task_id}] Composing scenes...")
    scenes = compose_scenes(script, audio_path, media_list)

    await update_progress(task_id, 70)
    logger.info(f"[{task_id}] Generating subtitles...")
    subtitle_path = generate_subtitle(audio_path, script, task_dir)

    await update_progress(task_id, 85)
    logger.info(f"[{task_id}] Exporting video...")
    video_path = await export_video(scenes, subtitle_path, task_dir)

    await update_progress(task_id, 95)
    video_url = upload_to_storage(task_id, video_path)

    supabase.table("tasks").update({
        "status": "completed",
        "progress": 100,
        "video_url": video_url,
        "completed_at": datetime.utcnow().isoformat()
    }).eq("id", task_id).execute()

    logger.info(f"[{task_id}] Completed! video_url={video_url}")
    return video_url


def upload_to_storage(task_id: str, video_path: str) -> str:
    bucket = "video"
    object_name = f"{task_id}/output.mp4"
    with open(video_path, "rb") as f:
        supabase.storage.from_(bucket).upload(
            object_name, f, {"content-type": "video/mp4", "upsert": "true"}
        )
    return supabase.storage.from_(bucket).get_public_url(object_name)


@app.get("/health")
async def health():
    return {"status": "ok"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)