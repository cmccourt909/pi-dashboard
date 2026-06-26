"""
app/lodestar/adapters.py

LLM adapters for the Lodestar SSE streaming endpoint.

Each adapter exposes an async `stream(prompt)` method that yields text chunks.
"""
from __future__ import annotations

import os
from typing import AsyncGenerator


class _BaseAdapter:
    """Base adapter with shared streaming helpers."""

    async def stream(self, prompt: str) -> AsyncGenerator[str, None]:
        raise NotImplementedError

    async def cancel(self) -> None:
        """Cancel an in-flight stream. Default: no-op."""
        pass


class AzureOpenAIAdapter(_BaseAdapter):
    """Azure OpenAI adapter using managed identity or API key."""

    def __init__(self, model: str | None = None):
        self.model = model or os.getenv("AZURE_OPENAI_DEPLOYMENT", "gpt-4o-mini")
        self.endpoint = os.getenv("AZURE_OPENAI_ENDPOINT")
        self._client = None

    def _get_client(self):
        if self._client is not None:
            return self._client

        if not self.endpoint:
            raise RuntimeError(
                "AZURE_OPENAI_ENDPOINT is not set. Configure Azure OpenAI to use Lodestar."
            )

        try:
            from openai import AsyncAzureOpenAI
            from azure.identity import DefaultAzureCredential, get_bearer_token_provider

            credential = DefaultAzureCredential(
                managed_identity_client_id=os.environ.get("AZURE_CLIENT_ID")
            )
            token_provider = get_bearer_token_provider(
                credential, "https://cognitiveservices.azure.com/.default"
            )
            self._client = AsyncAzureOpenAI(
                azure_endpoint=self.endpoint,
                azure_ad_token_provider=token_provider,
                api_version="2024-10-21",
            )
            return self._client
        except ImportError:
            pass

        api_key = os.environ.get("AZURE_OPENAI_API_KEY")
        if not api_key:
            raise RuntimeError(
                "AZURE_OPENAI_ENDPOINT is set but neither azure-identity nor AZURE_OPENAI_API_KEY is available."
            )
        from openai import AsyncAzureOpenAI

        self._client = AsyncAzureOpenAI(
            azure_endpoint=self.endpoint,
            api_key=api_key,
            api_version="2024-10-21",
        )
        return self._client

    async def stream(self, prompt: str) -> AsyncGenerator[str, None]:
        client = self._get_client()
        response = await client.chat.completions.create(
            model=self.model,
            messages=[{"role": "user", "content": prompt}],
            stream=True,
            max_tokens=400,
            temperature=0.3,
        )
        async for chunk in response:
            delta = chunk.choices[0].delta.content
            if delta:
                yield delta


class OpenAIAdapter(_BaseAdapter):
    """OpenAI adapter (API key from OPENAI_API_KEY)."""

    def __init__(self, model: str | None = None):
        self.model = model or os.getenv("OPENAI_MODEL", "gpt-4o-mini")
        self._client = None

    def _get_client(self):
        if self._client is not None:
            return self._client
        from openai import AsyncOpenAI

        self._client = AsyncOpenAI(api_key=os.environ.get("OPENAI_API_KEY"))
        return self._client

    async def stream(self, prompt: str) -> AsyncGenerator[str, None]:
        client = self._get_client()
        response = await client.chat.completions.create(
            model=self.model,
            messages=[{"role": "user", "content": prompt}],
            stream=True,
            max_tokens=400,
            temperature=0.3,
        )
        async for chunk in response:
            delta = chunk.choices[0].delta.content
            if delta:
                yield delta


class ClaudeAdapter(_BaseAdapter):
    """Anthropic Claude adapter. Requires anthropic package."""

    def __init__(self, model: str | None = None):
        self.model = model or os.getenv("CLAUDE_MODEL", "claude-3-5-sonnet-20241022")
        self._client = None

    def _get_client(self):
        if self._client is not None:
            return self._client
        try:
            from anthropic import AsyncAnthropic
        except ImportError as e:
            raise RuntimeError(
                "Claude adapter requires the 'anthropic' package. Install it to use LODESTAR_ADAPTER=claude."
            ) from e
        self._client = AsyncAnthropic(api_key=os.environ.get("ANTHROPIC_API_KEY"))
        return self._client

    async def stream(self, prompt: str) -> AsyncGenerator[str, None]:
        client = self._get_client()
        async with client.messages.stream(
            model=self.model,
            max_tokens=400,
            messages=[{"role": "user", "content": prompt}],
        ) as stream:
            async for text in stream.text_stream:
                if text:
                    yield text
