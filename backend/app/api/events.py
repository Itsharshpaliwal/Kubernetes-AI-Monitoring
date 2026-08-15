from fastapi import APIRouter, Query

from app.kubernetes.events_analyzer import EventsAnalyzer


router = APIRouter(
    prefix="/investigate",
    tags=["Events Investigation"],
)


@router.get("/events")
async def investigate_events(
    namespace: str | None = Query(default=None),
):
    analyzer = EventsAnalyzer()

    result = analyzer.analyze(namespace)

    return {
        "status": "success" if result["healthy"] else "warning",
        **result,
    }
