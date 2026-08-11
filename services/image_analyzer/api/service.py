import json
import logging
import os

import requests
from flask import Flask, jsonify, request
from flask_cors import CORS, cross_origin

from analyze import analyze_image_bytes

app = Flask(__name__)
CORS(app)

logging.basicConfig(level=logging.INFO)

ANALYZE_TIMEOUT_MS = int(os.getenv("ANALYZE_TIMEOUT_MS", "120000"))


def _parse_tags(value):
    if value is None:
        return None
    if isinstance(value, list):
        return value
    if isinstance(value, str):
        return json.loads(value)
    return None


@app.route("/health", methods=["GET"])
@cross_origin()
def health():
    return jsonify({"status": "ok"})


@app.route("/analyze", methods=["POST"])
@cross_origin()
def analyze():
    image_bytes = None
    tag_list = None
    url = None

    if request.files.get("image"):
        image_bytes = request.files["image"].read()
        tag_list = _parse_tags(request.form.get("tags"))
    elif request.is_json:
        body = request.get_json(silent=True) or {}
        tag_list = _parse_tags(body.get("tags"))
        url = body.get("url")

        if url:
            app.logger.info("Downloading image: %s", url)
            response = requests.get(url, timeout=ANALYZE_TIMEOUT_MS / 1000)
            response.raise_for_status()
            image_bytes = response.content

    if not image_bytes:
        return jsonify({"error": "Provide image file or JSON { url, tags }"}), 400

    if not tag_list:
        return jsonify({"error": "Provide tags array in JSON body or form field"}), 400

    app.logger.info("Analyzing image (%s bytes, %s tags)", len(image_bytes), len(tag_list))

    try:
        result = analyze_image_bytes(image_bytes, tag_list=tag_list)
        if url:
            result["url"] = url
    except Exception as exc:
        app.logger.error("Image analysis failed: %s", exc, exc_info=True)
        return jsonify({"error": str(exc)}), 500

    app.logger.info(
        "Analysis done tags=%s color=%s",
        result.get("tags"),
        result.get("color")
    )
    return jsonify(result)


if __name__ == "__main__":
    port = int(os.getenv("PORT", "5001"))
    print(f"Starting image analyzer service on port {port}...")
    app.run(host="0.0.0.0", port=port, debug=False, threaded=True)
