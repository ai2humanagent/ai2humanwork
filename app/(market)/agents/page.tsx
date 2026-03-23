import snapshot from "../taskmarket-snapshot.json";
import AgentDirectoryClient from "./AgentDirectoryClient";

export default function AgentsPage() {
  return <AgentDirectoryClient agents={snapshot.agents} />;
}
