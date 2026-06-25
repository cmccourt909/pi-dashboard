"""
app/lodestar/adapters.py

ILLMAdapter interface and three implementations for Lodestar streaming.

Adapter selection is controlled by the LODESTAR_ADAPTER environment variable
(values: 'azure_openai' | 'claude' | 'openai', default: 'azure_openai').

The Azure OpenAI adapter reuses the same client factory (_get_openai_client)
and managed identity credential chain already established in enrich.py —
no new Azure infrastructure required.

The optional cancel() method allows the SSE endpoint to abort an in-flight
LLM call when the client disconnects mid-stream. Default implementation is
a no-op; adapters that hold a cancellable async task override it.
"""

from __future__ import annotations

import asyncio
import logging
import os
from abc import ABC, abstractmethod
from typing import AsyncGenerator

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# ILLMAdapter interface
# ---------------------------------------------------------------------------

class ILLMAdapter(ABC):
    """
    Interface for LLM adapters used by the Lodestar streaming endpoint.

    Implementations must provide an async generator that yields string chunks
    as they arrive from the LLM. The endpoint wraps each chunk in a
    NarrativeChunk SSE event without buffering.
    """

    @abstractmethod
    async def stream(self, prompt: str) -> AsyncGenerator[str, None]:
        """
        Stream a prompt response as string chunks.

        Yields:
            str: One chunk of text per token batch from the LLM.

        Raises:
            Any exception from the underlying LLM SDK — the SSE endpoint
            catches these and emits an error event.
        """
        ...

    async def cancel(self) -> None:
        """
        Cancel an in-flight stream. Called when the SSE client disconnects.

        Default implementation is a no-op. Override in adapters that hold
        a cancellable async task or open HTTP connection.
        """
        pass


# ---------------------------------------------------------------------------
# AzureOpenAIAdapter
# Reuses _get_openai_client() from enrich.py — same managed identity chain,
# same deployment (gpt-4o-mini), no new Azure config required.
# ---------------------------------------------------------------------------

class AzureOpenAIAdapter(ILLMAdapter):
    """
    Streams from Azure OpenAI using the existing managed identity client.

    Reuses _get_openai_client() and the AZURE_OPENAI_ENDPOINT /
    AZURE_OPENAI_DEPLOYMENT env vars already configured for enrich.py.
    """

    def __init__(self) -> None:
        self._current_task: asyncio.Task | None = None

    async def stream(self, prompt: str) -> AsyncGenerator[str, None]:
        from app.api.routers.enrich import _get_openai_client, ProviderNotConfiguredError

        client, deployment = _get_openai_client()
        if not client:
            raise ProviderNotConfiguredError()

        # Run the synchronous streaming call in a thread so it doesn't block
        # the async event loop. asyncio.to_thread wraps it as a cancellable task.
        loop = asyncio.get_event_loop()
        queue: asyncio.Queue[str | None] = asyncio.Queue()

        def _stream_sync():
            """Blocking call — runs in thread pool via asyncio.to_thread."""
            try:
                with client.chat.completions.create(
                    model=deployment,
                    messages=[{"role": "user", "content": prompt}],
                    max_tokens=300,
                    temperature=0.3,
                    stream=True,
                    timeout=30,
                ) as stream:
                    for chunk in stream:
                        delta = chunk.choices[0].delta.content if chunk.choices else None
                        if delta:
                            loop.call_soon_threadsafe(queue.put_nowait, delta)
            except Exception as exc:
                loop.call_soon_threadsafe(queue.put_nowait, exc)
            finally:
                loop.call_soon_threadsafe(queue.put_nowait, None)  # sentinel

        self._current_task = asyncio.ensure_future(
            asyncio.to_thread(_stream_sync)
        )

        try:
            while True:
                item = await queue.get()
                if item is None:
                    break
                if isinstance(item, Exception):
                    raise item
                yield item
        finally:
            self._current_task = None

    async def cancel(self) -> None:
        if self._current_task and not self._current_task.done():
            self._current_task.cancel()
            try:
                await self._current_task
            except (asyncio.CancelledError, Exception):
                pass
            self._current_task = None


