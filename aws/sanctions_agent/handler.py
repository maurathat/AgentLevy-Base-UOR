"""AWS Lambda — sanctions screening agent on Bedrock.

Track 2 + agentic-track integration. The sanctions agent runs on AWS as
a serverless Lambda, calls Anthropic Claude via Bedrock for the LLM
screen, and returns a structured ``SanctionsScreenResult``. The
orchestrator then wraps the result in a DerivationCert, signs it, and
anchors it to Hedera HCS — those steps stay on the orchestrator side
to keep this Lambda stateless + key-free.

Why this split
--------------
* Lambda does **only** the LLM call and structured-output parsing.
  Stateless, key-free, infinitely scalable.
* The cert chain authority (signing, content addressing, Hedera
  anchoring) stays with the compliance agent on the orchestrator.

This shape is **AgentCore-ready**: when we want the sanctions agent to
have persistent state (e.g., a cross-day fraud detector that learns
patterns), we swap the Bedrock InvokeModel call for an AgentCore
Runtime invocation — same handler shape, same input/output schema. See
the project whitepaper §6.11 / Phase 4 roadmap.

Request
-------
::

    POST /screen
    Content-Type: application/json
    {
      "names": ["ALICE WONG", "ROBERT QUINN", "MARIA SCHMIDT"],
      "sanctions_list_version": "OFAC-SDN-2026-04-15",
      "sanctions_list": { ... synthetic list, optional ... }
    }

Response
--------
::

    200 OK
    Content-Type: application/json
    {
      "sanctions_list_version": "OFAC-SDN-2026-04-15",
      "screened_at": "2026-05-05T18:42:00.123456+00:00",
      "hits": [
        {"name_screened": "ALICE WONG", "severity": "clear", ...},
        {"name_screened": "ROBERT QUINN", "severity": "exact_match", ...}
      ],
      "model": "anthropic.claude-3-5-sonnet-...",
      "agent_runtime": "lambda-bedrock"
    }
"""

from __future__ import annotations

import json
import os
import re
from datetime import datetime, timezone
from typing import Any

import boto3


# Model ID on Bedrock. Override per-region via env var if needed.
DEFAULT_MODEL_ID = os.environ.get(
    "BEDROCK_MODEL_ID",
    "global.anthropic.claude-haiku-4-5-20251001-v1:0",
)

# Bedrock client is created once per warm-Lambda invocation.
_bedrock = None


def _bedrock_client():
    global _bedrock
    if _bedrock is None:
        region = os.environ.get("BEDROCK_REGION", os.environ.get("AWS_REGION", "us-east-1"))
        _bedrock = boto3.client("bedrock-runtime", region_name=region)
    return _bedrock


SANCTIONS_TOOL = {
    "name": "emit_sanctions_screen_result",
    "description": (
        "Emit the structured sanctions-screening result. "
        "Required: one entry in `hits` per input name (never omit names — "
        "omission is a silent failure). Severity must be one of "
        "'clear', 'weak_match', 'strong_match', 'exact_match'."
    ),
    "input_schema": {
        "type": "object",
        "additionalProperties": False,
        "required": ["sanctions_list_version", "screened_at", "hits"],
        "properties": {
            "sanctions_list_version": {"type": "string"},
            "screened_at": {"type": "string", "description": "ISO 8601 UTC timestamp"},
            "hits": {
                "type": "array",
                "items": {
                    "type": "object",
                    "additionalProperties": False,
                    "required": ["name_screened", "severity"],
                    "properties": {
                        "name_screened": {"type": "string"},
                        "severity": {
                            "type": "string",
                            "enum": ["clear", "weak_match", "strong_match", "exact_match"],
                        },
                        "matched_sanctions_entry": {"type": ["string", "null"]},
                        "notes": {"type": ["string", "null"]},
                    },
                },
            },
        },
    },
}


SYSTEM_PROMPT = """\
You are a sanctions-screening agent. Your role is narrow: take a list of
names, screen each against the sanctions list provided in the user
message, and emit a structured `SanctionsScreenResult` via the
`emit_sanctions_screen_result` tool.

Discipline:
- Always emit one hit per input name (never omit names — omission is a
  silent failure).
- Categorize each as 'clear', 'weak_match', 'strong_match', or
  'exact_match'.
- Record the matched sanctions-list entry verbatim if applicable.
- Never invent matches; never suppress matches.
"""


