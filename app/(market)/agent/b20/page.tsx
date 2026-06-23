import B20SkillDemoClient from "./B20SkillDemoClient";

export const metadata = {
  title: "B20 Issuance Flow | AI2Human Network",
  description:
    "See how AI2Human turns an agent token request into B20 rules, roles, proof gates, policy checks, and a Base Sepolia receipt."
};

export default function B20SkillPage() {
  return <B20SkillDemoClient />;
}
