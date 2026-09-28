import json, pathlib
root = pathlib.Path(__file__).resolve().parents[1]
status = {
    "version": "barrier-pro-r0.7",
    "real_gpu_acceptance": "not_run",
    "continuous_playback_acceptance": "not_run",
    "real_audio_acceptance": "not_run",
    "quality_acceptance": "not_run",
    "notes": [
        "Real GPU observation and real listening were not executed inside this package build.",
        "Compile success and numeric tests are not quality acceptance."
    ]
}
(root / 'results' / 'release-status.json').write_text(json.dumps(status, indent=2), encoding='utf-8')
print('release-status.json written')
