from fastapi import APIRouter

from app.kubernetes.deployment_inspector import DeploymentInspector
from app.kubernetes.pod_inspector import PodInspector

router = APIRouter(prefix="/investigate", tags=["Investigation"])


@router.get("/deployment/{namespace}/{deployment_name}")
async def investigate_deployment(
    namespace: str,
    deployment_name: str,
):
    inspector = DeploymentInspector()

    result = inspector.inspect(
        namespace,
        deployment_name,
    )

    return {
        "status": "success",
        **result,
    }
