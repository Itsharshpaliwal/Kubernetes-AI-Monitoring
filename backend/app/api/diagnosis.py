from fastapi import APIRouter

from app.kubernetes.pod_inspector import PodInspector
from app.kubernetes.events_analyzer import EventsAnalyzer

router = APIRouter(
    prefix="/investigate",
    tags=["Diagnosis"],
)


@router.get("/diagnose")
async def diagnose():
    pod_result = PodInspector().inspect()
    event_result = EventsAnalyzer().analyze()

    problematic_pods = pod_result.get("problematic_pods", [])
    warning_events = event_result.get("events", [])

    problems = []

    for pod in problematic_pods:
        problems.append({
            "type": "pod",
            "namespace": pod.get("namespace"),
            "name": pod.get("name"),
            "status": pod.get("status"),
            "ready": pod.get("ready"),
            "containers": pod.get("containers", []),
        })

    for event in warning_events:
        problems.append({
            "type": "event",
            "namespace": event.get("namespace"),
            "object": event.get("object"),
            "reason": event.get("reason"),
            "explanation": event.get("explanation"),
            "message": event.get("message"),
        })

    healthy = len(problems) == 0

    if healthy:
        diagnosis = "Kubernetes cluster is currently healthy."
        recommendations = []
    else:
        diagnosis = "Kubernetes warnings or unhealthy resources were detected."

        recommendations = []

        if problematic_pods:
            recommendations.extend([
                "Inspect the affected pod status.",
                "Check pod logs for application errors.",
                "Check container restart counts and events.",
            ])

        if warning_events:
            recommendations.extend([
                "Review Kubernetes warning events.",
                "Investigate the affected Kubernetes resources.",
            ])

    return {
        "status": "success",
        "healthy": healthy,
        "summary": {
            "problematic_pods": len(problematic_pods),
            "warning_events": len(warning_events),
            "total_problems": len(problems),
        },
        "diagnosis": diagnosis,
        "problems": problems,
        "recommendations": recommendations,
    }
