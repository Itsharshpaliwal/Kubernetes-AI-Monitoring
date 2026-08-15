from fastapi import APIRouter, HTTPException
from kubernetes import client
from loguru import logger

from app.kubernetes.config_loader import load_kubernetes_config

router = APIRouter(
    prefix="/investigate/pod",
    tags=["Pod Investigation"],
)


@router.get("/{namespace}/{pod_name}")
async def investigate_pod(namespace: str, pod_name: str):
    try:
        load_kubernetes_config()

        core = client.CoreV1Api()

        pod = core.read_namespaced_pod(
            name=pod_name,
            namespace=namespace,
        )

        phase = pod.status.phase or "Unknown"
        node = pod.spec.node_name

        containers = []
        problems = []
        warnings = []

        statuses = pod.status.container_statuses or []

        for status in statuses:
            state = "Unknown"
            reason = None
            message = None

            if status.state:
                if status.state.running:
                    state = "Running"
                elif status.state.waiting:
                    state = "Waiting"
                    reason = status.state.waiting.reason
                    message = status.state.waiting.message
                elif status.state.terminated:
                    state = "Terminated"
                    reason = status.state.terminated.reason
                    message = status.state.terminated.message

            current_started_at = None

            if (
                status.state
                and status.state.running
                and status.state.running.started_at
            ):
                current_started_at = (
                    status.state.running.started_at.isoformat()
                )

            last_state = {}

            if status.last_state and status.last_state.terminated:
                terminated = status.last_state.terminated

                last_state = {
                    "state": "Terminated",
                    "reason": terminated.reason,
                    "message": terminated.message,
                    "exit_code": terminated.exit_code,
                    "signal": terminated.signal,
                    "started_at": (
                        terminated.started_at.isoformat()
                        if terminated.started_at
                        else None
                    ),
                    "finished_at": (
                        terminated.finished_at.isoformat()
                        if terminated.finished_at
                        else None
                    ),
                }

            containers.append({
                "name": status.name,
                "ready": status.ready,
                "started": status.started,
                "restart_count": status.restart_count,
                "state": state,
                "reason": reason,
                "message": message,
                "current_started_at": current_started_at,
                "last_state": last_state,
            })

            if not status.ready:
                problems.append(
                    f"Container {status.name} is not ready"
                )

            if state == "Waiting":
                problems.append(
                    f"Container {status.name} is waiting"
                    + (f": {reason}" if reason else "")
                )

            if state == "Terminated":
                problems.append(
                    f"Container {status.name} is terminated"
                    + (f": {reason}" if reason else "")
                )

            if status.restart_count > 0:
                warnings.append(
                    f"Container {status.name} has restarted "
                    f"{status.restart_count} time(s)"
                )

        if phase not in ["Running", "Succeeded"]:
            problems.append(f"Pod phase is {phase}")

        events = core.list_namespaced_event(
            namespace=namespace,
            field_selector=f"involvedObject.name={pod_name}",
        )

        pod_events = []

        for event in events.items:
            event_data = {
                "type": event.type,
                "reason": event.reason,
                "message": event.message,
                "count": event.count,
                "last_timestamp": (
                    event.last_timestamp.isoformat()
                    if event.last_timestamp
                    else None
                ),
            }

            pod_events.append(event_data)

            if event.type == "Warning":
                problems.append(
                    f"{event.reason}: {event.message}"
                )

        healthy = len(problems) == 0

        if healthy and warnings:
            summary = (
                "Pod is currently healthy, but historical "
                "restart activity was detected."
            )
        elif healthy:
            summary = "Pod is currently healthy."
        else:
            summary = (
                "Pod has current health problems that "
                "require investigation."
            )

        return {
            "status": "success",
            "healthy": healthy,
            "pod": {
                "name": pod.metadata.name,
                "namespace": pod.metadata.namespace,
                "phase": phase,
                "node": node,
            },
            "containers": containers,
            "events": pod_events,
            "health": {
                "current": "Healthy" if healthy else "Unhealthy",
                "restart_detected": any(
                    c["restart_count"] > 0
                    for c in containers
                ),
            },
            "diagnosis": {
                "healthy": healthy,
                "summary": summary,
                "problems": problems,
                "warnings": warnings,
            },
        }

    except client.exceptions.ApiException as exc:
        if exc.status == 404:
            raise HTTPException(
                status_code=404,
                detail=(
                    f"Pod '{pod_name}' not found "
                    f"in namespace '{namespace}'"
                ),
            )

        logger.exception("Kubernetes API error")

        raise HTTPException(
            status_code=500,
            detail=str(exc),
        )

    except Exception as exc:
        logger.exception("Pod investigation failed")

        raise HTTPException(
            status_code=500,
            detail=str(exc),
        )
