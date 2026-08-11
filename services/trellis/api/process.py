#!/usr/bin/env python3
import gc
import os
import time
from dataclasses import dataclass

import numpy as np
import o_voxel
import torch
from PIL import Image

try:
    import cumesh

    if not getattr(cumesh.CuMesh.fill_holes, "_autobom_safe", False):
        _cumesh_fill_holes = cumesh.CuMesh.fill_holes

        def _safe_cumesh_fill_holes(self, *args, **kwargs):
            try:
                return _cumesh_fill_holes(self, *args, **kwargs)
            except RuntimeError as error:
                print(f"Warning: cumesh fill_holes skipped ({error})")

        _safe_cumesh_fill_holes._autobom_safe = True
        cumesh.CuMesh.fill_holes = _safe_cumesh_fill_holes
except ImportError:
    pass

from initialize import get_pipeline
from status import GLB_OUTPUTS, write_status
from trellis2.representations import MeshWithVoxel

# Fallbacks when a field is missing from the POST body. Source of truth: server/lib/trellis.ts PROCESS_PARAMS
DEFAULTS = {
    "resolution": 512,
    "steps": 20,
    "sparse_guidance_scale": 7.5,
    "slat_guidance_scale": 7.5,
    "tex_guidance_scale": 1.0,
    "simplify": 0.92,
    "texture_size": 512,
    "max_input_size": 512
}

OPTION_KEYS = (
    "seed",
    "resolution",
    "steps",
    "guidance_scale",
    "sparse_guidance_scale",
    "slat_guidance_scale",
    "tex_guidance_scale",
    "simplify",
    "texture_size",
    "max_input_size",
)

SKETCHUP_INCHES_SCALE = float(os.getenv("SKP_CONVERTER_LINEAR_SCALE", "39.37007874015748"))
CATALOG_TARGET_MAX_INCHES = float(os.getenv("CATALOG_TARGET_MAX_INCHES", "48"))
GLB_DECIMATION_TARGET = 100_000

PARK_MODELS = (
    "sparse_structure_flow_model",
    "sparse_structure_decoder",
    "shape_slat_flow_model_512",
    "shape_slat_flow_model_1024",
    "tex_slat_flow_model_512",
    "tex_slat_flow_model_1024",
    "shape_slat_decoder",
    "tex_slat_decoder",
)


@dataclass
class ProcessOptions:
    seed: int = 1
    resolution: int = DEFAULTS["resolution"]
    steps: int = DEFAULTS["steps"]
    sparse_guidance_scale: float = DEFAULTS["sparse_guidance_scale"]
    slat_guidance_scale: float = DEFAULTS["slat_guidance_scale"]
    tex_guidance_scale: float = DEFAULTS["tex_guidance_scale"]
    simplify: float = DEFAULTS["simplify"]
    texture_size: int = DEFAULTS["texture_size"]
    max_input_size: int = DEFAULTS["max_input_size"]
    target_max_inches: float = None


def _parse_int(value, default):
    return int(value) if value not in (None, "") else default


def _parse_float(value, default):
    return float(value) if value not in (None, "") else default


def options_from_mapping(data):
    legacy_guidance = _parse_float(data.get("guidance_scale"), DEFAULTS["sparse_guidance_scale"])
    raw_target = data.get("target_max_inches")
    target_max_inches = None
    if raw_target not in (None, ""):
        parsed = _parse_float(raw_target, None)
        if parsed and parsed > 0:
            target_max_inches = parsed
    return ProcessOptions(
        seed=_parse_int(data.get("seed"), 1),
        resolution=_parse_int(data.get("resolution"), DEFAULTS["resolution"]),
        steps=_parse_int(data.get("steps"), DEFAULTS["steps"]),
        sparse_guidance_scale=_parse_float(data.get("sparse_guidance_scale"), legacy_guidance),
        slat_guidance_scale=_parse_float(data.get("slat_guidance_scale"), legacy_guidance),
        tex_guidance_scale=_parse_float(data.get("tex_guidance_scale"), DEFAULTS["tex_guidance_scale"]),
        simplify=_parse_float(data.get("simplify"), DEFAULTS["simplify"]),
        texture_size=_parse_int(data.get("texture_size"), DEFAULTS["texture_size"]),
        max_input_size=_parse_int(data.get("max_input_size"), DEFAULTS["max_input_size"]),
        target_max_inches=target_max_inches,
    )


def _to_numpy(array):
    if torch.is_tensor(array):
        return array.detach().cpu().numpy()
    return np.asarray(array)


def _detach_if_tensor(value):
    return value.detach() if torch.is_tensor(value) else value


def _mesh_max_extent(vertices):
    verts = _to_numpy(vertices)
    return float(np.max(verts.max(axis=0) - verts.min(axis=0)))


def _catalog_scale_factor(vertices, target_max_inches=None):
    extent = _mesh_max_extent(vertices)
    if extent < 1e-6:
        return 1.0
    target_inches = target_max_inches if target_max_inches else CATALOG_TARGET_MAX_INCHES
    target_meters = target_inches / SKETCHUP_INCHES_SCALE
    return target_meters / extent


