export type ResearchArticle = {
  slug: string;
  title: string;
  date: string;
  status: string;
  excerpt: string;
};

export const researchArticles: ResearchArticle[] = [
  {
    slug: "agents-must-prove",
    title: "Agents can't prove they did the job — so we built the verify primitive",
    date: "August 20, 2026",
    status: "Technical note",
    excerpt:
      "Agents are great at claiming things. We built verify(claim, evidence) → verdict + receipt — the missing primitive that turns “done” from a model’s opinion into a verifiable fact."
  }
];
