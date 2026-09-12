from __future__ import annotations

from typing import Any

import httpx

from backend.app.ai.provider import (
    AIProvider,
    AIResponse,
)
from backend.app.core.settings import settings


DEFAULT_OPENROUTER_MODEL = (
    "openrouter/free"
)

OPENROUTER_URL = (
    "https://openrouter.ai/api/v1/chat/completions"
)


class OpenRouterProvider(AIProvider):
    def __init__(
        self,
        model_name: str = DEFAULT_OPENROUTER_MODEL,
    ) -> None:
        if not settings.openrouter_api_key:
            raise RuntimeError(
                "OPENROUTER_API_KEY is not configured"
            )

        self._model_name = model_name
        self._api_key = (
            settings.openrouter_api_key
        )

    @property
    def provider_name(self) -> str:
        return "OPENROUTER"

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
        headers = {
            "Authorization": (
                f"Bearer {self._api_key}"
            ),
            "Content-Type": (
                "application/json"
            ),
        }

        payload: dict[str, Any] = {
            "model": self._model_name,
            "messages": [
                {
                    "role": "system",
                    "content": system_prompt,
                },
                {
                    "role": "user",
                    "content": user_prompt,
                },
            ],
            "temperature": temperature,
        }

        async with httpx.AsyncClient(
            timeout=60.0
        ) as client:
            response = await client.post(
                OPENROUTER_URL,
                headers=headers,
                json=payload,
            )

        if response.status_code >= 400:
            raise RuntimeError(
                "OpenRouter request failed: "
                f"{response.status_code} "
                f"{response.text}"
            )

        data = response.json()

        choices = data.get(
            "choices",
            [],
        )

        if not choices:
            raise RuntimeError(
                "OpenRouter returned no choices"
            )

        content = (
            choices[0]
            .get("message", {})
            .get("content", "")
        )

        if not content:
            raise RuntimeError(
                "OpenRouter returned empty content"
            )

        usage = data.get(
            "usage"
        )

        return AIResponse(
            content=str(content).strip(),
            provider=self.provider_name,
            model=self.model_name,
            usage=usage,
        )