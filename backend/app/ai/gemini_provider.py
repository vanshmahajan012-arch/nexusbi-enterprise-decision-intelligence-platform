from __future__ import annotations

from google import genai
from google.genai import types

from backend.app.ai.provider import (
    AIProvider,
    AIResponse,
)
from backend.app.core.settings import settings


DEFAULT_GEMINI_MODEL = "gemini-2.5-flash"


class GeminiProvider(AIProvider):
    def __init__(
        self,
        model_name: str = DEFAULT_GEMINI_MODEL,
    ) -> None:
        if not settings.gemini_api_key:
            raise RuntimeError(
                "GEMINI_API_KEY is not configured"
            )

        self._model_name = model_name

        self._client = genai.Client(
            api_key=settings.gemini_api_key,
        )

    @property
    def provider_name(self) -> str:
        return "GOOGLE_GEMINI"

    @property
    def model_name(self) -> str:
        return self._model_name

    async def generate(
        self,
        *,
        system_prompt: str,
        user_prompt: str,
        temperature: float = 0.2,
    ) -> AIResponse:
        response = (
            await self._client.aio.models.generate_content(
                model=self._model_name,
                contents=user_prompt,
                config=types.GenerateContentConfig(
                    system_instruction=system_prompt,
                    temperature=temperature,
                    max_output_tokens=900,
                ),
            )
        )

        content = (
            response.text.strip()
            if response.text
            else ""
        )

        if not content:
            raise RuntimeError(
                "Gemini returned an empty response"
            )

        usage = None

        usage_metadata = getattr(
            response,
            "usage_metadata",
            None,
        )

        if usage_metadata is not None:
            usage = {
                "prompt_token_count": getattr(
                    usage_metadata,
                    "prompt_token_count",
                    None,
                ),
                "candidates_token_count": getattr(
                    usage_metadata,
                    "candidates_token_count",
                    None,
                ),
                "total_token_count": getattr(
                    usage_metadata,
                    "total_token_count",
                    None,
                ),
            }

        return AIResponse(
            content=content,
            provider=self.provider_name,
            model=self.model_name,
            usage=usage,
        )