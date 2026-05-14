"""
ChatEngine factory — Phase 3: RAG-augmented chat.

Teaching concept: the context injected into the system prompt now comes from
ChromaDB retrieval (relevant chunks for the user's question) rather than the
full CV JSON. This is the Retrieve → Augment → Generate loop in action.

The caller is responsible for fetching context via pipeline.get_candidate_context()
before building the engine — this keeps retrieval and generation decoupled.
"""
from llama_index.core.chat_engine import SimpleChatEngine
from llama_index.core.llms import ChatMessage, MessageRole
from llama_index.core.memory import ChatMemoryBuffer
from llama_index.llms.groq import Groq

from src.config import settings

_SYSTEM_TEMPLATE = """\
You are a recruitment assistant. Answer questions about this candidate \
based solely on the context excerpts from their CV below.

Be concise. Reference specific details (company names, dates, technologies) \
when relevant. If the context does not contain the answer, say so clearly \
rather than guessing.

--- RELEVANT CV CONTEXT ---
{context}
---------------------------\
"""

_ROLE_MAP = {
    "user": MessageRole.USER,
    "assistant": MessageRole.ASSISTANT,
}


def build_chat_engine(context: str, history: list[dict]) -> SimpleChatEngine:
    """
    Build a stateless SimpleChatEngine for one request.

    Args:
        context:  Relevant CV chunks retrieved from ChromaDB (or full CV JSON
                  as fallback when no chunks exist for this candidate yet).
        history:  Prior turns [{role: "user"|"assistant", content: str}, ...].
                  Provided by the frontend — the server never stores chat state.
    """
    llm = Groq(model=settings.groq_model, api_key=settings.groq_api_key, temperature=0.3)

    memory = ChatMemoryBuffer.from_defaults(token_limit=6000)
    for msg in history:
        role = _ROLE_MAP.get(msg.get("role", "user"), MessageRole.USER)
        memory.put(ChatMessage(role=role, content=msg["content"]))

    system_prompt = _SYSTEM_TEMPLATE.format(context=context)

    return SimpleChatEngine.from_defaults(
        llm=llm,
        memory=memory,
        system_prompt=system_prompt,
    )
