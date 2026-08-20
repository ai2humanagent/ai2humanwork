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
    title: "How to make an agent prove it did the job",
    date: "August 20, 2026",
    status: "Technical note",
    excerpt:
      "Agents are great at claiming things. We built verify(claim, evidence) → verdict + receipt — the missing primitive that turns “done” from a model’s opinion into a verifiable fact."
  }
];
