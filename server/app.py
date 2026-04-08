from fastapi import FastAPI, Body
from pydantic import BaseModel
from typing import Optional, Any
import os
from openai import OpenAI

app = FastAPI()

API_KEY = os.getenv("HF_TOKEN") or os.getenv("API_KEY") or "dummy"
API_BASE_URL = os.getenv("API_BASE_URL", "https://router.huggingface.co/v1")
MODEL_NAME = os.getenv("MODEL_NAME", "Qwen/Qwen2.5-72B-Instruct")

client = OpenAI(base_url=API_BASE_URL, api_key=API_KEY)

SYSTEM_PROMPT = """You are an AI Office Assistant environment.
Handle tasks: email triage, calendar scheduling, customer support, meeting briefs, thread summarization.
Complete every task fully. Reward is based on quality and completeness."""

class Action(BaseModel):
    message: str

class Observation(BaseModel):
    message: str

class ResetResponse(BaseModel):
    observation: Observation
    done: bool = False

class StepResponse(BaseModel):
    observation: Observation
    reward: float
    done: bool
    info: dict = {}

def clamp_score(raw: float) -> float:
    return max(0.01, min(raw, 0.99))

def compute_reward(response: str) -> float:
    base = len(response.strip()) / 500
    structure_bonus = 0.1 if any(m in response for m in ['1.', '-', '•', '✅']) else 0.0
    return clamp_score(base + structure_bonus)

@app.post("/reset")
async def reset(body: Optional[Any] = Body(default=None)) -> ResetResponse:
    return ResetResponse(
        observation=Observation(
            message="Welcome to AI Office Assistant. Tasks: 1) Email triage 2) Calendar scheduling 3) Customer support 4) Meeting brief 5) Thread summarization. What task would you like to perform?"
        ),
        done=False
    )

@app.post("/step")
async def step(action: Action) -> StepResponse:
    try:
        completion = client.chat.completions.create(
            model=MODEL_NAME,
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": action.message}
            ],
            max_tokens=500,
            temperature=0.7,
        )
        response_text = completion.choices[0].message.content or "Task completed"
        reward = compute_reward(response_text)
        return StepResponse(
            observation=Observation(message=response_text),
            reward=round(reward, 2),
            done=True,
            info={"model": MODEL_NAME}
        )
    except Exception as e:
        return StepResponse(
            observation=Observation(message=f"Error processing task: {str(e)}"),
            reward=0.01,
            done=True,
            info={"error": str(e)}
        )

@app.post("/close")
async def close():
    return {"status": "closed"}

@app.get("/health")
async def health():
    return {"status": "ok"}

async def main():
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)

if __name__ == "__main__":
    import asyncio
    asyncio.run(main())
