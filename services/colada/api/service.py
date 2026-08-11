import io
import logging
import os

from flask import Flask, jsonify, request, send_file
from flask_cors import CORS, cross_origin

from convert import glb_to_colada_zip

app = Flask(__name__)
CORS(app)

logging.basicConfig(level=logging.INFO)


@app.route("/convert", methods=["POST"])
@cross_origin()
def convert():
    file = request.files.get("glb")
    if not file:
        return jsonify({"error": "No glb file provided"}), 400

    name = request.form.get("name", "model")
    glb_bytes = file.read()
    app.logger.info("Converting GLB to COLADA zip (%s bytes)", len(glb_bytes))

    try:
        zip_bytes = glb_to_colada_zip(glb_bytes, name=name)
    except Exception as exc:
        app.logger.error("COLADA conversion failed: %s", exc, exc_info=True)
        return jsonify({"error": str(exc)}), 500

    app.logger.info("COLADA zip ready (%s bytes)", len(zip_bytes))

    return send_file(
        io.BytesIO(zip_bytes),
        mimetype="application/zip",
        as_attachment=True,
        download_name=f"{name}.zip"
    )


if __name__ == "__main__":
    port = int(os.getenv("PORT", "5002"))
    print(f"Starting COLADA service on port {port}...")
    app.run(host="0.0.0.0", port=port, debug=False, threaded=True)
