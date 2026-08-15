from kubernetes import config
from loguru import logger


def load_kubernetes_config():
    """
    Load Kubernetes configuration.

    The backend currently runs directly on the Azure VM,
    outside the Kubernetes cluster, so kubeconfig is preferred.
    """
    try:
        config.load_kube_config()
        logger.info("Loaded Kubernetes configuration from kubeconfig")
    except Exception as exc:
        logger.exception("Failed to load Kubernetes configuration")
        raise RuntimeError(
            f"Unable to load Kubernetes configuration: {exc}"
        ) from exc
