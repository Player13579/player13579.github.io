(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = { buildState: api.buildState, polygonArea: api.polygonArea, sharedEdgeLength: api.sharedEdgeLength };
  if (root && root.window === root) root.CompositionLab = api;
  if (root && root.document) {
    const start = () => api.init(root.document, root.fetch.bind(root), root.URL);
    if (root.document.readyState === 'loading') root.document.addEventListener('DOMContentLoaded', start, { once: true });
    else start();
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  const EPSILON = 1e-10;
  const REGION_IDS = ['R_left', 'R_right', 'R_base'];
  const SVG_NS = 'http://www.w3.org/2000/svg';

  function polygonArea(points) {
    if (!Array.isArray(points) || points.length < 3) return 0;
    let twice = 0;
    for (let i = 0; i < points.length; i += 1) {
      const [x1, y1] = points[i];
      const [x2, y2] = points[(i + 1) % points.length];
      twice += x1 * y2 - x2 * y1;
    }
    return Math.abs(twice) / 2;
  }

  function sharedEdgeLength(a, b) {
    let total = 0;
    for (let i = 0; i < a.length; i += 1) {
      const p = a[i], q = a[(i + 1) % a.length];
      const ux = q[0] - p[0], uy = q[1] - p[1];
      const length = Math.hypot(ux, uy);
      if (length <= EPSILON) continue;
      const axisX = ux / length, axisY = uy / length;
      for (let j = 0; j < b.length; j += 1) {
        const r = b[j], s = b[(j + 1) % b.length];
        const vx = s[0] - r[0], vy = s[1] - r[1];
        const crossDirections = ux * vy - uy * vx;
        const crossOffset = ux * (r[1] - p[1]) - uy * (r[0] - p[0]);
        if (Math.abs(crossDirections) > EPSILON * length * Math.hypot(vx, vy) || Math.abs(crossOffset) > EPSILON * length) continue;
        const p0 = p[0] * axisX + p[1] * axisY;
        const p1 = q[0] * axisX + q[1] * axisY;
        const r0 = r[0] * axisX + r[1] * axisY;
        const r1 = s[0] * axisX + s[1] * axisY;
        total += Math.max(0, Math.min(Math.max(p0, p1), Math.max(r0, r1)) - Math.max(Math.min(p0, p1), Math.min(r0, r1)));
      }
    }
    return total;
  }

  function horizontalIntersections(points, y) {
    const xs = [];
    for (let i = 0; i < points.length; i += 1) {
      const a = points[i], b = points[(i + 1) % points.length];
      if (Math.abs(a[1] - b[1]) <= EPSILON) {
        if (Math.abs(y - a[1]) <= EPSILON) xs.push(a[0], b[0]);
      } else if (y >= Math.min(a[1], b[1]) - EPSILON && y <= Math.max(a[1], b[1]) + EPSILON) {
        const t = (y - a[1]) / (b[1] - a[1]);
        if (t >= -EPSILON && t <= 1 + EPSILON) xs.push(a[0] + t * (b[0] - a[0]));
      }
    }
    return xs;
  }

  function boundsOf(polygons) {
    const vertices = Object.values(polygons).flat();
    return [Math.min(...vertices.map(p => p[0])), Math.min(...vertices.map(p => p[1])), Math.max(...vertices.map(p => p[0])), Math.max(...vertices.map(p => p[1]))];
  }

  function darkComponentCount(polygons, assignment) {
    const dark = REGION_IDS.filter(id => assignment[id] === 'D1');
    const seen = new Set();
    let components = 0;
    for (const start of dark) {
      if (seen.has(start)) continue;
      components += 1;
      const queue = [start];
      seen.add(start);
      while (queue.length) {
        const current = queue.pop();
        for (const other of dark) {
          if (!seen.has(other) && sharedEdgeLength(polygons[current], polygons[other]) > EPSILON) {
            seen.add(other);
            queue.push(other);
          }
        }
      }
    }
    return components;
  }

  function buildState(caseData, geometryId, toneId) {
    if (!caseData || caseData.format !== 'composition-lab-case-1') throw new TypeError('未対応の比較データです。');
    const geometryChoice = caseData.alternatives && caseData.alternatives.geometry && caseData.alternatives.geometry[geometryId];
    const assignment = caseData.alternatives && caseData.alternatives.tone && caseData.alternatives.tone[toneId];
    if (!geometryChoice || !assignment) throw new RangeError('形または色面の選択肢が比較データにありません。');
    const polygons = {};
    for (const id of REGION_IDS) {
      if (!Array.isArray(caseData.accepted_polygons[id])) throw new TypeError(`領域 ${id} の頂点データがありません。`);
      polygons[id] = caseData.accepted_polygons[id].map(point => point.slice());
    }
    const dx = Number(geometryChoice.right_bottom_dx);
    if (!Number.isFinite(dx)) throw new TypeError('右側下端の移動量が不正です。');
    polygons.R_right[2][0] += dx;
    polygons.R_right[3][0] += dx;

    const areas = {};
    for (const id of REGION_IDS) areas[id] = polygonArea(polygons[id]);
    areas.D1 = REGION_IDS.filter(id => assignment[id] === 'D1').reduce((sum, id) => sum + areas[id], 0);
    areas.M = REGION_IDS.filter(id => assignment[id] === 'M').reduce((sum, id) => sum + areas[id], 0);
    areas.L = 1 - areas.D1 - areas.M;
    areas.background = areas.L;

    const topY = caseData.accepted_polygons.R_left[0][1];
    const bottomY = caseData.accepted_polygons.R_left[2][1];
    const leftTop = horizontalIntersections(polygons.R_left, topY);
    const rightTop = horizontalIntersections(polygons.R_right, topY);
    const leftBottom = horizontalIntersections(polygons.R_left, bottomY);
    const rightBottom = horizontalIntersections(polygons.R_right, bottomY);
    const topGap = Math.min(...rightTop) - Math.max(...leftTop);
    const bottomGap = Math.min(...rightBottom) - Math.max(...leftBottom);

    const palette = Object.assign({}, caseData.palette);
    for (const id of REGION_IDS) if (!['D1', 'M'].includes(assignment[id])) throw new TypeError(`領域 ${id} の色割り当てが不正です。`);
    return {
      polygons,
      assignment: Object.assign({}, assignment),
      areas,
      palette,
      darkComponents: darkComponentCount(polygons, assignment),
      gap: { top: topGap, bottom: bottomGap },
      bounds: boundsOf(polygons),
    };
  }

  function formatPercent(value) { return `${(value * 100).toFixed(1)}%`; }
  function formatBounds(bounds) { return `x ${bounds[0].toFixed(3)}–${bounds[2].toFixed(3)}、y ${bounds[1].toFixed(3)}–${bounds[3].toFixed(3)}`; }

  function paintSvg(svg, state) {
    svg.replaceChildren();
    svg.style.backgroundColor = state.palette.L;
    const groups = new Map();
    for (const id of REGION_IDS) {
      const color = state.palette[state.assignment[id]];
      if (!groups.has(color)) groups.set(color, []);
      groups.get(color).push(id);
    }
    for (const [color, ids] of groups) {
      const path = svg.ownerDocument.createElementNS(SVG_NS, 'path');
      const data = ids.map(id => state.polygons[id].map(([x, y], index) => `${index === 0 ? 'M' : 'L'}${x * 1000} ${y * 1000}`).join(' ') + ' Z').join(' ');
      path.setAttribute('d', data);
      path.setAttribute('fill', color);
      path.setAttribute('fill-rule', 'nonzero');
      path.setAttribute('data-regions', ids.join(' '));
      path.setAttribute('aria-hidden', 'true');
      svg.appendChild(path);
    }
  }

  function fillNumbers(dl, state) {
    const rows = [
      ['左の領域', formatPercent(state.areas.R_left)], ['右の領域', formatPercent(state.areas.R_right)],
      ['底の領域', formatPercent(state.areas.R_base)], ['D1 暗色群', formatPercent(state.areas.D1)],
      ['M 中間色群', formatPercent(state.areas.M)], ['L 背景', formatPercent(state.areas.L)],
      ['D1 の辺つながり', `${state.darkComponents}群`], ['空隙・上 / 下', `${formatPercent(state.gap.top)} / ${formatPercent(state.gap.bottom)}`],
      ['図形全体の範囲', formatBounds(state.bounds)],
    ];
    dl.replaceChildren();
    for (const [label, value] of rows) {
      const wrapper = dl.ownerDocument.createElement('div'); wrapper.className = 'number';
      const dt = dl.ownerDocument.createElement('dt'); dt.textContent = label;
      const dd = dl.ownerDocument.createElement('dd'); dd.textContent = value;
      wrapper.append(dt, dd); dl.appendChild(wrapper);
    }
  }

  function fillInvariants(list, state, reference) {
    const entries = [
      `領域は3つ。各面積は左 ${formatPercent(state.areas.R_left)}、右 ${formatPercent(state.areas.R_right)}、底 ${formatPercent(state.areas.R_base)}。`,
      `外接範囲 ${formatBounds(state.bounds)}。固定比較から面積と全体範囲を保っています。`,
      `暗色群は${state.darkComponents}つ。長さのある共通辺だけで判定し、点接触は数えません。`,
      `空隙は上 ${formatPercent(state.gap.top)}、下 ${formatPercent(state.gap.bottom)}。`,
      reference ? 'この固定例は G0 / T0 のままです。' : 'G0/G1では右下の2頂点だけが移動し、T0/T1では色割り当てだけが変わります。',
    ];
    list.replaceChildren();
    for (const entry of entries) { const li = list.ownerDocument.createElement('li'); li.textContent = entry; list.appendChild(li); }
  }

  function renderPair(doc, state, prefix, reference) {
    paintSvg(doc.getElementById(`${prefix}-large`), state);
    paintSvg(doc.getElementById(`${prefix}-mini`), state);
    fillNumbers(doc.getElementById(`${prefix}-numbers`), state);
    fillInvariants(doc.getElementById(`${prefix}-invariants`), state, reference);
  }

  async function init(doc, fetcher, URLCtor) {
    const status = doc.getElementById('load-status');
    const geometry = doc.getElementById('geometry-choice');
    const tone = doc.getElementById('tone-choice');
    const reset = doc.getElementById('reset-choice');
    try {
      const response = await fetcher(new URLCtor('composition-case.json', doc.location.href));
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const caseData = await response.json();
      const reference = buildState(caseData, 'G0', 'T0');
      const initial = caseData.selected || { geometry: 'G1', tone: 'T1' };
      geometry.value = initial.geometry; tone.value = initial.tone;
      geometry.disabled = false; tone.disabled = false; reset.disabled = false;

      const legend = doc.getElementById('legend');
      for (const [id, label] of [['D1', '暗い色'], ['M', '中間の色'], ['L', '背景']]) {
        const li = doc.createElement('li');
        const swatch = doc.createElement('span'); swatch.className = 'swatch'; swatch.style.backgroundColor = caseData.palette[id];
        li.append(swatch, doc.createTextNode(label)); legend.appendChild(li);
      }
      legend.hidden = false;
      const source = doc.getElementById('source-link'); source.href = caseData.source_url;
      source.textContent = '元のB3参考設計を開く';
      renderPair(doc, reference, 'baseline', true);

      const update = () => {
        const state = buildState(caseData, geometry.value, tone.value);
        const geometryCaption = geometry.value === 'G0' ? '一定の幅' : '下へ狭まる';
        const toneCaption = tone.value === 'T0' ? '左右に分かれる' : '左から下へつながる';
        doc.getElementById('current-description').textContent = `余白は${geometryCaption}、暗い面は${toneCaption}状態です。`;
        renderPair(doc, state, 'current', false);
        status.textContent = '表示と数値は同じ座標モデルから計算しています。';
        status.removeAttribute('role'); status.setAttribute('role', 'status');
      };
      geometry.addEventListener('change', update); tone.addEventListener('change', update);
      reset.addEventListener('click', () => { geometry.value = 'G1'; tone.value = 'T1'; update(); geometry.focus(); });
      update();
    } catch (error) {
      status.textContent = `比較データを読み込めませんでした。描画・数値表示は開始していません。${error && error.message ? ` (${error.message})` : ''} 静的サイト上で labs/composition-case.json が読めることを確認してください。`;
      status.setAttribute('role', 'alert');
      geometry.disabled = true; tone.disabled = true; reset.disabled = true;
    }
  }

  return { buildState, polygonArea, sharedEdgeLength, init };
});
