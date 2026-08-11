import os
from io import BytesIO

from PIL import Image

TAG_THRESHOLD = float(os.getenv("IMAGE_ANALYZER_TAG_THRESHOLD", "0.22"))

COLOR_NAMES = (
    "red",
    "blue",
    "green",
    "yellow",
    "orange",
    "purple",
    "pink",
    "brown",
    "black",
    "white",
    "gray",
    "beige"
)

COLOR_PROMPTS = tuple(f"a photo of {name} furniture" for name in COLOR_NAMES)

_clip_model = None
_clip_preprocess = None
_clip_tokenizer = None


def _normalize_tags(tag_list):
    if not tag_list:
        return []
    seen = set()
    tags = []
    for tag in tag_list:
        name = str(tag).strip().lower()
        if name and name not in seen:
            seen.add(name)
            tags.append(name)
    return tags


def _load_clip():
    global _clip_model, _clip_preprocess, _clip_tokenizer
    if _clip_model is not None:
        return
    import open_clip
    import torch

    model, _, preprocess = open_clip.create_model_and_transforms(
        "ViT-B-32",
        pretrained="laion2b_s34b_b79k"
    )
    tokenizer = open_clip.get_tokenizer("ViT-B-32")
    device = "cuda" if torch.cuda.is_available() else "cpu"
    model = model.to(device).eval()
    _clip_model = model
    _clip_preprocess = preprocess
    _clip_tokenizer = tokenizer
    _clip_model._device = device


def _clip_image_features(pil_image):
    import torch

    _load_clip()
    device = _clip_model._device
    image_tensor = _clip_preprocess(pil_image).unsqueeze(0).to(device)

    with torch.no_grad():
        image_features = _clip_model.encode_image(image_tensor)
        image_features = image_features / image_features.norm(dim=-1, keepdim=True)

    return image_features


def _clip_text_similarities(image_features, text_list):
    if not text_list:
        return None

    import torch

    _load_clip()
    device = _clip_model._device
    text_tokens = _clip_tokenizer(text_list).to(device)

    with torch.no_grad():
        text_features = _clip_model.encode_text(text_tokens)
        text_features = text_features / text_features.norm(dim=-1, keepdim=True)
        sims = (image_features @ text_features.T)[0]

    return sims


def _clip_tags(image_features, tag_names):
    sims = _clip_text_similarities(image_features, tag_names)
    if sims is None:
        return {}

    tags = {}
    for i, name in enumerate(tag_names):
        if float(sims[i]) >= TAG_THRESHOLD:
            tags[name] = "TRUE"
    return tags


def _clip_color(image_features):
    sims = _clip_text_similarities(image_features, COLOR_PROMPTS)
    return COLOR_NAMES[int(sims.argmax())]


def analyze_image_bytes(image_bytes, tag_list=None):
    pil_image = Image.open(BytesIO(image_bytes)).convert("RGB")
    tag_names = _normalize_tags(tag_list)
    image_features = _clip_image_features(pil_image)

    return {
        "tags": _clip_tags(image_features, tag_names),
        "color": _clip_color(image_features)
    }


