import os
import asyncio
import requests
from pathlib import Path
from typing import List, Dict

SUBTITLE_STYLE = (
    "FontName=Microsoft YaHei,FontSize=20,"
    "PrimaryColour=&H00FFFFFF,OutlineColour=&H00000000,"
    "Outline=1.5,Shadow=1,BorderStyle=1,"
    "Alignment=2,MarginV=120"
)


async def export_video(scenes: List[Dict], subtitle_path: str, task_dir: Path) -> str:
    """使用 FFmpeg 合成最终视频。有素材时拼接素材，无素材时生成渐变背景。"""
    media_dir = task_dir / "media"
    media_dir.mkdir(exist_ok=True)

    # 下载素材
    downloaded = await asyncio.gather(*[
        download_media(scene["media_url"], media_dir, f"media_{i}")
        for i, scene in enumerate(scenes) if scene.get("media_url")
    ])

    # 建立 scene index -> 素材文件映射
    media_map: Dict[int, str] = {}
    idx = 0
    for i, scene in enumerate(scenes):
        if scene.get("media_url"):
            media_map[i] = downloaded[idx] if idx < len(downloaded) else ""
            idx += 1

    has_any_media = any(m for m in media_map.values() if m)

    audio_path = str(task_dir / "audio.mp3")
    has_audio = os.path.exists(audio_path)
    has_subtitle = os.path.exists(subtitle_path)
    output_path = str(task_dir / "output.mp4")

    total_duration = scenes[-1]["end_time"] if scenes else 10

    # FFmpeg subtitles filter: 正斜杠 + 去掉盘符(C:)避免被解析为 key=value 分隔符
    ffmpeg_sub_path = subtitle_path.replace("\\", "/")
    if ":" in ffmpeg_sub_path:
        ffmpeg_sub_path = ffmpeg_sub_path.split(":", 1)[1]
    subtitle_filter = (
        f"subtitles=filename='{ffmpeg_sub_path}':force_style='{SUBTITLE_STYLE}'"
        if has_subtitle else ""
    )

    if has_any_media:
        cmd = _build_media_cmd(scenes, media_map, subtitle_filter, audio_path, output_path)
    else:
        cmd = _build_bg_cmd(total_duration, subtitle_filter, audio_path, output_path)

    proc = await asyncio.create_subprocess_exec(
        *cmd, stdout=asyncio.subprocess.PIPE, stderr=asyncio.subprocess.PIPE
    )
    stdout, stderr = await proc.communicate()

    if proc.returncode != 0:
        raise RuntimeError(f"FFmpeg failed: {stderr.decode()}")

    return output_path


def _build_media_cmd(scenes, media_map, subtitle_filter, audio_path, output_path):
    """构建素材拼接模式的 FFmpeg 命令"""
    concat_file = Path(output_path).parent / "concat.txt"
    with open(concat_file, "w", encoding="utf-8") as f:
        for i, scene in enumerate(scenes):
            media_file = media_map.get(i, "")
            if media_file:
                duration = scene["end_time"] - scene["start_time"]
                f.write(f"file '{media_file}'\n")
                f.write(f"duration {duration:.2f}\n")

    video_filter = (
        "scale=1080:1920:force_original_aspect_ratio=decrease,"
        "pad=1080:1920:(ow-iw)/2:(oh-ih)/2,setsar=1"
    )
    if subtitle_filter:
        video_filter = f"{video_filter},{subtitle_filter}"

    cmd = ["ffmpeg", "-y", "-f", "concat", "-safe", "0", "-i", str(concat_file)]
    has_audio = os.path.exists(audio_path)

    if has_audio:
        cmd += ["-i", audio_path]
        cmd += ["-filter_complex", f"[0:v]{video_filter}[v]"]
        cmd += ["-map", "[v]", "-map", "1:a", "-shortest"]
        cmd += ["-c:a", "aac", "-b:a", "128k"]
    else:
        cmd += ["-vf", video_filter]

    cmd += ["-r", "24", "-c:v", "libx264", "-preset", "fast", "-crf", "23", "-pix_fmt", "yuv420p", output_path]
    return cmd


def _build_bg_cmd(total_duration, subtitle_filter, audio_path, output_path):
    """构建渐变背景模式的 FFmpeg 命令（无素材时兜底）"""
    cmd = ["ffmpeg", "-y",
           "-f", "lavfi", "-i",
           f"color=c=0x0a0a1a:s=1080x1920:r=24:d={total_duration + 1}"]
    has_audio = os.path.exists(audio_path)
    has_subtitle = bool(subtitle_filter)

    if has_audio:
        cmd += ["-i", audio_path]

    if has_subtitle:
        if has_audio:
            cmd += ["-filter_complex", f"[0:v]{subtitle_filter}[v]"]
            cmd += ["-map", "[v]", "-map", "1:a"]
        else:
            cmd += ["-vf", subtitle_filter]
    elif has_audio:
        cmd += ["-map", "0:v", "-map", "1:a", "-shortest"]
        cmd += ["-c:a", "aac", "-b:a", "128k"]

    cmd += ["-c:v", "libx264", "-preset", "fast", "-crf", "23", "-pix_fmt", "yuv420p", output_path]
    return cmd


async def download_media(url: str, dest_dir: Path, prefix: str) -> str:
    if not url:
        return ""
    try:
        resp = requests.get(url, timeout=30)
        ct = resp.headers.get("content-type", "")
        ext = ".mp4" if "video" in ct else ".jpg"
        path = str(dest_dir / f"{prefix}{ext}")
        with open(path, "wb") as f:
            f.write(resp.content)
        return path
    except Exception:
        return ""