# ---------------------------------------------------------------------------
# ClaudeAdapter
# Uses the Anthropic Python SDK with streaming.
# Requires: ANTHROPIC_API_KEY environment variable.
# ---------------------------------------------------------------------------

class ClaudeAdapter(ILLMAdapter):
    """
    Streams from Anthropic Claude via the official Python SDK.

    Requires:
        ANTHROPIC_API_KEY env var.
        anthropic package: pip install anthropic
    """

    def __init__(self, model: str = "claude-sonnet-4-6") -> None:
        self.model = model
        self._current_task: asyncio.Task | None = None

    async def stream(self, prompt: str) -> AsyncGenerator[str, None]:
        try:
            import anthropic
        except ImportError as e:
            raise ImportError(
                "anthropic package is required for ClaudeAdapter. "
                "Add 'anthropic' to app/requirements.txt."
            ) from e

        api_key = os.environ.get("ANTHROPIC_API_KEY")
        if not api_key:
            raise EnvironmentError(
                "ANTHROPIC_API_KEY environment variable is not set."
            )

        client = anthropic.AsyncAnthropic(api_key=api_key)
        queue: asyncio.Queue[str | None] = asyncio.Queue()

        async def _stream_async():
            try:
                async with client.messages.stream(
                    model=self.model,
                    max_tokens=300,
                    messages=[{"role": "user", "content": prompt}],
                ) as stream:
                    async for text in stream.text_stream:
                        await queue.put(text)
            except Exception as exc:
                await queue.put(exc)  # type: ignore[arg-type]
            finally:
                await queue.put(None)

        self._current_task = asyncio.ensure_future(_stream_async())

        try:
            while True:
                item = await queue.get()
                if item is None:
                    break
                if isinstance(item, Exception):
                    raise item
                yield item
        finally:
            self._current_task = None

    async def cancel(self) -> None:
        if self._current_task and not self._current_task.done():
            self._current_task.cancel()
            try:
                await self._current_task
            except (asyncio.CancelledError, Exception):
                pass
            self._current_task = None


# ---------------------------------------------------------------------------
# OpenAIAdapter
# Uses the OpenAI Python SDK directly (non-Azure).
# Requires: OPENAI_API_KEY environment variable.
# ---------------------------------------------------------------------------

class OpenAIAdapter(ILLMAdapter):
    """
    Streams from OpenAI directly (non-Azure) via the openai Python SDK.

    Requires:
        OPENAI_API_KEY env var.
        openai package already in app/requirements.txt.
    """

    def __init__(self, model: str = "gpt-4o-mini") -> None:
        self.model = model
        self._current_task: asyncio.Task | None = None

    async def stream(self, prompt: str) -> AsyncGenerator[str, None]:
        try:
            from openai import AsyncOpenAI
        except ImportError as e:
            raise ImportError(
                "openai package is required for OpenAIAdapter. "
                "Add 'openai' to app/requirements.txt."
            ) from e

        api_key = os.environ.get("OPENAI_API_KEY")
        if not api_key:
            raise EnvironmentError(
                "OPENAI_API_KEY environment variable is not set."
            )

        client = AsyncOpenAI(api_key=api_key)
        queue: asyncio.Queue[str | None] = asyncio.Queue()

        async def _stream_async():
            try:
                stream = await client.chat.completions.create(
                    model=self.model,
                    messages=[{"role": "user", "content": prompt}],
                    max_tokens=300,
                    temperature=0.3,
                    stream=True,
                )
                async for chunk in stream:
                    delta = chunk.choices[0].delta.content if chunk.choices else None
                    if delta:
                        await queue.put(delta)
            except Exception as exc:
                await queue.put(exc)  # type: ignore[arg-type]
            finally:
                await queue.put(None)

        self._current_task = asyncio.ensure_future(_stream_async())

        try:
            while True:
                item = await queue.get()
                if item is None:
                    break
                if isinstance(item, Exception):
                    raise item
                yield item
        finally:
            self._current_task = None

    async def cancel(self) -> None:
        if self._current_task and not self._current_task.done():
            self._current_task.cancel()
            try:
                await self._current_task
            except (asyncio.CancelledError, Exception):
                pass
            self._current_task = None
