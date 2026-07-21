import httpx
import pytest

from langchain_ai2human import AI2HumanAPIError, AI2HumanClient, AI2HumanToolkit


def test_requires_api_key():
    client = AI2HumanClient(api_key="", base_url="https://example.test")
    with pytest.raises(AI2HumanAPIError) as exc:
        client.list_categories()
    assert exc.value.status_code == 401


def test_create_task_preserves_proof_contract():
    def handler(request: httpx.Request) -> httpx.Response:
        assert request.headers["x-agent-api-key"] == "secret"
        assert request.url.path == "/api/agent/tasks"
        payload = __import__("json").loads(request.content)
        assert payload["proof_requirements"] == ["photo", "timestamp"]
        assert payload["acceptance_criteria"] == "Shelf label and timestamp must be visible."
        return httpx.Response(201, json={"task_id": "task_1", "status": "live"})

    client = AI2HumanClient(
        api_key="secret",
        base_url="https://example.test",
        transport=httpx.MockTransport(handler),
    )
    result = client.create_task(
        {
            "title": "Check a shelf",
            "description": "Confirm stock and price.",
            "category": "local_verification",
            "proof_requirements": ["photo", "timestamp"],
            "reward_usdc": 12,
            "deadline_hours": 4,
            "location": "Shanghai",
            "acceptance_criteria": "Shelf label and timestamp must be visible.",
        }
    )
    assert result["task_id"] == "task_1"


def test_toolkit_exposes_four_agent_tools():
    assert [tool.name for tool in AI2HumanToolkit().get_tools()] == [
        "ai2human_list_categories",
        "ai2human_create_task",
        "ai2human_check_task",
        "ai2human_get_proof",
    ]


def test_toolkit_reuses_injected_client():
    calls = []

    def handler(request: httpx.Request) -> httpx.Response:
        calls.append(request.url.path)
        return httpx.Response(200, json={"categories": ["digital_task"]})

    client = AI2HumanClient(
        api_key="secret",
        base_url="https://example.test",
        transport=httpx.MockTransport(handler),
    )
    tools = AI2HumanToolkit(client=client).get_tools()
    result = tools[0].invoke({})
    assert result["categories"] == ["digital_task"]
    assert calls == ["/api/agent/tasks/categories"]
