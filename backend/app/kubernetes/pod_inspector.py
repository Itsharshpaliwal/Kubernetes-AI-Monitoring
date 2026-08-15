from typing import Any
import json

from loguru import logger

from app.kubernetes.kubectl_executor import KubectlExecutor


class PodInspector:
    def __init__(self, context: str | None = None):
        self.executor = KubectlExecutor(context)

    def inspect(self) -> dict[str, Any]:
        logger.info("Inspecting Kubernetes pods")

        result = self.executor.run([
            "get",
            "pods",
            "-A",
            "-o",
            "json",
        ])

        if not result["success"]:
            return {
                "healthy": False,
                "problematic_pods": [],
                "error": result["stderr"],
            }

        try:
            data = json.loads(result["stdout"])
        except json.JSONDecodeError as exc:
            logger.exception("Failed to parse Kubernetes pod JSON")
            return {
                "healthy": False,
                "problematic_pods": [],
                "error": str(exc),
            }

        problematic_pods = []

        unhealthy_statuses = {
            "CrashLoopBackOff",
            "ImagePullBackOff",
            "Pending",
            "Error",
            "ContainerCreating",
            "OOMKilled",
        }

        for item in data.get("items", []):
            metadata = item.get("metadata", {})
            status_data = item.get("status", {})

            namespace = metadata.get("namespace")
            name = metadata.get("name")
            phase = status_data.get("phase", "Unknown")

            container_statuses = status_data.get(
                "containerStatuses",
                []
            )

            pod_problem = phase in {
                "Pending",
                "Failed",
                "Unknown",
            }

            containers = []

            for container in container_statuses:
                container_name = container.get("name")
                restart_count = container.get("restartCount", 0)

                state = container.get("state", {})
                last_state = container.get("lastState", {})

                current_state = "Unknown"
                reason = None
                exit_code = None
                signal = None

                if "waiting" in state:
                    current_state = "waiting"
                    waiting = state["waiting"]
                    reason = waiting.get("reason")

                    if reason in unhealthy_statuses:
                        pod_problem = True

                elif "running" in state:
                    current_state = "running"

                elif "terminated" in state:
                    current_state = "terminated"
                    terminated = state["terminated"]
                    reason = terminated.get("reason")
                    exit_code = terminated.get("exitCode")
                    signal = terminated.get("signal")

                    if (
                        reason in unhealthy_statuses
                        or exit_code not in (None, 0)
                    ):
                        pod_problem = True

                # Also inspect previous container state.
                if "terminated" in last_state:
                    previous = last_state["terminated"]

                    if previous.get("exitCode") not in (None, 0):
                        pod_problem = True

                containers.append({
                    "name": container_name,
                    "state": current_state,
                    "reason": reason,
                    "exit_code": exit_code,
                    "signal": signal,
                    "restart_count": restart_count,
                })

            ready_count = sum(
                1
                for container in container_statuses
                if container.get("ready") is True
            )

            total_containers = len(container_statuses)

            ready = f"{ready_count}/{total_containers}"

            if pod_problem:
                problematic_pods.append({
                    "name": name,
                    "namespace": namespace,
                    "status": phase,
                    "ready": ready,
                    "containers": containers,
                })

        return {
            "healthy": len(problematic_pods) == 0,
            "problematic_pods": problematic_pods,
        }
