from fastapi import APIRouter
from kubernetes import client
from loguru import logger

from app.kubernetes.config_loader import load_kubernetes_config

router = APIRouter(
    prefix="/pods",
    tags=["Pods"],
)


@router.get("")
async def get_pods():
    try:
        load_kubernetes_config()

        v1 = client.CoreV1Api()

        pods = v1.list_pod_for_all_namespaces(
            watch=False
        )

        result = []

        for pod in pods.items:
            container_statuses = pod.status.container_statuses or []

            ready_count = sum(
                1
                for container in container_statuses
                if container.ready
            )

            total_count = len(container_statuses)

            result.append(
                {
                    "namespace": pod.metadata.namespace,
                    "name": pod.metadata.name,
                    "phase": pod.status.phase,
                    "ready": f"{ready_count}/{total_count}",
                    "node": pod.spec.node_name,
                    "restarts": sum(
                        container.restart_count
                        for container in container_statuses
                    ),
                }
            )

        return {
            "status": "success",
            "count": len(result),
            "pods": result,
        }

    except Exception as exc:
        logger.exception("Pod discovery failed")

        return {
            "status": "error",
            "count": 0,
            "pods": [],
            "message": str(exc),
        }