def _invoke_bedrock(names: list[str], sanctions_list: dict, list_version: str) -> dict:
    """Call Bedrock (Claude) with tool-use enforced for structured output."""
    client = _bedrock_client()

    user_message = (
        f"Screen each of these names against the sanctions list. "
        f"Use 'sanctions_list_version' = {list_version!r}. "
        f"Set 'screened_at' to the current UTC ISO 8601 timestamp. "
        f"For each name, include a hit entry — clear if no match.\n\n"
        f"Names: {names}\n\n"
        f"Sanctions list (synthetic):\n{json.dumps(sanctions_list, indent=2)}"
    )

    body = {
        "anthropic_version": "bedrock-2023-05-31",
        "max_tokens": 4096,
        "temperature": 0.0,
        "system": SYSTEM_PROMPT,
        "messages": [{"role": "user", "content": user_message}],
        "tool_choice": {"type": "tool", "name": SANCTIONS_TOOL["name"]},
        "tools": [SANCTIONS_TOOL],
    }

    response = client.invoke_model(
        modelId=DEFAULT_MODEL_ID,
        body=json.dumps(body),
        contentType="application/json",
        accept="application/json",
    )
    payload = json.loads(response["body"].read())

    # Find the tool_use block — tool_choice forces exactly one.
    for block in payload.get("content", []):
        if block.get("type") == "tool_use":
            return block["input"]

    raise RuntimeError(f"Bedrock returned no tool_use block: {payload!r}")


def _normalize_screened_at(ts: str | None) -> str:
    """LLM might return a slightly off-spec timestamp; backstop with current UTC."""
    if ts:
        try:
            datetime.fromisoformat(ts.replace("Z", "+00:00"))
            return ts
        except (ValueError, TypeError):
            pass
    return datetime.now(timezone.utc).isoformat()


def lambda_handler(event: dict, context: Any) -> dict:
    """API Gateway HTTP API → Lambda Proxy integration.

    Returns the structured screening result + agent-runtime metadata
    so the orchestrator can record where the screening was performed.
    """
    try:
        # API Gateway HTTP API wraps the body as a string.
        body = event.get("body") or "{}"
        if isinstance(body, str):
            body = json.loads(body)

        names = body.get("names")
        if not isinstance(names, list) or not names:
            return _resp(400, {"error": "expected `names`: non-empty list of strings"})

        list_version = body.get("sanctions_list_version", "OFAC-SDN-DEFAULT")
        sanctions_list = body.get("sanctions_list") or _default_sanctions_list(list_version)

        result = _invoke_bedrock(names, sanctions_list, list_version)
        result["screened_at"] = _normalize_screened_at(result.get("screened_at"))

        return _resp(
            200,
            {
                **result,
                "model": DEFAULT_MODEL_ID,
                "agent_runtime": "aws-lambda-bedrock",
                "request_id": getattr(context, "aws_request_id", None),
            },
        )

    except Exception as e:
        # CloudWatch will capture the full traceback automatically.
        return _resp(500, {"error": str(e), "type": type(e).__name__})


def _resp(status: int, body: dict) -> dict:
    return {
        "statusCode": status,
        "headers": {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
        },
        "body": json.dumps(body),
    }


def _default_sanctions_list(version: str) -> dict:
    """Synthetic sanctions list embedded in the Lambda for the demo path.
    Production would fetch the real OFAC SDN feed from S3 or an external API."""
    return {
        "list_version": version,
        "source": "Synthetic for AgentLevy demo (not real OFAC data)",
        "entries": [
            {"name": "ROBERT QUINN", "list": "OFAC SDN", "reason": "Synthetic test entry", "match_strength": "exact"},
            {"name": "ROBERT Q.", "list": "EU CFSP", "reason": "Synthetic test entry", "match_strength": "weak"},
            {"name": "VLADIMIR SYNTHETIC", "list": "OFAC SDN", "reason": "Synthetic test entry", "match_strength": "exact"},
        ],
    }
