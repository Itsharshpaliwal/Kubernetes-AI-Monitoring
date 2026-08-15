from typing import Any

from loguru import logger

from app.kubernetes.kubectl_executor import KubectlExecutor


class DeploymentInspector:
    def __init__(self, context: str | None = None):
        self.executor = KubectlExecutor(context)

    def inspect(self, namespace: str, deployment_name: str) -> dict[str, Any]:
        logger.info(
            "Inspecting deployment {}/{}",
            namespace,
            deployment_name,
        )

        result = self.executor.run([
            "get",
            "deployment",
            deployment_name,
            "-n",
            namespace,
            "-o",
            "json",
        ])

        if not result["success"]:
            return {
                "healthy": False,
                "deployment": None,
                "problems": [result["stderr"]],
            }

        try:
            import json

            deployment = json.loads(result["stdout"])

            spec = deployment.get("spec", {})
            status = deployment.get("status", {})

            desired = spec.get("replicas", 0)
            ready = status.get("readyReplicas", 0)
            available = status.get("availableReplicas", 0)
            updated = status.get("updatedReplicas", 0)

            problems = []

            if ready != desired:
                problems.append(
                    f"Ready replicas {ready}/{desired}"
                )

            if available != desired:
                problems.append(
                    f"Available replicas {available}/{desired}"
                )

            if updated != desired:
                problems.append(
                    f"Updated replicas {updated}/{desired}"
                )

            conditions = status.get("conditions", [])

            for condition in conditions:
                if condition.get("type") == "Available":
                    if condition.get("status") != "True":
                        problems.append(
                            condition.get(
                                "message",
                                "Deployment is not available",
                            )
                        )

                if condition.get("type") == "Progressing":
                    if condition.get("status") == "False":
                        problems.append(
                            condition.get(
                                "message",
                                "Deployment is not progressing",
                            )
                        )

            return {
                "healthy": len(problems) == 0,
                "deployment": {
                    "name": deployment_name,
                    "namespace": namespace,
                    "desired_replicas": desired,
                    "ready_replicas": ready,
                    "available_replicas": available,
                    "updated_replicas": updated,
                },
                "diagnosis": {
                    "healthy": len(problems) == 0,
                    "problems": problems,
                },
            }

        except Exception as exc:
            logger.exception("Deployment inspection failed")

            return {
                "healthy": False,
                "deployment": None,
                "problems": [str(exc)],
            }
