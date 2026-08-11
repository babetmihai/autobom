import json
import logging
import os
import subprocess
import sys
import threading
import uuid

os.environ.setdefault("ATTN_BACKEND", "flash_attn")
os.environ.setdefault("SPARSE_ATTN_BACKEND", "flash_attn")

from flask import Flask, jsonify, request, send_from_directory
from flask_cors import CORS, cross_origin

from initialize import initialize_models
from process import options_from_mapping
from status import read_status, recover_or_mark_failed, write_status

app = Flask(__name__)
CORS(app)

logging.basicConfig(level=logging.INFO)

INPUT_DIR = "/content/TRELLIS.2/input"
OUTPUT_DIR = "/content/TRELLIS.2/output"
PROCESS_SCRIPT = "/content/TRELLIS.2/process.py"
WORKER_TIMEOUT_SEC = int(os.getenv("TRELLIS_WORKER_TIMEOUT_SEC", "3600"))
OOM_EXIT_CODES = {137, -9}

_worker_lock = threading.Lock()


def _run_worker(input_path, output_dir, options_data):
    return subprocess.run(
        [
            sys.executable,
            PROCESS_SCRIPT,
            input_path,
            output_dir,
            json.dumps(options_data),
        ],
        capture_output=True,
        text=True,
        timeout=WORKER_TIMEOUT_SEC,
    )


def _worker_error(proc):
    if proc.returncode in OOM_EXIT_CODES:
        return RuntimeError("Worker killed (likely out of memory)")
    return RuntimeError(f"Worker exited with code {proc.returncode}")


def _collect_input_path(request_id):
    file = request.files.get("image")
    if file and file.filename:
        ext = os.path.splitext(file.filename)[1] or ".webp"
        input_path = os.path.join(INPUT_DIR, f"{request_id}{ext}")
        file.save(input_path)
        return input_path

    form_path = request.form.get("image")
    if form_path and os.path.exists(form_path):
        return form_path

    return None


@app.route("/output/<request_id>/<filename>")
@cross_origin()
def serve_file(request_id, filename):
    return send_from_directory(os.path.join(OUTPUT_DIR, request_id), filename)


@app.route("/status/<request_id>", methods=["GET"])
@cross_origin()
def get_status(request_id):
    output_dir = os.path.join(OUTPUT_DIR, request_id)
    data = read_status(output_dir)
    if data is None:
        return jsonify({"error": "Request not found"}), 404
    payload = {
        "request_id": request_id,
        **data
    }
    app.logger.info(f"Status {request_id}: {data.get('status')}")
    return jsonify(payload)


@app.route("/initialize", methods=["POST"])
@cross_origin()
def initialize():
    try:
        app.logger.info("Starting initialization")
        initialize_models()
        result = {"status": "success", "request_id": str(uuid.uuid4())}
        app.logger.info(f"Initialization complete: {result}")
        return jsonify(result)
    except Exception as exc:
        app.logger.error(f"Error during initialization: {exc}", exc_info=True)
        return jsonify({"error": str(exc)}), 500


@app.route("/process", methods=["POST"])
@cross_origin()
def process():
    app.logger.info("Received process request")

    request_id = str(uuid.uuid4())
    output_dir = os.path.join(OUTPUT_DIR, request_id)
    input_path = _collect_input_path(request_id)

    if not input_path:
        return jsonify({"error": "No image provided"}), 400

    os.makedirs(output_dir, exist_ok=True)
    options_data = request.form.to_dict()
    options = options_from_mapping(options_data)
    app.logger.info(f"Processing image with options: {options}")
    write_status(output_dir, "processing")

    def run_processing():
        with _worker_lock:
            try:
                proc = _run_worker(input_path, output_dir, options_data)
                if proc.stdout:
                    print(proc.stdout, end="")
                if proc.stderr:
                    print(proc.stderr, end="", file=sys.stderr)
                if proc.returncode != 0:
                    recover_or_mark_failed(output_dir, _worker_error(proc), app.logger)
            except subprocess.TimeoutExpired:
                recover_or_mark_failed(output_dir, RuntimeError("Processing timed out"), app.logger)
            except Exception as exc:
                app.logger.error(f"Error during processing: {exc}", exc_info=True)
                recover_or_mark_failed(output_dir, exc, app.logger)
            finally:
                if os.path.exists(input_path):
                    os.remove(input_path)

    threading.Thread(target=run_processing, daemon=True).start()

    return jsonify({
        "status": "processing",
        "request_id": request_id,
        "base_url": f"http://localhost:5000/output/{request_id}"
    })


if __name__ == "__main__":
    os.makedirs(INPUT_DIR, exist_ok=True)
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    print("Starting TRELLIS.2 service on port 5000...")
    app.run(host="0.0.0.0", port=5000, debug=False, threaded=True)
