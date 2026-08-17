import base64
import os
from io import BytesIO

import torch
from PIL import Image

DETECT_THRESHOLD = float(os.getenv("SCENE_DETECT_THRESHOLD", "0.12"))
MAX_CROPS = int(os.getenv("SCENE_MAX_CROPS", "12"))

_owlvit_processor = None
_owlvit_model = None


def _device():
    return "cuda" if torch.cuda.is_available() else "cpu"


def _load_image_bytes(image_bytes):
    return Image.open(BytesIO(image_bytes)).convert("RGB")


def _load_owlvit():
    global _owlvit_processor, _owlvit_model
    if _owlvit_model is not None:
        return
    from transformers import OwlViTForObjectDetection, OwlViTProcessor

    processor = OwlViTProcessor.from_pretrained("google/owlvit-base-patch32")
    model = OwlViTForObjectDetection.from_pretrained("google/owlvit-base-patch32")
    device = _device()
    model = model.to(device).eval()
    _owlvit_processor = processor
    _owlvit_model = model


def _iou(box_a, box_b):
    ax, ay, aw, ah = box_a
    bx, by, bw, bh = box_b
    ax2 = ax + aw
    ay2 = ay + ah
    bx2 = bx + bw
    by2 = by + bh
    inter_x1 = max(ax, bx)
    inter_y1 = max(ay, by)
    inter_x2 = min(ax2, bx2)
    inter_y2 = min(ay2, by2)
    inter_w = max(0, inter_x2 - inter_x1)
    inter_h = max(0, inter_y2 - inter_y1)
    inter_area = inter_w * inter_h
    if inter_area == 0:
        return 0.0
    union = aw * ah + bw * bh - inter_area
    return inter_area / union


def _nms_boxes(candidates, iou_limit=0.45):
    ordered = sorted(candidates, key=lambda item: item["confidence"], reverse=True)
    kept = []
    for candidate in ordered:
        if len(kept) >= MAX_CROPS:
            break
        overlaps = False
        for existing in kept:
            if _iou(candidate["bbox"], existing["bbox"]) > iou_limit:
                overlaps = True
                break
        if not overlaps:
            kept.append(candidate)
    return kept


def _crop_to_base64(pil_image, bbox):
    width, height = pil_image.size
    x, y, w, h = bbox
    x = max(0, min(x, width - 1))
    y = max(0, min(y, height - 1))
    x2 = max(x + 1, min(x + w, width))
    y2 = max(y + 1, min(y + h, height))
    cropped = pil_image.crop((x, y, x2, y2))
    buffer = BytesIO()
    cropped.save(buffer, format="JPEG", quality=90)
    return base64.b64encode(buffer.getvalue()).decode("ascii")


def analyze_image_bytes(image_bytes, labels):
    pil_image = _load_image_bytes(image_bytes)
    _load_owlvit()
    device = _device()
    width, height = pil_image.size

    inputs = _owlvit_processor(text=[labels], images=pil_image, return_tensors="pt")
    inputs = {key: value.to(device) for key, value in inputs.items()}

    with torch.no_grad():
        outputs = _owlvit_model(**inputs)

    target_sizes = torch.tensor([[height, width]], device=device)
    results = _owlvit_processor.post_process_grounded_object_detection(
        outputs=outputs,
        target_sizes=target_sizes,
        threshold=DETECT_THRESHOLD,
        text_labels=[labels]
    )[0]

    candidates = []
    boxes = results.get("boxes")
    scores = results.get("scores")
    text_labels = results.get("text_labels")
    if boxes is None:
        return {"crops": [], "width": width, "height": height}

    for box, score, label in zip(boxes, scores, text_labels):
        x_min, y_min, x_max, y_max = [int(round(float(value))) for value in box.tolist()]
        bbox_w = max(1, x_max - x_min)
        bbox_h = max(1, y_max - y_min)
        label = label or "furniture"
        bbox = [x_min, y_min, bbox_w, bbox_h]
        candidates.append({
            "bbox": bbox,
            "label": label,
            "confidence": float(score),
            "cropBase64": _crop_to_base64(pil_image, bbox)
        })

    crops = _nms_boxes(candidates)
    for index, crop in enumerate(crops):
        crop["id"] = f"crop-{index}"

    return {
        "crops": crops,
        "width": width,
        "height": height
    }
