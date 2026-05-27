import json
from typing import List, Dict


def compose_scenes(script_json: str, audio_path: str, media_list: List[Dict]) -> List[Dict]:
    data = json.loads(script_json)
    paragraphs = data.get("paragraphs", [])

    scenes = []
    current_time = 0.0
    n_media = len(media_list)

    for i, para in enumerate(paragraphs):
        text = para["text"]
        duration = max(len(text) / 3.0, 2.0)

        media_idx = i % n_media if n_media > 0 else 0
        m = media_list[media_idx] if n_media > 0 else {}

        scene = {
            "start_time": current_time,
            "end_time": current_time + duration,
            "text": text,
            "media_url": m.get("url", ""),
            "media_type": m.get("type", "image"),
        }
        scenes.append(scene)
        current_time += duration

    return scenes
