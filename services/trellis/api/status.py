import json
import os
from datetime import datetime, timezone

STATUS_FILE = "status.json"
GLB_FILENAME = "output.glb"
GLB_OUTPUTS = {"glb": GLB_FILENAME}


def _now():
    return datetime.now(timezone.utc).isoformat()


def status_path(output_dir):
    return os.path.join(output_dir, STATUS_FILE)


def glb_path(output_dir):
    return os.path.join(output_dir, GLB_FILENAME)


def glb_outputs_if_ready(output_dir):
    if os.path.exists(glb_path(output_dir)):
        return GLB_OUTPUTS
    return None


def write_status(output_dir, status, error=None, outputs=None):
    os.makedirs(output_dir, exist_ok=True)
    path = status_path(output_dir)

    data = {}
    if os.path.exists(path):
        with open(path, encoding="utf-8") as handle:
            data = json.load(handle)

    if "started_at" not in data:
        data["started_at"] = _now()

    data["status"] = status
    data["updated_at"] = _now()

    if error is not None:
        data["error"] = str(error)
    elif status != "failed":
        data.pop("error", None)

    if status == "completed":
        data["completed_at"] = _now()
        if outputs:
            data["outputs"] = outputs

    with open(path, "w", encoding="utf-8") as handle:
        json.dump(data, handle, indent=2)


def recover_or_mark_failed(output_dir, error, log=None):
    outputs = glb_outputs_if_ready(output_dir)
    if outputs:
        write_status(output_dir, "completed", outputs=outputs)
        if log:
            log.warning(f"Recovered GLB after worker error: {error}")
        return True
    write_status(output_dir, "failed", error=error)
    return False


def read_status(output_dir):
    if not os.path.isdir(output_dir):
        return None

    path = status_path(output_dir)
    if not os.path.exists(path):
        outputs = glb_outputs_if_ready(output_dir)
        if outputs:
            return {"status": "completed", "outputs": outputs}
        return None

    with open(path, encoding="utf-8") as handle:
        data = json.load(handle)

    if data.get("status") == "failed":
        outputs = glb_outputs_if_ready(output_dir)
        if outputs:
            data.pop("error", None)
            return {**data, "status": "completed", "outputs": outputs}

    return data