def _apply_catalog_scale(mesh, factor):
    if abs(factor - 1.0) < 1e-6:
        return
    if torch.is_tensor(mesh.vertices):
        mesh.vertices = mesh.vertices.detach() * factor
    else:
        mesh.vertices = np.asarray(mesh.vertices, dtype=np.float64) * factor


def _load_image(input_path, max_input_size):
    image = Image.open(input_path)
    if image.mode not in ("RGB", "RGBA"):
        image = image.convert("RGBA" if "A" in image.mode else "RGB")
    if max(image.size) > max_input_size:
        image.thumbnail((max_input_size, max_input_size), Image.Resampling.LANCZOS)
    return image


def _sampler_params(steps, guidance_strength, guidance_rescale=0.7, rescale_t=3.0):
    return {
        "steps": steps,
        "guidance_strength": guidance_strength,
        "guidance_rescale": guidance_rescale,
        "rescale_t": rescale_t,
    }


def _free_cuda_memory():
    gc.collect()
    if torch.cuda.is_available():
        torch.cuda.empty_cache()
        torch.cuda.synchronize()


def _move_cond(cond, device=None):
    if device is None:
        return {key: value.cpu() if torch.is_tensor(value) else value for key, value in cond.items()}
    return {key: value.to(device) if torch.is_tensor(value) else value for key, value in cond.items()}


def _park_flow_models(pipeline):
    if not pipeline.low_vram:
        return
    for name in PARK_MODELS:
        model = pipeline.models.get(name)
        if model is not None:
            model.cpu()
    if pipeline.image_cond_model is not None:
        pipeline.image_cond_model.cpu()
    if pipeline.rembg_model is not None:
        pipeline.rembg_model.cpu()


def _sample_sparse_structure(pipeline, cond, sampler_params, resolution):
    flow_model = pipeline.models["sparse_structure_flow_model"]
    reso = flow_model.resolution
    in_channels = flow_model.in_channels
    noise = torch.randn(1, in_channels, reso, reso, reso).to(pipeline.device)
    merged_params = {**pipeline.sparse_structure_sampler_params, **sampler_params}

    if pipeline.low_vram:
        flow_model.to(pipeline.device)
    z_s = pipeline.sparse_structure_sampler.sample(
        flow_model,
        noise,
        **cond,
        **merged_params,
        verbose=True,
        tqdm_desc="Sampling sparse structure",
    ).samples
    if pipeline.low_vram:
        flow_model.cpu()
    del noise
    _free_cuda_memory()

    print("Decoding sparse structure...")
    decoder = pipeline.models["sparse_structure_decoder"]
    if pipeline.low_vram:
        decoder.to(pipeline.device)
    decoded = decoder(z_s) > 0
    del z_s
    if pipeline.low_vram:
        decoder.cpu()
    _free_cuda_memory()

    ss_res = resolution // 16
    if ss_res != decoded.shape[2]:
        ratio = decoded.shape[2] // ss_res
        decoded = torch.nn.functional.max_pool3d(decoded.float(), ratio, ratio, 0) > 0.5
    coords = torch.argwhere(decoded)[:, [0, 2, 3, 4]].int()
    del decoded
    return coords


def _decode_latent_staged(pipeline, shape_slat, tex_slat, res):
    _park_flow_models(pipeline)
    shape_slat = shape_slat.cpu()
    tex_slat = tex_slat.cpu()
    _free_cuda_memory()

    device = pipeline.device
    shape_gpu = shape_slat.to(device)
    del shape_slat
    _free_cuda_memory()
    meshes, subs = pipeline.decode_shape_slat(shape_gpu, res)
    del shape_gpu
    _free_cuda_memory()

    tex_gpu = tex_slat.to(device)
    del tex_slat
    _free_cuda_memory()
    tex_voxels = pipeline.decode_tex_slat(tex_gpu, subs)
    del tex_gpu, subs
    _free_cuda_memory()

    out_mesh = []
    for mesh, voxels in zip(meshes, tex_voxels):
        mesh.fill_holes()
        out_mesh.append(
            MeshWithVoxel(
                mesh.vertices,
                mesh.faces,
                origin=[-0.5, -0.5, -0.5],
                voxel_size=1 / res,
                coords=voxels.coords[:, 1:],
                attrs=voxels.feats,
                voxel_shape=torch.Size([*voxels.shape, *voxels.spatial_shape]),
                layout=pipeline.pbr_attr_layout
            )
        )
    return out_mesh


def _sample_shape_slat(pipeline, cond, coords, shape_params, res):
    cond = _move_cond(cond, pipeline.device)
    shape_slat = pipeline.sample_shape_slat(
        cond,
        pipeline.models[f"shape_slat_flow_model_{res}"],
        coords,
        shape_params,
    )
    _free_cuda_memory()
    return cond, shape_slat


