from kubernetes import config
from loguru import logger


def load_kubernetes_config():
    """
    Load Kubernetes configuration.

    If running inside Kubernetes, use in-cluster authentication.
    Otherwise, fall back to the local kubeconfig.
    """

    try:
        config.load_incluster_config()
        logger.info("Loaded Kubernetes in-cluster configuration")
        return

    except Exception as incluster_exc:
        logger.warning(
            f"In-cluster configuration unavailable: {incluster_exc}"
        )

    try:
        config.load_kube_config()
        logger.info("Loaded Kubernetes configuration from kubeconfig")
        return

    except Exception as kubeconfig_exc:
        logger.exception("Failed to load Kubernetes configuration")
        raise RuntimeError(
            "Unable to load Kubernetes configuration. "
            f"In-cluster error: {incluster_exc}; "
            f"Kubeconfig error: {kubeconfig_exc}"
        ) from kubeconfig_exc
