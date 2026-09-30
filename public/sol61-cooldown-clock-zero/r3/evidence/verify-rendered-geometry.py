from pathlib import Path
from PIL import Image
import hashlib, json, math

ROOT = Path(__file__).resolve().parents[1]
EVIDENCE = ROOT / "evidence"

def box_for(image, x0, x1, background, threshold=35):
    points = []
    for y in range(35, 125):
        for x in range(x0, x1):
            rgb = image.getpixel((x, y))
            if sum(abs(rgb[i] - background[i]) for i in range(3)) > threshold:
                points.append((x, y))
    return {
        "bboxInclusive": [min(x for x, _ in points), min(y for _, y in points),
                          max(x for x, _ in points), max(y for _, y in points)],
        "pixelCount": len(points),
    }

def ray_peak(image, cx, cy, mode):
    scores = []
    for deg in range(360):
        angle = math.radians(deg)
        samples = []
        for radius in range(3, 10):
            for offset in (-1, 0, 1):
                x = round(cx + math.sin(angle) * radius + math.cos(angle) * offset)
                y = round(cy - math.cos(angle) * radius + math.sin(angle) * offset)
                red, green, blue = image.getpixel((x, y))
                samples.append(red - green if mode == "gold" else (red + green + blue) / 3)
        scores.append(sum(samples) / len(samples))
    return max(range(360), key=scores.__getitem__), round(max(scores), 2)

first = Image.open(EVIDENCE / "first-boot-h64-dark-light.png").convert("RGB")
dark_bg = first.getpixel((15, 80))
light_bg = first.getpixel((315, 80))
body = {
    "image": "first-boot-h64-dark-light.png",
    "imageSize": list(first.size),
    "declaredCanvas": [614, 160],
    "declaredBodyHeight": 64,
    "sourceCropPx": [62, 15, 136, 225],
    "projectionExpectedQuadPx": {"width": 64 * 136 / 225, "height": 64},
    "projectedSpriteBounds": {
        "dark": box_for(first, 130, 173, dark_bg),
        "light": box_for(first, 437, 480, light_bg),
    },
}

hands = []
for ms in (310, 510, 700):
    image = Image.open(EVIDENCE / f"clock-hands-on-{ms}.png").convert("RGB")
    hands.append({
        "ms": ms,
        "expectedCurrentAngleDegrees": round(math.degrees(1.55 * max(0, min(1, ((ms / 1000 - .30) / (.72 - .30)) ** 2 * (3 - 2 * ((ms / 1000 - .30) / (.72 - .30)))))), 2),
        "expectedEndAngleDegrees": round(math.degrees(2.4 + .25 * max(0, min(1, ((ms / 1000 - .30) / (.72 - .30)) ** 2 * (3 - 2 * ((ms / 1000 - .30) / (.72 - .30)))))), 2),
        "rasterRayPeaksClockwiseFrom12": {
            "goldCurrentHand": ray_peak(image, 189.5, 97.03, "gold"),
            "brightEndHand": ray_peak(image, 189.5, 97.03, "bright"),
        },
        "note": "Peak direction and score are sampled from the rendered dark-side clock pixels; threshold-free line-ray score, not GPU/API-declared angles.",
    })

payload = {
    "method": "Pillow analysis of saved Chrome screenshots; screenshot pixels only",
    "bodyProjection": body,
    "clockwiseHands": hands,
}
(EVIDENCE / "rendered-geometry.json").write_text(json.dumps(payload, indent=2), encoding="utf-8")

freeze_names = [
    "design.mjs", "shaders.mjs", "projection.mjs", "render-contract.json", "main.mjs",
    "audio.mjs", "body.png", "clock-benefit.wav", "index.html", "embed-check.html",
    "gpu-check.mjs", "REPORT.md", "evidence/verify-rendered-geometry.py", "gpu.json", "first-boot.json", "first-boot-h64-dark-light.png",
    "clock-hands-on-310.png", "clock-hands-on-510.png", "clock-hands-on-700.png",
    "clock-hands-off-310.png", "clock-hands-off-510.png", "clock-hands-off-700.png",
    "rendered-geometry.json",
]
freeze_names += sorted(name for name in (p.name for p in EVIDENCE.iterdir())
                       if name.endswith(".png") and name not in freeze_names)
freeze_names += [name for name in ("cpu.json", "gpu.json", "first-boot.json")
                 if name not in freeze_names]
manifest = {
    "id": "cooldown-clock-zero-r3",
    "entry": "outputs/request-20260930/cooldown-clock-zero/r3/index.html",
    "sourceClosure": {name: hashlib.sha256((ROOT / name).read_bytes()).hexdigest() for name in freeze_names if (ROOT / name).exists()},
    "evidenceHashes": {name.removeprefix("evidence/"): hashlib.sha256((ROOT / name).read_bytes()).hexdigest()
                       for name in freeze_names if (ROOT / name).exists()},
    "quality": "technical replay verified; visual quality, listening, game integration, and public replay remain separate gates",
}
(EVIDENCE / "freeze-r3.json").write_text(json.dumps(manifest, indent=2), encoding="utf-8")
print(json.dumps(payload, indent=2))
