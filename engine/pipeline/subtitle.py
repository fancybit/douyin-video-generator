import json
from pathlib import Path


def generate_subtitle(audio_path: str, script_json: str, task_dir: Path) -> str:
    data = json.loads(script_json)
    paragraphs = data.get("paragraphs", [])

    srt_lines = []
    index = 1
    current_time = 0.0

    for para in paragraphs:
        text = para["text"]
        duration = max(len(text) / 3.0, 2.0)
        start_str = _fmt(current_time)
        end_str = _fmt(current_time + duration)
        srt_lines.append(f"{index}\n{start_str} --> {end_str}\n{text}\n")
        index += 1
        current_time += duration

    srt_path = str(task_dir / "subtitle.srt")
    with open(srt_path, "w", encoding="utf-8") as f:
        f.write("\n".join(srt_lines))
    return srt_path


def _fmt(sec: float) -> str:
    h = int(sec // 3600)
    m = int((sec % 3600) // 60)
    s = int(sec % 60)
    ms = int((sec % 1) * 1000)
    return f"{h:02d}:{m:02d}:{s:02d},{ms:03d}"
