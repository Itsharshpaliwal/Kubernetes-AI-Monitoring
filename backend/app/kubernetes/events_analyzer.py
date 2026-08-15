from typing import Any
from datetime import datetime, timezone, timedelta
import json

from loguru import logger

from app.kubernetes.kubectl_executor import KubectlExecutor


class EventsAnalyzer:
    def __init__(self, context: str | None = None):
        self.executor = KubectlExecutor(context)

    def analyze(
        self,
        namespace: str | None = None,
        minutes: int = 30,
    ) -> dict[str, Any]:

        logger.info(
            "Analyzing Kubernetes warning events from last {} minutes",
            minutes,
        )

        command = ["get", "events"]

        if namespace:
            command.extend(["-n", namespace])
        else:
            command.append("-A")

        command.extend([
            "--field-selector=type=Warning",
            "-o",
            "json",
        ])

        result = self.executor.run(command)

        if not result["success"]:
            return {
                "healthy": False,
                "event_count": 0,
                "events": [],
                "problems": [result["stderr"]],
            }

        try:
            data = json.loads(result["stdout"])

            cutoff = datetime.now(timezone.utc) - timedelta(minutes=minutes)

            severity_map = {
                "FailedMount": "Storage / volume mount problem",
                "FailedScheduling": "Pod scheduling problem",
                "Failed": "Kubernetes operation failed",
                "BackOff": "Container restart/backoff problem",
                "Unhealthy": "Container health check problem",
                "FailedCreate": "Resource creation problem",
                "FailedKillPod": "Pod termination problem",
                "FailedAttachVolume": "Volume attachment problem",
                "FailedDetachVolume": "Volume detachment problem",
                "FailedPull": "Container image pull problem",
                "ErrImagePull": "Container image pull problem",
                "ImagePullBackOff": "Container image pull backoff",
            }

            events = []
            problems = []

            for item in data.get("items", []):

                event_time = (
                    item.get("lastTimestamp")
                    or item.get("eventTime")
                    or item.get("firstTimestamp")
                )

                if event_time:
                    try:
                        parsed_time = datetime.fromisoformat(
                            event_time.replace("Z", "+00:00")
                        )

                        if parsed_time < cutoff:
                            continue

                    except Exception:
                        pass

                metadata = item.get("metadata", {})
                involved = item.get("involvedObject", {})

                reason = item.get("reason", "Unknown")
                message = item.get("message", "")

                explanation = severity_map.get(
                    reason,
                    "Kubernetes warning event",
                )

                event = {
                    "namespace": metadata.get("namespace"),
                    "reason": reason,
                    "message": message,
                    "object": involved.get("name"),
                    "object_kind": involved.get("kind"),
                    "count": item.get("count", 1),
                    "timestamp": event_time,
                    "explanation": explanation,
                }

                events.append(event)

                problems.append({
                    "reason": reason,
                    "message": message,
                    "explanation": explanation,
                    "namespace": metadata.get("namespace"),
                    "object": involved.get("name"),
                })

            return {
                "healthy": len(events) == 0,
                "event_count": len(events),
                "events": events,
                "problems": problems,
            }

        except Exception as exc:
            logger.exception("Event analysis failed")

            return {
                "healthy": False,
                "event_count": 0,
                "events": [],
                "problems": [str(exc)],
            }
