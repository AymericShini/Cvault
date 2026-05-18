"""
ReAct agent runner — Phase 4.

Teaching concept: an agent is just a loop.

  1. Send messages (+ tool schemas) to the LLM.
  2. LLM replies with either a tool_call or a final answer.
  3. If tool_call → execute the function → append result → go to 1.
  4. If final answer → yield it and stop.

That's the entire ReAct (Reason + Act) pattern.
No framework magic — the loop is right here.
"""
import json
from collections.abc import AsyncGenerator

from groq import AsyncGroq

from src.agent import tools as agent_tools
from src.config import settings

_SYSTEM_PROMPT = """\
You are a recruitment assistant agent with access to a structured candidate database.

Complete recruitment tasks by calling tools in the right sequence.
Always search before comparing or drafting emails — you need candidate IDs first.
When you have enough information, provide a clear, specific final answer that
references names, scores, and concrete details from the data you retrieved.
"""

_MAX_ITERATIONS = 10


async def run(task: str) -> AsyncGenerator[dict, None]:
    """
    Async generator that yields one dict per agent step:

      {"type": "thought",     "content": str}
      {"type": "tool_call",   "call_id": str, "name": str, "args": dict}
      {"type": "tool_result", "call_id": str, "name": str, "result": dict}
      {"type": "token_usage", "prompt_tokens": int, "completion_tokens": int, "total_tokens": int}
      {"type": "answer",      "content": str}
      {"type": "error",       "content": str}
    """
    client = AsyncGroq(api_key=settings.groq_api_key)

    messages: list[dict] = [
        {"role": "system", "content": _SYSTEM_PROMPT},
        {"role": "user", "content": task},
    ]

    for _ in range(_MAX_ITERATIONS):
        response = await client.chat.completions.create(
            model=settings.groq_model,
            messages=messages,
            tools=agent_tools.TOOL_DEFINITIONS,
            tool_choice="auto",
            temperature=0.0,
            max_tokens=2000,
        )

        msg = response.choices[0].message

        if response.usage:
            yield {
                "type": "token_usage",
                "prompt_tokens": response.usage.prompt_tokens,
                "completion_tokens": response.usage.completion_tokens,
                "total_tokens": response.usage.total_tokens,
            }

        # Some models emit reasoning text alongside tool_calls
        if msg.content:
            yield {"type": "thought", "content": msg.content}

        if msg.tool_calls:
            # Append assistant turn (with tool_calls) to conversation history
            messages.append({
                "role": "assistant",
                "content": msg.content,
                "tool_calls": [
                    {
                        "id": tc.id,
                        "type": "function",
                        "function": {
                            "name": tc.function.name,
                            "arguments": tc.function.arguments,
                        },
                    }
                    for tc in msg.tool_calls
                ],
            })

            for tc in msg.tool_calls:
                fn_name = tc.function.name
                try:
                    fn_args = json.loads(tc.function.arguments)
                except json.JSONDecodeError:
                    fn_args = {}

                yield {"type": "tool_call", "call_id": tc.id, "name": fn_name, "args": fn_args}

                try:
                    result = await agent_tools.execute(fn_name, fn_args)
                except Exception as e:
                    result = {"error": str(e)}

                yield {"type": "tool_result", "call_id": tc.id, "name": fn_name, "result": result}

                # Append tool result to conversation so the LLM sees it next turn
                messages.append({
                    "role": "tool",
                    "tool_call_id": tc.id,
                    "content": json.dumps(result),
                })

        else:
            # No tool calls → LLM is done reasoning, this is the final answer
            yield {"type": "answer", "content": msg.content or ""}
            return

    yield {
        "type": "error",
        "content": "Agent reached the maximum number of iterations without completing the task.",
    }
