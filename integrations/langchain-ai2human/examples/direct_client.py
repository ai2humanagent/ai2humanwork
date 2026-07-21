from langchain_ai2human import AI2HumanClient


def main() -> None:
    client = AI2HumanClient()
    task = client.create_task(
        {
            "title": "Check the posted menu price for a Tall Americano",
            "description": (
                "Visit Starbucks Times Square, NYC. Submit one clear menu photo, "
                "the posted Tall Americano price, and a short note confirming the location."
            ),
            "category": "local_verification",
            "location": "Times Square, New York City",
            "proof_requirements": ["photo", "timestamp", "notes"],
            "reward_usdc": 5,
            "deadline_hours": 4,
            "agent_name": "LangChain Research Agent",
            "acceptance_criteria": "Menu photo must show the price clearly enough for a reviewer to verify.",
        }
    )
    print(task["task_url"])


if __name__ == "__main__":
    main()
