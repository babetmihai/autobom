import os
from io import BytesIO

import numpy as np
import requests
import torch
from PIL import Image

ANALYZE_TIMEOUT_MS = int(os.getenv("ANALYZE_TIMEOUT_MS", "120000"))

_clip_model = None
_clip_preprocess = None


def _device():
    return "cuda" if torch.cuda.is_available() else "cpu"


def _load_image_bytes(image_bytes):
    return Image.open(BytesIO(image_bytes)).convert("RGB")


def _load_clip():
    global _clip_model, _clip_preprocess
    if _clip_model is not None:
        return
    import open_clip

    model, _, preprocess = open_clip.create_model_and_transforms(
        "ViT-B-32",
        pretrained="laion2b_s34b_b79k"
    )
    device = _device()
    model = model.to(device).eval()
    _clip_model = model
    _clip_preprocess = preprocess


def analyze_image_bytes(image_bytes):
    pil_image = _load_image_bytes(image_bytes)
    _load_clip()
    device = _device()
    image_tensor = _clip_preprocess(pil_image).unsqueeze(0).to(device)

    with torch.no_grad():
        features = _clip_model.encode_image(image_tensor)
        features = features / features.norm(dim=-1, keepdim=True)

    embedding = features[0].cpu().numpy().astype(np.float32).tolist()
    return {"embedding": embedding}


def analyze_image_url(url):
    response = requests.get(url, timeout=ANALYZE_TIMEOUT_MS / 1000)
    response.raise_for_status()
    return analyze_image_bytes(response.content)
