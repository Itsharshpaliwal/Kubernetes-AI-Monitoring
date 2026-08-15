from fastapi import APIRouter
from kubernetes import client, config

router = APIRouter(
    prefix="/nodes",
    tags=["Nodes"],
)


def parse_cpu(cpu: str | None) -> str | None:
    if not cpu:
        return None

    if cpu.endswith("n"):
        value = int(cpu[:-1])
        return f"{value / 1_000_000:.0f}m"

    if cpu.endswith("u"):
        value = int(cpu[:-1])
        return f"{value / 1000:.0f}m"

    return cpu


def parse_memory(memory: str | None) -> str | None:
    if not memory:
        return None

    if memory.endswith("Ki"):
        value = int(memory[:-2])
        return f"{value / 1024:.0f}Mi"

    if memory.endswith("Mi"):
        return memory

    if memory.endswith("Gi"):
        return memory

    return memory


@router.get("")
async def get_nodes():
    try:
        config.load_incluster_config()

        v1 = client.CoreV1Api()
        custom_api = client.CustomObjectsApi()

        # Get Kubernetes nodes
        result = v1.list_node()

        # Get Metrics Server node metrics
        metrics = custom_api.list_cluster_custom_object(
            group="metrics.k8s.io",
            version="v1beta1",
            plural="nodes",
        )

        metrics_by_node = {
            item["metadata"]["name"]: item
            for item in metrics.get("items", [])
        }

        nodes = []

        for node in result.items:

            # -------------------------
            # Node Role
            # -------------------------
            roles = [
                key.split("/")[-1]
                for key in (node.metadata.labels or {})
                if key.startswith("node-role.kubernetes.io/")
            ]

            role = ", ".join(roles) if roles else "worker"

            # -------------------------
            # Node Status
            # -------------------------
            status = "Unknown"

            for condition in node.status.conditions or []:
                if condition.type == "Ready":
                    status = condition.status
                    break

            # -------------------------
            # Internal IP
            # -------------------------
            internal_ip = None

            for address in node.status.addresses or []:
                if address.type == "InternalIP":
                    internal_ip = address.address
                    break

            # -------------------------
            # Kubernetes Version
            # -------------------------
            kubernetes_version = None

            if node.status.node_info:
                kubernetes_version = node.status.node_info.kubelet_version

            # -------------------------
            # Capacity
            # -------------------------
            capacity = node.status.capacity or {}

            cpu_capacity = capacity.get("cpu")
            memory_capacity = capacity.get("memory")

            # -------------------------
            # Metrics
            # -------------------------
            cpu = None
            memory = None

            node_metric = metrics_by_node.get(node.metadata.name)

            if node_metric:
                usage = node_metric.get("usage", {})

                cpu = parse_cpu(usage.get("cpu"))
                memory = parse_memory(usage.get("memory"))

            # -------------------------
            # Final Node Object
            # -------------------------
            nodes.append({
                "name": node.metadata.name,
                "role": role,
                "status": status,
                "internal_ip": internal_ip,
                "kubernetes_version": kubernetes_version,

                "cpu": cpu,
                "memory": memory,

                "cpu_capacity": cpu_capacity,
                "memory_capacity": memory_capacity,
            })

        return {
            "status": "success",
            "count": len(nodes),
            "nodes": nodes,
        }

    except Exception as exc:
        return {
            "status": "error",
            "count": 0,
            "nodes": [],
            "message": str(exc),
        }
