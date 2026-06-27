import AgentSkillConsoleClient from "./AgentSkillConsoleClient";

export const metadata = {
  title: "Agent Skill Console | AI2Human",
  description:
    "Test the AI2Human Agent Skill flow: preview a human fallback campaign, create a draft, inspect funding, and publish only after verification gates pass."
};

export default function AgentSkillConsolePage() {
  return <AgentSkillConsoleClient />;
}
