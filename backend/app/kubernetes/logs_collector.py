from typing import Any

from loguru import logger

from app.kubernetes.kubectl_executor import KubectlExecutor


class LogsCollector:
    def __init__(self, context: str | None = None):
        self.executor = KubectlExecutor(context)

    def collect(
        self,
        problematic_pods: list[dict[str, Any]],
        max_lines: int = 100,
    ) -> dict[str, Any]:

        logs = {}

        for pod in problematic_pods:
            name = pod["name"]
            namespace = pod["namespace"]

            logger.info(
                "Collecting logs for pod {}/{}",
                namespace,
                name,
            )

            result = self.executor.run([
                "logs",
                name,
                "-n",
                namespace,
                "--tail",
                str(max_lines),
            ])

            pod_key = f"{namespace}/{name}"

            if result["success"]:
                logs[pod_key] = {
                    "success": True,
                    "logs": result["stdout"],
                }
            else:
                logs[pod_key] = {
                    "success": False,
                    "logs": "",
                    "error": result["stderr"],
                }

        return logs
