from __future__ import annotations

from backend.app.ai.gemini_provider import (
    GeminiProvider,
)
from backend.app.ai.openrouter_provider import (
    OpenRouterProvider,
)
from backend.app.ai.provider import (
    AIResponse,
)


class AIRouter:
    async def generate(
        self,
        *,
        system_prompt: str,
        user_prompt: str,
        temperature: float = 0.2,
    ) -> AIResponse:
        # Primary provider
        try:
            return await GeminiProvider().generate(
                system_prompt=system_prompt,
                user_prompt=user_prompt,
                temperature=temperature,
            )
        except Exception as gemini_error:
            print(
                "[NXUS AI ROUTER] "
                f"Gemini failed: {gemini_error}",
                flush=True,
            )

        # Fallback provider
        try:
            return await OpenRouterProvider().generate(
                system_prompt=system_prompt,
                user_prompt=user_prompt,
                temperature=temperature,
            )
        except Exception as openrouter_error:
            raise RuntimeError(
                "All configured AI providers failed. "
                f"Gemini={gemini_error}; "
                f"OpenRouter={openrouter_error}"
            ) from openrouter_error