import asyncio
import os
import textwrap
from typing import List, Optional
from openai import OpenAI

try:
    from my_env_v4 import MyEnvV4Action, MyEnvV4Env
except ImportError:
    MyEnvV4Env = None
    MyEnvV4Action = None

IMAGE_NAME = os.getenv("IMAGE_NAME")
API_KEY = os.getenv("HF_TOKEN") or os.getenv("API_KEY")
API_BASE_URL = os.getenv("API_BASE_URL", "https://router.huggingface.co/v1")
MODEL_NAME = os.getenv("MODEL_NAME", "Qwen/Qwen2.5-72B-Instruct")
TASK_NAME = os.getenv("MY_ENV_V4_TASK", "office-assistant")
BENCHMARK = os.getenv("MY_ENV_V4_BENCHMARK", "my_env_v4")
MAX_STEPS = 8
TEMPERATURE = 0.7
MAX_TOKENS = 500
SUCCESS_SCORE_THRESHOLD = 0.1
_MAX_REWARD_PER_STEP = MAX_TOKENS * 0.1
MAX_TOTAL_REWARD = MAX_STEPS * _MAX_REWARD_PER_STEP

SYSTEM_PROMPT = textwrap.dedent("""
    You are an AI Office Assistant that can:
    1. Classify emails as important or spam
    2. Schedule meetings by finding conflict-free time slots
    3. Generate professional customer support replies
    4. Create meeting briefs with 5 key bullet points
    5. Answer questions grounded in company knowledge base
    6. Summarize email threads extracting decisions and action items

    For each task given to you:
    - Analyze the input carefully
    - Perform the requested office task
    - Return a clear, structured response
    - Be concise and professional

    Always complete the task fully in one response.
""").strip()

def log_start(task: str, env: str, model: str) -> None:
    print(f"[START] task={task} env={env} model={model}", flush=True)

def log_step(step: int, action: str, reward: float, done: bool, error: Optional[str]) -> None:
    error_val = error if error else "null"
    done_val = str(done).lower()
    action_clean = action[:100].replace('\n', ' ')
    print(f"[STEP] step={step} action={action_clean} reward={reward:.2f} done={done_val} error={error_val}", flush=True)

def log_end(success: bool, steps: int, score: float, rewards: List[float]) -> None:
    rewards_str = ",".join(f"{r:.2f}" for r in rewards)
    print(f"[END] success={str(success).lower()} steps={steps} score={score:.3f} rewards={rewards_str}", flush=True)

def build_user_prompt(step: int, last_observation: str, last_reward: float, history: List[str]) -> str:
    history_block = "\n".join(history[-4:]) if history else "None"
    return textwrap.dedent(f"""
        Step: {step}
        Current task/observation: {last_observation}
        Last reward: {last_reward:.2f}
        Previous steps:
        {history_block}
        Complete the office task described in the observation.
    """).strip()

def get_model_response(client: OpenAI, step: int, observation: str, last_reward: float, history: List[str]) -> str:
    user_prompt = build_user_prompt(step, observation, last_reward, history)
    try:
        completion = client.chat.completions.create(
            model=MODEL_NAME,
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": user_prompt},
            ],
            temperature=TEMPERATURE,
            max_tokens=MAX_TOKENS,
            stream=False,
        )
        text = (completion.choices[0].message.content or "").strip()
        return text if text else "Task completed"
    except Exception as exc:
        print(f"[DEBUG] Model request failed: {exc}", flush=True)
        return "Task completed"

async def main() -> None:
    client = OpenAI(base_url=API_BASE_URL, api_key=API_KEY)
    env = await MyEnvV4Env.from_docker_image(IMAGE_NAME)

    history: List[str] = []
    rewards: List[float] = []
    steps_taken = 0
    score = 0.0
    success = False

    log_start(task=TASK_NAME, env=BENCHMARK, model=MODEL_NAME)

    try:
        result = await env.reset()
        last_observation = str(result.observation)
        last_reward = 0.0

        for step in range(1, MAX_STEPS + 1):
            if result.done:
                break

            response = get_model_response(client, step, last_observation, last_reward, history)
            result = await env.step(MyEnvV4Action(message=response))

            reward = result.reward or 0.0
            done = result.done
            error = None

            rewards.append(reward)
            steps_taken = step
            last_observation = str(result.observation)
            last_reward = reward

            log_step(step=step, action=response, reward=reward, done=done, error=error)
            history.append(f"Step {step}: reward {reward:+.2f}")

            if done:
                break

        score = sum(rewards) / MAX_TOTAL_REWARD if MAX_TOTAL_REWARD > 0 else 0.0
        score = min(max(score, 0.0), 1.0)
        success = score >= SUCCESS_SCORE_THRESHOLD

    finally:
        try:
            await env.close()
        except Exception as e:
            print(f"[DEBUG] env.close() error: {e}", flush=True)
        log_end(success=success, steps=steps_taken, score=score, rewards=rewards)

if __name__ == "__main__":
    asyncio.run(main())
