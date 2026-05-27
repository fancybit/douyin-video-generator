import os
import asyncio
import subprocess
import requests
from pathlib import Path
from typing import List, Dict


async def export_video(scenes: List[Dict], subtitle_path: str, task_dir: Path) -> str:
    """使用 FFmpeg 合成最终视频"""
    media_dir = task_dir / "media"
    media_dir.mkdir(exist_ok=True)

    # 下载素材
    downloaded = await asyncio.gather(*[
        download_media(scene["media_url"], media_dir, f"media_{i}")
        for i, scene in enumerate(scenes) if scene.get("media_url")
    ])

    # 生成 FFmpeg concat 列表
    concat_file = task_dir / "concat.txt"
    with open(concat_file, "w", encoding="utf-8") as f:
        for i, scene in enumerate(scenes):
            media_file = downloaded[i] if i < len(downloaded) else ""
            if media_file:
                duration = scene["end_time"] - scene["start_time"]
                f.write(f"file '{media_file}'\n")
                f.write(f"duration {duration:.2f}\n")

    output_path = str(task_dir / "output.mp4")

    cmd = [
        "ffmpeg", "-y",
        "-f", "concat", "-safe", "0", "-i", str(concat_file),
        "-vf", f"scale=1080:1920:force_original_aspect_ratio=decrease,pad=1080:1920:(ow-iw)/2:(oh-ih)/2,setsar=1",
        "-r", "24",
        "-c:v", "libx264", "-preset", "fast", "-crf", "23",
        "-c:a", "aac", "-b:a", "128k",
        output_path
    ]

    # 如果有音频文件和字幕
    audio_path = str(task_dir / "audio.mp3")
    if os.path.exists(audio_path):
        cmd = [
            "ffmpeg", "-y",
            "-f", "concat", "-safe", "0", "-i", str(concat_file),
            "-i", audio_path,
            "-filter_complex",
            f"[0:v]scale=1080:1920:force_original_aspect_ratio=decrease,pad=1080:1920:(ow-iw)/2:(oh-ih)/2,setsar=1[v]",
            "-map", "[v]", "-map", "1:a",
            "-r", "24",
            "-c:v", "libx264", "-preset", "fast", "-crf", "23",
            "-c:a", "aac", "-b:a", "128k",
            output_path
        ]

    proc = await asyncio.create_subprocess_exec(
        *cmd, stdout=asyncio.subprocess.PIPE, stderr=asyncio.subprocess.PIPE
    )
    stdout, stderr = await proc.communicate()

    if proc.returncode != 0:
        raise RuntimeError(f"FFmpeg failed: {stderr.decode()}")

    return output_path


async def download_media(url: str, dest_dir: Path, prefix: str) -> str:
    if not url:
        return ""
    try:
        resp = requests.get(url, timeout=30)
        ext = ".mp4" if "video" in resp.headers.get("content-type", "") else ".jpg"
        path = str(dest_dir / f"{prefix}{ext}")
        with open(path, "wb") as f:
            f.write(resp.content)
        return path
    except Exception:
        return ""
