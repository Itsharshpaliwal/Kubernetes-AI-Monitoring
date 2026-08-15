from fastapi import APIRouter

from app.api.diagnosis import diagnose
from app.ai_service import AIService


router = APIRouter(
    prefix="/investigate",
    tags=["AI Diagnosis"],
)


@router.get("/ai-diagnose")
async def ai_diagnose():

    diagnosis = await diagnose()

    ai = AIService()

    result = await ai.analyze(diagnosis)

    return {
        "status": "success",
        "kubernetes": diagnosis,
        "ai": result,
    }
