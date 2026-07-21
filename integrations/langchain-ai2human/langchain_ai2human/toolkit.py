from langchain_core.tools import BaseTool, BaseToolkit
from pydantic import ConfigDict

from .client import AI2HumanClient
from .tools import (
    AI2HumanCheckTaskTool,
    AI2HumanCreateTaskTool,
    AI2HumanGetProofTool,
    AI2HumanListCategoriesTool,
)


class AI2HumanToolkit(BaseToolkit):
    """Tools for escalating reality-bound agent steps to human execution."""

    model_config = ConfigDict(arbitrary_types_allowed=True)

    client: AI2HumanClient | None = None

    def get_tools(self) -> list[BaseTool]:
        client = self.client or AI2HumanClient()
        return [
            AI2HumanListCategoriesTool(client=client),
            AI2HumanCreateTaskTool(client=client),
            AI2HumanCheckTaskTool(client=client),
            AI2HumanGetProofTool(client=client),
        ]
