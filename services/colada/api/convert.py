import io
import os
import re
import subprocess
import tempfile
import zipfile

import trimesh

ASSET_EXTENSIONS = {
    ".dae",
    ".png",
    ".jpg",
    ".jpeg",
    ".webp",
    ".tga",
    ".bmp",
    ".tif",
    ".tiff"
}

SKIP_ARCHIVE = {"model.glb", "model.obj", "material.mtl"}


def normalize_dae_texture_paths(dae_path):
    with open(dae_path, "r", encoding="utf-8", errors="replace") as dae_file:
        content = dae_file.read()

    def repl(match):
        path = match.group(1).strip()
        base = os.path.basename(path.replace("\\", "/"))
        return f"<init_from>{base}</init_from>"

    content = re.sub(r"<init_from>([^<]+)</init_from>", repl, content)

    with open(dae_path, "w", encoding="utf-8") as dae_file:
        dae_file.write(content)


def export_collada(input_path, dae_path):
    result = subprocess.run(
        ["assimp", "export", input_path, dae_path],
        capture_output=True,
        text=True
    )
    if result.returncode != 0:
        detail = (result.stderr or result.stdout or "").strip()
        raise RuntimeError(detail or "assimp export failed")
    if not os.path.isfile(dae_path):
        raise RuntimeError("assimp did not produce collada output")


def glb_to_collada_assets(glb_path, work_dir, dae_name="model.dae"):
    obj_path = os.path.join(work_dir, "model.obj")
    dae_path = os.path.join(work_dir, dae_name)

    loaded = trimesh.load(glb_path, force="scene")
    if isinstance(loaded, trimesh.Trimesh):
        scene = trimesh.Scene(loaded)
    else:
        scene = loaded

    scene.export(obj_path)
    export_collada(obj_path, dae_path)
    normalize_dae_texture_paths(dae_path)
    return dae_path


def glb_to_colada_zip(glb_bytes, name="model"):
    dae_name = "model.dae"

    with tempfile.TemporaryDirectory() as tmp:
        glb_path = os.path.join(tmp, "model.glb")
        with open(glb_path, "wb") as glb_file:
            glb_file.write(glb_bytes)

        glb_to_collada_assets(glb_path, tmp, dae_name)

        buf = io.BytesIO()
        with zipfile.ZipFile(buf, "w", zipfile.ZIP_DEFLATED) as archive:
            for filename in os.listdir(tmp):
                if filename in SKIP_ARCHIVE:
                    continue
                ext = os.path.splitext(filename)[1].lower()
                if ext not in ASSET_EXTENSIONS:
                    continue
                archive.write(os.path.join(tmp, filename), filename)

        return buf.getvalue()
