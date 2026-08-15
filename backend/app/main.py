from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api.clusters import router as clusters_router
from app.api.pod_investigation import router as pod_investigation_router
from app.api.pods import router as pods_router
from app.api.investigation import router as investigation_router
from app.api.events import router as events_router
from app.api.diagnosis import router as diagnosis_router
from app.api.ai_diagnosis import router as ai_diagnosis_router
from app.api.nodes import router as nodes_router
from app.api.auth import router as auth_router
app = FastAPI(
    title="AI Kubernetes Agent",
    description="AI-powered Kubernetes troubleshooting platform",
    version="0.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(clusters_router)
app.include_router(pod_investigation_router)
app.include_router(pods_router)
app.include_router(investigation_router)
app.include_router(events_router)
app.include_router(diagnosis_router)
app.include_router(ai_diagnosis_router)
app.include_router(nodes_router)
app.include_router(auth_router)

@app.get("/health")
async def health():
    return {
        "status": "healthy",
        "service": "ai-kubernetes-agent",
    }