def _sample_tex_slat(pipeline, cond, shape_slat, tex_params, res):
    cond = _move_cond(cond)
    _free_cuda_memory()
    cond = _move_cond(cond, pipeline.device)
    tex_slat = pipeline.sample_tex_slat(
        cond,
        pipeline.models[f"tex_slat_flow_model_{res}"],
        shape_slat,
        tex_params,
    )
    del cond
    _park_flow_models(pipeline)
    _free_cuda_memory()
    return tex_slat


def _run_pipeline_staged(pipeline, processed_image, options, sparse_params, shape_params, tex_params):
    torch.manual_seed(options.seed)
    res = options.resolution

    cond = pipeline.get_cond([processed_image], res)
    coords = _sample_sparse_structure(pipeline, cond, sparse_params, res)
    print(f"Sparse structure tokens: {coords.shape[0]}")
    _free_cuda_memory()

    cond, shape_slat = _sample_shape_slat(pipeline, cond, coords, shape_params, res)
    del coords
    tex_slat = _sample_tex_slat(pipeline, cond, shape_slat, tex_params, res)
    return _decode_latent_staged(pipeline, shape_slat, tex_slat, res)


def _export_glb(mesh, pipeline, res, options, catalog_scale=1.0):
    decimation_target = int(GLB_DECIMATION_TARGET * options.simplify)
    mesh.simplify(decimation_target)
    _park_flow_models(pipeline)
    _free_cuda_memory()
    half = 0.5 * catalog_scale
    aabb = [[-half, -half, -half], [half, half, half]]
    with torch.no_grad():
        return o_voxel.postprocess.to_glb(
            vertices=_detach_if_tensor(mesh.vertices),
            faces=_detach_if_tensor(mesh.faces),
            attr_volume=_detach_if_tensor(mesh.attrs),
            coords=_detach_if_tensor(mesh.coords),
            attr_layout=pipeline.pbr_attr_layout,
            grid_size=res,
            aabb=aabb,
            decimation_target=decimation_target,
            texture_size=options.texture_size,
            remesh=True,
            remesh_band=1,
            remesh_project=0,
            use_tqdm=True,
        )


def process_image(input_path, output_dir, options=None):
    options = options or ProcessOptions()
    os.makedirs(output_dir, exist_ok=True)

    try:
        write_status(output_dir, "loading")
        pipeline = get_pipeline()

        print(f"Loading input image: {input_path}")
        image = _load_image(input_path, options.max_input_size)
        print(f"Image size before preprocess: {image.size} (max {options.max_input_size}px)")
        print("Preprocessing image (background removal, crop, normalize)...")
        processed_image = pipeline.preprocess_image(image)
        print(f"Image size for inference: {processed_image.size}")
        print(f"Process options: {options}")

        sparse_params = _sampler_params(
            options.steps, options.sparse_guidance_scale, guidance_rescale=0.7, rescale_t=5.0
        )
        shape_params = _sampler_params(options.steps, options.slat_guidance_scale, guidance_rescale=0.5)
        tex_params = _sampler_params(options.steps, options.tex_guidance_scale, guidance_rescale=0.0)

        write_status(output_dir, "running")
        print("\nRunning TRELLIS.2 pipeline (this may take several minutes)...")
        start_time = time.time()
        with torch.no_grad():
            meshes = _run_pipeline_staged(
                pipeline,
                processed_image,
                options,
                sparse_params,
                shape_params,
                tex_params,
            )
            mesh = meshes[0]
        print(f"Pipeline completed in {time.time() - start_time:.2f}s")

        write_status(output_dir, "exporting")

        target_inches = options.target_max_inches or CATALOG_TARGET_MAX_INCHES
        catalog_scale = _catalog_scale_factor(mesh.vertices, options.target_max_inches)
        extent_before = _mesh_max_extent(mesh.vertices)
        _apply_catalog_scale(mesh, catalog_scale)
        extent_after = _mesh_max_extent(mesh.vertices)
        max_inches = extent_after * SKETCHUP_INCHES_SCALE
        print(
            f"Catalog furniture scale: factor={catalog_scale:.4f}, "
            f"extent {extent_before:.4f}m → {extent_after:.4f}m "
            f"({max_inches:.1f}\" max in SketchUp, target {target_inches}\")"
        )

        print("Generating GLB...")
        textured_mesh = _export_glb(mesh, pipeline, options.resolution, options, catalog_scale)
        textured_mesh.export(os.path.join(output_dir, "output.glb"), extension_webp=False)

        del textured_mesh, mesh, meshes, processed_image
        _free_cuda_memory()

        write_status(output_dir, "completed", outputs=GLB_OUTPUTS)
        print(f"Processing complete: {GLB_OUTPUTS}")
        return GLB_OUTPUTS
    except Exception as exc:
        write_status(output_dir, "failed", error=exc)
        raise


if __name__ == "__main__":
    import json
    import sys

    process_image(
        sys.argv[1],
        sys.argv[2],
        options_from_mapping(json.loads(sys.argv[3])),
    )
