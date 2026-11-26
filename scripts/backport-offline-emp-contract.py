#!/usr/bin/env python3
"""Canonical EMP geometry-only backport. Source server blob:
0543c22a46095a227ea13ab59e6c17e794249d34 in Player13579/windows-dva-migration.
Never regenerate unrelated gameplay from the historical migration snapshot.
"""
from pathlib import Path
root = Path(__file__).resolve().parent.parent
old = '  const visualSettlement = {resolvedEmpPulseIds: [first.id, second.id], empSourceAxis: Math.atan2(second.y - first.y, second.x - first.x)};'
new = "  const dx = second.x - first.x;\n  const dy = second.y - first.y;\n  const sourceHalfSpan = Math.hypot(dx, dy) / 2;\n  const visualSettlement = {\n    resolvedEmpPulseIds: [first.id, second.id],\n    empSourceAxis: Math.atan2(dy, dx),\n    ...(Number.isFinite(sourceHalfSpan) && sourceHalfSpan >= 0 ? { sourceHalfSpan } : {})\n  };"
anchor = '      empSourceAxis: Number.isFinite(options.empSourceAxis) ? options.empSourceAxis : 0,'
serializer = "      ...(Number.isFinite(options.sourceHalfSpan) && options.sourceHalfSpan >= 0\n        ? { sourceHalfSpan: options.sourceHalfSpan }\n        : {}),"
updates = []
for name in ['offline-server-main.js','offline-server-worker.js','offline-server-main-fire-e-causal-v920-box-grenades-r1.js','offline-server-worker-fire-e-causal-v920-box-grenades-r1.js']:
    p = root / name
    s = p.read_text()
    if new in s and serializer in s:
        continue
    assert 'sourceHalfSpan' not in s, 'Partial or unknown producer contract'
    assert s.count(old) == 1 and s.count(anchor) == 1
    updates.append((p, s.replace(old,new).replace(anchor,anchor+'\n'+serializer)))
for p,s in updates:
    p.write_text(s)

