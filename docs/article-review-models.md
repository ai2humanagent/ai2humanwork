# Article Review Multi-Model Setup

AI2Human article contests use a weighted review layer for X article/post/thread submissions.

The review pipeline is:

1. Fetch live X content from the submitted URL.
2. Use submitted article text only when live fetching fails.
3. Apply the project relevance gate.
4. Ask all configured review models for JSON scores.
5. Aggregate successful model scores with weighted consensus.
6. Store every model score, failure, and reviewed text excerpt in the audit log.

## Environment Variables

At least one provider must be configured.

```bash
# Optional provider allowlist. If omitted, all enabled configured providers are attempted.
ARTICLE_REVIEW_PROVIDERS=openai,mimo,minimax,deepseek,anthropic

# GPT / OpenAI-compatible default
OPENAI_API_KEY=
OPENAI_BASE_URL=https://api.openai.com/v1
OPENAI_MODEL=gpt-4o-mini
OPENAI_REVIEW_WEIGHT=1

# Xiaomi MiMo. Set MIMO_PROTOCOL=anthropic when using Xiaomi's Anthropic-compatible endpoint.
MIMO_API_KEY=
MIMO_AUTH_TOKEN=
MIMO_BASE_URL=
MIMO_MODEL=MiMo-V2.5-Pro
MIMO_PROTOCOL=openai_compatible
MIMO_REVIEW_WEIGHT=1

# MiniMax / OpenAI-compatible gateway
MINIMAX_API_KEY=
MINIMAX_BASE_URL=https://minnimax.chat/v1
MINIMAX_MODEL=MiniMax-M2.7-highspeed
MINIMAX_REVIEW_WEIGHT=1

# DeepSeek / OpenAI-compatible gateway
DEEPSEEK_API_KEY=
DEEPSEEK_BASE_URL=https://api.deepseek.com
DEEPSEEK_MODEL=deepseek-v4-pro
DEEPSEEK_REVIEW_WEIGHT=1

# Claude / Anthropic native API
ANTHROPIC_API_KEY=
ANTHROPIC_AUTH_TOKEN=
ANTHROPIC_BASE_URL=https://api.anthropic.com
ANTHROPIC_MODEL=claude-3-5-sonnet-latest
ANTHROPIC_REVIEW_WEIGHT=1
```

Individual providers can be disabled:

```bash
ARTICLE_REVIEW_MIMO_ENABLED=false
ARTICLE_REVIEW_ANTHROPIC_ENABLED=false
```

## Audit Output

Each reviewed submission stores:

- final weighted score
- final weighted rubric
- public-facing review summary
- live X source or fallback source
- reviewed text excerpt
- active model count
- skipped/failed model count
- per-model score, status, latency, and failure reason

This lets the admin page explain whether the result came from one model or a multi-model weighted consensus.
