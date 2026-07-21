from __future__ import annotations

import os
from typing import Any

import httpx


class AI2HumanAPIError(RuntimeError):
    def __init__(self, message: str, status_code: int, details: Any) -> None:
        super().__init__(message)
        self.status_code = status_code
        self.details = details


class AI2HumanClient:
    def __init__(
        self,
        *,
        api_key: str | None = None,
        base_url: str | None = None,
        transport: httpx.BaseTransport | None = None,
        async_transport: httpx.AsyncBaseTransport | None = None,
    ) -> None:
        self.api_key = api_key or os.getenv("AI2HUMAN_API_KEY") or os.getenv("AI2HUMAN_AGENT_KEY") or ""
        self.base_url = (base_url or os.getenv("AI2HUMAN_BASE_URL") or "https://ai2human.io").rstrip("/")
        self.transport = transport
        self.async_transport = async_transport

    def _headers(self) -> dict[str, str]:
        if not self.api_key:
            raise AI2HumanAPIError(
                "AI2HUMAN_API_KEY is required. Create one at https://ai2human.io/developers/api-keys.",
                401,
                {"code": "AGENT_API_KEY_REQUIRED"},
            )
        return {"Accept": "application/json", "x-agent-api-key": self.api_key}

    @staticmethod
    def _read(response: httpx.Response) -> dict[str, Any]:
        try:
            payload = response.json()
        except ValueError:
            payload = {"error": f"HTTP {response.status_code}"}
        if response.is_error:
            raise AI2HumanAPIError(str(payload.get("error") or response.reason_phrase), response.status_code, payload)
        return payload

    def _request(self, method: str, path: str, **kwargs: Any) -> dict[str, Any]:
        with httpx.Client(base_url=self.base_url, headers=self._headers(), transport=self.transport, timeout=30) as client:
            return self._read(client.request(method, path, **kwargs))

    async def _arequest(self, method: str, path: str, **kwargs: Any) -> dict[str, Any]:
        async with httpx.AsyncClient(
            base_url=self.base_url,
            headers=self._headers(),
            transport=self.async_transport,
            timeout=30,
        ) as client:
            return self._read(await client.request(method, path, **kwargs))

    def create_task(self, payload: dict[str, Any]) -> dict[str, Any]:
        return self._request("POST", "/api/agent/tasks", json=payload)

    async def acreate_task(self, payload: dict[str, Any]) -> dict[str, Any]:
        return await self._arequest("POST", "/api/agent/tasks", json=payload)

    def check_task(self, task_id: str) -> dict[str, Any]:
        return self._request("GET", f"/api/tasks/{task_id}")

    async def acheck_task(self, task_id: str) -> dict[str, Any]:
        return await self._arequest("GET", f"/api/tasks/{task_id}")

    def get_proof(self, task_id: str) -> dict[str, Any]:
        payload = self.check_task(task_id)
        task = payload.get("task") or {}
        campaign = task.get("campaign") or {}
        return {
            "task_id": task.get("id"),
            "title": task.get("title"),
            "proof_requirements": campaign.get("proofRequirements") or [],
            "evidence": task.get("evidence") or [],
            "verification_status": task.get("status"),
            "payment": payload.get("payment"),
        }

    async def aget_proof(self, task_id: str) -> dict[str, Any]:
        payload = await self.acheck_task(task_id)
        task = payload.get("task") or {}
        campaign = task.get("campaign") or {}
        return {
            "task_id": task.get("id"),
            "title": task.get("title"),
            "proof_requirements": campaign.get("proofRequirements") or [],
            "evidence": task.get("evidence") or [],
            "verification_status": task.get("status"),
            "payment": payload.get("payment"),
        }

    def list_categories(self) -> dict[str, Any]:
        return self._request("GET", "/api/agent/tasks/categories")

    async def alist_categories(self) -> dict[str, Any]:
        return await self._arequest("GET", "/api/agent/tasks/categories")
