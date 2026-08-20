# Research Articles

This is the canonical home for AI2Human research and technical articles. All future articles go here.

## How to publish a new article

1. Add the article body as Markdown: `content/research/<slug>.md`
2. Register it in `app/lib/researchArticles.ts` (title, date, status, excerpt, slug)
3. It appears automatically on `/research` and at `/research/articles/<slug>`

## Conventions

- Articles are plain Markdown (headings, paragraphs, lists, code fences, tables).
- The title lives in the manifest; the Markdown body starts with the first paragraph (no leading `#`).
- Keep metadata in `researchArticles.ts` — no front matter parsing needed.
- English by default; the research page is English-first.
