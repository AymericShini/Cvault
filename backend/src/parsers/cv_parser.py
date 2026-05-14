"""
Calls the Groq LLM with our carefully engineered prompt
and returns a validated ParsedCV instance.
"""
import json
import re
import time

from groq import AsyncGroq

from src.config import settings
from src.models.cv import ParsedCV
from src.parsers.prompts import SYSTEM_PROMPT, build_user_prompt


class ParseError(Exception):
    pass


async def parse_cv(raw_text: str) -> tuple[ParsedCV, int, float]:
    """
    Parse raw CV text into a structured ParsedCV.

    Returns:
        parsed_cv   — validated Pydantic model
        tokens_used — total tokens consumed (input + output)
        latency_s   — seconds the Groq API call took
    """
    client = AsyncGroq(api_key=settings.groq_api_key)
    user_prompt = build_user_prompt(raw_text)

    start = time.perf_counter()
    try:
        response = await client.chat.completions.create(
            model=settings.groq_model,
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": user_prompt},
            ],
            temperature=0.0,   # Deterministic — critical for data extraction
            max_tokens=3_000,
        )
    except Exception as e:
        raise ParseError(f"Groq API call failed: {e}")

    latency_s = time.perf_counter() - start
    tokens_used: int = response.usage.total_tokens if response.usage else 0
    raw_output: str = response.choices[0].message.content or ""

    parsed_dict = _extract_json(raw_output)
    try:
        parsed_cv = ParsedCV.model_validate(parsed_dict)
    except Exception as e:
        raise ParseError(f"Response did not match CV schema: {e}")

    return parsed_cv, tokens_used, latency_s


def _extract_json(text: str) -> dict:
    """
    Robustly extract JSON from the model response.
    Handles cases where the model wraps output in markdown fences
    despite being told not to (it happens).
    """
    text = text.strip()

    # Happy path: the whole response is valid JSON
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        pass

    # Strip markdown code fences if present
    fenced = re.sub(r"^```(?:json)?\s*", "", text, flags=re.MULTILINE)
    fenced = re.sub(r"\s*```$", "", fenced, flags=re.MULTILINE).strip()
    try:
        return json.loads(fenced)
    except json.JSONDecodeError:
        pass

    # Last resort: find the first { ... } block
    match = re.search(r"\{.*\}", text, re.DOTALL)
    if match:
        try:
            return json.loads(match.group())
        except json.JSONDecodeError:
            pass

    raise ParseError(
        f"Model returned non-JSON output. First 300 chars: {text[:300]}"
    )
