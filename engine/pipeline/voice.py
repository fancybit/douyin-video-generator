import os
import json
import requests
from pathlib import Path

DASHSCOPE_API_KEY = os.getenv("DASHSCOPE_API_KEY", "")
VOICE_ID = "cosyvoice-v3.5-plus-maojiu-6bdddd35648c4862a19c93a7de673e73"
SYNTH_URL = "https://dashscope.aliyuncs.com/api/v1/services/audio/tts/SpeechSynthesizer"


async def synthesize_voice(script_json: str, task_dir: Path) -> str:
    data = json.loads(script_json)
    paragraphs = data.get("paragraphs", [])
    full_text = "".join(p["text"] for p in paragraphs)

    headers = {
        "Authorization": f"Bearer {DASHSCOPE_API_KEY}",
        "Content-Type": "application/json"
    }

    payload = {
        "model": "cosyvoice-v3.5-plus",
        "input": {"text": full_text},
        "parameters": {
            "voice": VOICE_ID,
            "format": "mp3",
            "sample_rate": 24000
        }
    }

    resp = requests.post(SYNTH_URL, headers=headers, json=payload, timeout=120)
    resp.raise_for_status()
    result = resp.json()

    audio_url = result.get("output", {}).get("audio", {}).get("url", "")
    if not audio_url:
        raise RuntimeError(f"No audio URL: {result}")

    audio_resp = requests.get(audio_url, timeout=60)
    audio_path = str(task_dir / "audio.mp3")
    with open(audio_path, "wb") as f:
        f.write(audio_resp.content)

    return audio_path
