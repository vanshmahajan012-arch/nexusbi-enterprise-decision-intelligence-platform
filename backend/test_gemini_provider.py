from backend.app.ai.gemini_provider import (
    GeminiProvider,
)


async def main() -> None:
    provider = GeminiProvider()

    response = await provider.generate(
        system_prompt=(
            "You are NXUS, an enterprise business "
            "analysis assistant. Be concise and factual."
        ),
        user_prompt=(
            "Say exactly: "
            "NXUS Gemini connectivity verified."
        ),
        temperature=0.0,
    )

    print("NXUS GEMINI PROVIDER TEST")
    print("=========================")
    print("Provider :", response.provider)
    print("Model    :", response.model)
    print("Content  :", response.content)
    print("Usage    :", response.usage)


if __name__ == "__main__":
    import asyncio

    asyncio.run(main())