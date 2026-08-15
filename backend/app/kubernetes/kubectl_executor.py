import subprocess
from typing import Any

from loguru import logger


class KubectlExecutor:
    def __init__(self, context: str | None = None):
        self.context = context

    def run(self, args: list[str]) -> dict[str, Any]:
        command = ["kubectl"]

        if self.context:
            command.extend(["--context", self.context])

        command.extend(args)

        logger.info("Executing kubectl command: {}", " ".join(command))

        try:
            result = subprocess.run(
                command,
                capture_output=True,
                text=True,
                timeout=30,
            )

            return {
                "success": result.returncode == 0,
                "stdout": result.stdout.strip(),
                "stderr": result.stderr.strip(),
                "return_code": result.returncode,
            }

        except subprocess.TimeoutExpired:
            logger.error("kubectl command timed out")

            return {
                "success": False,
                "stdout": "",
                "stderr": "kubectl command timed out",
                "return_code": -1,
            }

        except Exception as exc:
            logger.exception("kubectl execution failed")

            return {
                "success": False,
                "stdout": "",
                "stderr": str(exc),
                "return_code": -1,
            }
