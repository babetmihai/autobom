#!/usr/bin/env python3
import os
import threading

os.environ.setdefault("ATTN_BACKEND", "flash_attn")
os.environ.setdefault("SPARSE_ATTN_BACKEND", "flash_attn")

from trellis2.pipelines import Trellis2ImageTo3DPipeline

MODEL_ID = os.getenv("TRELLIS_MODEL_ID", "camenduru/TRELLIS.2-4B")
_pipeline = None
_pipeline_lock = threading.Lock()


def get_pipeline():
    global _pipeline
    if _pipeline is not None:
        return _pipeline
    with _pipeline_lock:
        if _pipeline is not None:
            return _pipeline
        print(f"Loading TRELLIS.2 pipeline ({MODEL_ID})...")
        pipeline = Trellis2ImageTo3DPipeline.from_pretrained(MODEL_ID)
        pipeline.low_vram = os.getenv("TRELLIS_LOW_VRAM", "false").strip().lower() in ("true", "1", "yes", "on")
        pipeline.cuda()
        _pipeline = pipeline
        print(f"TRELLIS.2 pipeline ready (low_vram={pipeline.low_vram})")
        return _pipeline


def initialize_models():
    get_pipeline()
    print("TRELLIS.2 pipeline loaded successfully")


if __name__ == "__main__":
    initialize_models()
