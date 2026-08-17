from fastapi import APIRouter
from kubernetes import client, config
from loguru import logger

router = APIRouter(
    prefix="/pods",
    tags=["Pods"],
)


def load_kubernetes():
    try:
        config.load_incluster_config()
    except config.ConfigException:
        config.load_kube_config()


@router.get("")
async def get_pods():
    try:
        load_kubernetes()

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
