"""Crop, scale and recompress JPEGs with macOS `sips` or, without it, ImageMagick.

On a Mac it uses sips, as the images in public/img/ were made. Elsewhere (the guide sync
runs on Ubuntu) it uses ImageMagick 7 (`magick`) or 6 (`convert`), with the same crop
(centered), width and quality. The scripts only process new downloads, so switching tools
never re-encodes an image already in the repo.

Used by: build_assets_js.py, fetch_start_maps.py, fetch_zone_maps.py
"""
import shutil
import subprocess

TOOLS = ("sips", "magick", "convert")


def pick_tool(which=shutil.which):
    """The first image tool installed, or None."""
    return next((t for t in TOOLS if which(t)), None)


def crop_cmd(tool, path, height, width):
    """Crop path in place to width x height around its center."""
    if tool == "sips":
        return [["sips", "-c", str(height), str(width), str(path)]]
    return [[tool, str(path), "-gravity", "center", "-crop", f"{width}x{height}+0+0", "+repage", str(path)]]


def resize_cmd(tool, src, dest, width, quality):
    """Scale src to width (keeping its ratio) into the JPEG dest at quality."""
    if tool == "sips":
        return [["sips", "--resampleWidth", str(width), "-s", "formatOptions", str(quality), str(src), "--out", str(dest)]]
    return [[tool, str(src), "-resize", f"{width}x", "-quality", str(quality), str(dest)]]


def recompress_cmd(tool, path, quality):
    """Recompress the JPEG path in place at quality."""
    if tool == "sips":
        return [["sips", "-s", "format", "jpeg", "-s", "formatOptions", str(quality), str(path), "--out", str(path)]]
    return [[tool, str(path), "-quality", str(quality), str(path)]]


def _run(cmds):
    for cmd in cmds:
        subprocess.run(cmd, check=True, capture_output=True)


def _tool():
    tool = pick_tool()
    if not tool:
        raise SystemExit("hace falta sips (macOS) o ImageMagick (magick o convert)")
    return tool


def crop(path, height, width):
    _run(crop_cmd(_tool(), path, height, width))


def resize(src, dest, width, quality):
    _run(resize_cmd(_tool(), src, dest, width, quality))


def recompress(path, quality):
    _run(recompress_cmd(_tool(), path, quality))
