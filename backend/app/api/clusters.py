from fastapi import APIRouter
from kubernetes import client, config

router = APIRouter(
    prefix="/clusters",
    tags=["Clusters"],
)


@router.get("")
async def get_clusters():
    try:
        # Backend is running inside Kubernetes.
        config.load_incluster_config()

        v1 = client.CoreV1Api()

        namespaces = v1.list_namespace().items

        return {
            "status": "success",
            "contexts": ["in-cluster"],
            "clusters": ["kubernetes"],
            "current_context": "in-cluster",
            "namespaces": [
                namespace.metadata.name
                for namespace in namespaces
                if namespace.metadata.name
            ],
        }

    except Exception as exc:
        return {
            "status": "error",
            "contexts": [],
            "clusters": [],
            "current_context": None,
            "namespaces": [],
            "message": str(exc),
        }
