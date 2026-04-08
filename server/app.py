import os
import asyncio
from openai import OpenAI

API_KEY = os.getenv("HF_TOKEN") or os.getenv("API_KEY")
API_BASE_URL = os.getenv("API_BASE_URL", "https://router.huggingface.co/v1")
MODEL_NAME = os.getenv("MODEL_NAME", "Qwen/Qwen2.5-72B-Instruct")

client = OpenAI(base_url=API_BASE_URL, api_key=API_KEY)

def get_response(message: str) -> str:
    try:
        completion = client.chat.completions.create(
            model=MODEL_NAME,
            messages=[
                {"role": "system", "content": "You are an AI Office Assistant that helps with email triage, calendar scheduling, customer support replies, meeting briefs, and email thread summarization."},
                {"role": "user", "content": message}
            ],
            max_tokens=500,
            temperature=0.7,
        )
        return completion.choices[0].message.content or "Task completed"
    except Exception as e:
        return f"Error: {str(e)}"

async def main():
    response = get_response("Hello, what can you help me with?")
    print(response)

if __name__ == "__main__":
    asyncio.run(main())
