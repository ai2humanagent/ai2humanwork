# Work402-Inspired Phase 1 Plan

## Core Position

Work402 makes agent-to-agent hiring easy.
AI2Human should make agent-to-human fallback easy.

The message is simple:

```text
When an agent gets blocked by a human gate, route the step to AI2Human.
```

Human gates include real X account actions, screenshots, local checks, receipts, human judgment, proof review, and payment settlement.

## Phase 1 Scope

Goal: make outside projects and agent builders understand and use AI2Human within one minute.

| Item | What We Ship | Why It Matters | Status |
| --- | --- | --- | --- |
| For Agents page | A clear page explaining human fallback, templates, and the agent handoff loop | Gives founders/builders a link that explains the product without a call | Shipped |
| Agent skill file | `/agent/skill.md` with one-line onboarding instruction and task pattern | Lets agent frameworks copy the Work402 style of "read this skill and join" | Shipped |
| Agent manifest | `/agent/manifest.json` with endpoint, templates, allowed use cases, and examples | Gives external agents a machine-readable entrypoint | Shipped |
| API examples | `/agent/examples/create-human-task.json` and `/agent/examples/create-lucky-draw-task.json` | Lets agents reuse normal and lucky draw task payloads | Shipped |
| Create Human Task entry | Sidebar link and creation form changed from official-only wording to project/agent wording | Makes third-party projects feel allowed to create tasks | Shipped |
| Agent handoff packet | Create page shows copyable JSON with reward, deadline, proof rules, and verification checks | Lets agents and project teams reuse one structured task packet | Shipped |
| Safe preview endpoint | `/api/tasks/preview` validates and returns the public task preview without writing DB rows or notifying users | Lets third-party agents test payloads safely before creating a live task | Shipped |
| Campaign templates | X engagement, content, banner/meme, feedback, community proof | Gives project teams fast starting points | Shipped |
| Homepage nav | Adds `For Agents` to the public nav | Makes the agent-facing path discoverable | Shipped |

## Two-Week Market Goal

Bring at least 5 external projects into AI2Human and get at least 2 of them to publish a real reward task.

Target groups:

- Base ecosystem projects
- Virtuals ecosystem projects
- Bankr-launched agents and tokens
- Aeon-adjacent agent teams
- Small AI agent projects that need X growth, content, feedback, or proof tasks

## Weekly Execution

### Week 1

| Day | Task | Output |
| --- | --- | --- |
| Day 1 | Publish For Agents page and skill link | Shareable link for outreach |
| Day 1 | Prepare 3 task examples | X engagement, banner contest, product feedback |
| Day 2 | DM 20 Base/agent projects | Ask them to test one small reward task |
| Day 3 | Help 1 project create a task manually | First non-AI2Human task case |
| Day 4 | Post a public demo of the agent handoff loop | Show blocked step -> AI2Human task -> proof |
| Day 5 | Write public recap | "Agents need human fallback, here is the first version" |

### Week 2

| Day | Task | Output |
| --- | --- | --- |
| Day 6-7 | Improve task creation UX from feedback | Fewer fields, clearer template copy |
| Day 8 | Add one-click duplicate from example tasks | Faster task publishing |
| Day 9 | Publish partner task screenshots | Social proof for project teams |
| Day 10 | DM another 30 projects | Focus on projects already running X growth tasks |
| Day 11 | Draft Create Human Task API spec | Prepare agent-native integration |
| Day 12-14 | Convert 2 projects into recurring campaigns | Prove this can become a real market |

## Product Rule

Do not position AI2Human as a generic task marketplace.

Position it as:

```text
Human fallback infrastructure for AI agents.
```

Every task card and campaign should show:

- the blocked human step
- the proof required
- the verification rule
- the settlement path

## Next Build After Phase 1

Harden Create Human Task API:

```text
POST /api/human-tasks
```

Current alpha uses:

```text
POST /api/tasks
```

Next hardening step: add auth/rate limits, webhook callback, and a dedicated agent-facing route once external projects start testing the current payload format.
