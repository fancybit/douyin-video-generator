import json
import os
from openai import OpenAI

client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

SYSTEM_PROMPT = """你是一个知识解说类短视频文案写手。根据用户提供的主题和关键词，生成一段适合抖音知识解说视频的文案。

要求：
1. 字数 200-500 字
2. 分为 6-10 个段落，每个段落 1-2 句话
3. 语气口语化，有吸引力，适合配音朗读
4. 开头用悬念或问题吸引注意力
5. 每个段落标注该段的核心关键词（用于配图）

输出 JSON 格式：
{
  "title": "视频标题",
  "paragraphs": [
    {"text": "段落内容", "keywords": ["关键词1", "关键词2"]}
  ]
}"""


async def generate_script(title: str, keywords: list) -> str:
    keyword_str = "、".join(keywords)
    user_prompt = f"主题：{title}\n关键词：{keyword_str}\n请生成知识解说视频文案。"

    response = client.chat.completions.create(
        model="gpt-4o",
        messages=[
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": user_prompt}
        ],
        temperature=0.8,
        response_format={"type": "json_object"}
    )

    script_json = response.choices[0].message.content
    data = json.loads(script_json)
    return json.dumps(data, ensure_ascii=False)
