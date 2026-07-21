from __future__ import annotations

from typing import ClassVar, Literal, Type

from langchain_core.tools import BaseTool
from pydantic import BaseModel, Field, PrivateAttr

from .client import AI2HumanClient

TaskCategory = Literal[
    "local_verification",
    "identity_action",
    "physical_task",
    "digital_task",
    "compliance_check",
    "errand",
]
ProofType = Literal["screenshot", "photo", "url", "timestamp", "receipt", "signature", "notes"]


class CreateTaskInput(BaseModel):
    title: str = Field(description="One-line summary of the blocked workflow step.")
    description: str = Field(description="Bounded instructions for the human operator.")
    category: TaskCategory
    proof_requirements: list[ProofType] = Field(min_length=1)
    reward_usdc: float = Field(gt=0)
    deadline_hours: float = Field(gt=0)
    location: str | None = None
    agent_name: str | None = None
    acceptance_criteria: str | None = Field(
        default=None,
        description="Optional exact success condition the human proof must satisfy.",
    )


class TaskIdInput(BaseModel):
    task_id: str = Field(description="AI2Human task identifier returned by create_task.")


class AI2HumanCreateTaskTool(BaseTool):
    name: str = "ai2human_create_task"
    description: str = (
        "Dispatch a step that software cannot complete alone to a human operator. Use for local verification, "
        "physical checks, identity-bound actions, document review, compliance checks, or errands."
    )
    args_schema: ClassVar[Type[BaseModel]] = CreateTaskInput
    _client: AI2HumanClient = PrivateAttr()

    def __init__(self, client: AI2HumanClient | None = None, **kwargs):
        super().__init__(**kwargs)
        self._client = client or AI2HumanClient()

    def _run(self, **kwargs):
        return self._client.create_task(kwargs)

    async def _arun(self, **kwargs):
        return await self._client.acreate_task(kwargs)


class AI2HumanCheckTaskTool(BaseTool):
    name: str = "ai2human_check_task"
    description: str = "Check human execution, proof verification, and settlement state for a dispatched task."
    args_schema: ClassVar[Type[BaseModel]] = TaskIdInput
    _client: AI2HumanClient = PrivateAttr()

    def __init__(self, client: AI2HumanClient | None = None, **kwargs):
        super().__init__(**kwargs)
        self._client = client or AI2HumanClient()

    def _run(self, task_id: str):
        return self._client.check_task(task_id)

    async def _arun(self, task_id: str):
        return await self._client.acheck_task(task_id)


class AI2HumanGetProofTool(BaseTool):
    name: str = "ai2human_get_proof"
    description: str = "Retrieve the structured evidence bundle and recorded settlement receipt for a dispatched task."
    args_schema: ClassVar[Type[BaseModel]] = TaskIdInput
    _client: AI2HumanClient = PrivateAttr()

    def __init__(self, client: AI2HumanClient | None = None, **kwargs):
        super().__init__(**kwargs)
        self._client = client or AI2HumanClient()

    def _run(self, task_id: str):
        return self._client.get_proof(task_id)

    async def _arun(self, task_id: str):
        return await self._client.aget_proof(task_id)


class AI2HumanListCategoriesTool(BaseTool):
    name: str = "ai2human_list_categories"
    description: str = "List supported reality-bound task categories and proof types before dispatching human work."
    _client: AI2HumanClient = PrivateAttr()

    def __init__(self, client: AI2HumanClient | None = None, **kwargs):
        super().__init__(**kwargs)
        self._client = client or AI2HumanClient()

    def _run(self):
        return self._client.list_categories()

    async def _arun(self):
        return await self._client.alist_categories()
