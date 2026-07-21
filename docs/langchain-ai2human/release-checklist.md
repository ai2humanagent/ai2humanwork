# langchain-ai2human Release Checklist

## Current status

- Package name: `langchain-ai2human`
- Version: `0.1.0`
- PyPI name check: available as of 2026-07-21 (`https://pypi.org/pypi/langchain-ai2human/json` returned `404`)
- Local tests: passed
- Build artifacts: passed `twine check`

## Verified locally

```bash
cd integrations/langchain-ai2human
python -m pytest -q
python -m build
python -m twine check dist/*
```

Result:

```text
4 passed
Successfully built langchain_ai2human-0.1.0.tar.gz and langchain_ai2human-0.1.0-py3-none-any.whl
twine check: PASSED
```

## Publish to PyPI

Requires a PyPI API token with permission to create or publish `langchain-ai2human`.

```bash
cd integrations/langchain-ai2human
python -m twine upload dist/*
```

Recommended token-based upload:

```bash
export TWINE_USERNAME="__token__"
export TWINE_PASSWORD="pypi-..."
python -m twine upload dist/*
```

## Smoke test after PyPI publish

```bash
python -m venv /tmp/a2h-langchain-smoke
source /tmp/a2h-langchain-smoke/bin/activate
python -m pip install --upgrade pip
python -m pip install langchain-ai2human
python - <<'PY'
from langchain_ai2human import AI2HumanToolkit
print([tool.name for tool in AI2HumanToolkit().get_tools()])
PY
```

Expected:

```text
['ai2human_list_categories', 'ai2human_create_task', 'ai2human_check_task', 'ai2human_get_proof']
```

## LangChain docs PR

After PyPI publish, submit a LangChain docs PR that introduces AI2Human as a third-party integration for reality-bound agent tasks.

Core positioning:

```text
AI2Human is the LangChain tool for reality-bound tasks agents cannot complete alone.
```

Do not submit the docs PR before the PyPI package resolves publicly.
