import json
import logging
import os

from flask import Flask, jsonify, request
from flask_cors import CORS, cross_origin

from analyze import analyze_text
from extract import extract_product

app = Flask(__name__)
CORS(app)

logging.basicConfig(level=logging.INFO)


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
    if not request.is_json:
        return jsonify({"error": "JSON body required: { text, tags }"}), 400

    body = request.get_json(silent=True) or {}
    text = (body.get("text") or "").strip()
    tag_list = _parse_tags(body.get("tags"))

    if not text:
        return jsonify({"error": "Provide text in JSON body"}), 400

    if not tag_list:
        return jsonify({"error": "Provide tags array in JSON body"}), 400

    app.logger.info("Analyzing text (%s chars, %s tags)", len(text), len(tag_list))

    try:
        result = analyze_text(text, tag_list=tag_list)
    except Exception as exc:
        app.logger.error("Text analysis failed: %s", exc, exc_info=True)
        return jsonify({"error": str(exc)}), 500

    app.logger.info(
        "Analysis done tags=%s dimensions=%s",
        result.get("tags"),
        result.get("dimensions")
    )
    return jsonify(result)


@app.route("/extract-product", methods=["POST"])
@cross_origin()
def extract():
    if not request.is_json:
        return jsonify({"error": "JSON body required: { url }"}), 400

    body = request.get_json(silent=True) or {}
    url = (body.get("url") or "").strip()
    if not url:
        return jsonify({"error": "Provide url in JSON body"}), 400

    app.logger.info("Extracting product from %s", url)

    try:
        result = extract_product(url)
    except Exception as exc:
        app.logger.error("Product extract failed: %s", exc, exc_info=True)
        return jsonify({"error": str(exc)}), 500

    app.logger.info(
        "Extracted product name=%s image=%s description=%s",
        result.get("name"),
        result.get("imageUrl"),
        bool(result.get("description"))
    )
    return jsonify(result)


if __name__ == "__main__":
    port = int(os.getenv("PORT", "5003"))
    print(f"Starting text analyzer service on port {port}...")
    app.run(host="0.0.0.0", port=port, debug=False, threaded=True)
