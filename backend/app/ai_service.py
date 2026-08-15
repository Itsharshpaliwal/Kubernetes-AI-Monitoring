from typing import Any

import httpx
from loguru import logger

from app.core.config import settings


class AIService:

    def __init__(self):
        self.api_url = "https://openrouter.ai/api/v1/chat/completions"
        self.model = settings.ai_model

        logger.info(
            "AIService initialized with model={}",
            self.model,
        )

    def _build_prompt(self, diagnosis: dict[str, Any]) -> str:
        return f"""
You are an expert Kubernetes SRE and troubleshooting assistant.

Analyze the Kubernetes investigation data below.

Your job is to:

1. Identify the most likely root cause.
2. Correlate pod status, container logs, Kubernetes events,
   deployment status, and networking information.
3. Explain the problem clearly.
4. Recommend a safe Kubernetes fix.
5. Provide kubectl commands when appropriate.
6. Do not claim certainty when evidence is insufficient.
7. Do not recommend destructive commands such as deleting
   the entire cluster or namespace.

Return ONLY valid JSON with this structure:

{{
  "severity": "LOW|MEDIUM|HIGH|CRITICAL",
  "root_cause": "short root cause",
  "explanation": "detailed explanation",
  "suggested_fix": "recommended fix",
  "kubectl_commands": [
    "command 1",
    "command 2"
  ],
  "confidence": 0
}}

The confidence value must be an integer from 0 to 100.

Kubernetes investigation data:

{diagnosis}
"""

    async def analyze(self, diagnosis: dict[str, Any]) -> dict[str, Any]:
        problems = diagnosis.get("problems", [])

        if not problems:
            return {
                "status": "success",
                "severity": "LOW",
                "root_cause": "No Kubernetes problems detected.",
                "explanation": (
                    "The Kubernetes investigation layer did not detect "
                    "any unhealthy pods or recent warning events."
                ),
                "suggested_fix": (
                    "No action is required. Continue monitoring the cluster."
                ),
                "kubectl_commands": [],
                "confidence": 95,
            }

        prompt = self._build_prompt(diagnosis)

        headers = {
            "Authorization": f"Bearer {settings.openrouter_api_key}",
            "Content-Type": "application/json",
            "HTTP-Referer": settings.insforge_base_url,
            "X-Title": "AI Kubernetes Troubleshooting Agent",
        }

        payload = {
            "model": self.model,
            "messages": [
                {
                    "role": "system",
                    "content": (
                        "You are a Kubernetes SRE specializing in "
                        "production troubleshooting."
                    ),
                },
                {
                    "role": "user",
                    "content": prompt,
                },
            ],
            "temperature": 0.1,
        }

        try:
            async with httpx.AsyncClient(timeout=60.0) as client:
                response = await client.post(
                    self.api_url,
                    headers=headers,
                    json=payload,
                )

            response.raise_for_status()

            data = response.json()

            response_content = (
                data.get("choices", [{}])[0]
                .get("message", {})
                .get("content", "")
            )

            if not response_content:
                raise RuntimeError(
                    "OpenRouter returned an empty AI response."
                )

            logger.info("OpenRouter AI diagnosis received")

            return {
                "status": "success",
                "model": self.model,
                "analysis": response_content,
            }

        except httpx.HTTPStatusError as exc:
            logger.error(
                "OpenRouter HTTP error: status={}",
                exc.response.status_code,
            )

            return {
                "status": "error",
                "error": "OpenRouter request failed",
                "details": exc.response.text,
            }

        except Exception as exc:
            logger.exception("AI diagnosis failed")

            return {
                "status": "error",
                "error": "AI diagnosis failed",
                "details": str(exc),
            }
