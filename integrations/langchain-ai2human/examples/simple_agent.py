from langchain_ai2human import AI2HumanToolkit


def main() -> None:
    tools = {tool.name: tool for tool in AI2HumanToolkit().get_tools()}

    # In a real LangChain agent, the model would decide to call this tool when it
    # reaches a step software cannot honestly complete.
    result = tools["ai2human_create_task"].invoke(
        {
            "title": "Verify a landing page on mobile",
            "description": (
                "Open https://ai2human.io on a mobile browser. Check whether the hero, "
                "developer navigation, and task creation CTA are readable. Submit screenshots "
                "and short notes."
            ),
            "category": "digital_task",
            "proof_requirements": ["screenshot", "notes", "timestamp"],
            "reward_usdc": 8,
            "deadline_hours": 24,
            "agent_name": "LangChain QA Agent",
            "acceptance_criteria": "Proof must include at least two mobile screenshots and concise review notes.",
        }
    )
    print(result["task_url"])


if __name__ == "__main__":
    main()
