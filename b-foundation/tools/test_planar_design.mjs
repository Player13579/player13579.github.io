import assert from 'node:assert/strict';
import test from 'node:test';

import { DEFAULT_SETTINGS as DEFAULT_ROSETTE_SETTINGS } from '../labs/rosette-geometry.mjs';
import { DEFAULT_POSE, DEFAULT_SOURCE_SETTINGS, VIEW_BOX, constructPlanarProjection } from '../labs/planar-projection.mjs';
import { constructPlanarDesign } from '../labs/planar-design.mjs';

const EPS = 3e-12;
const EXPECTED_CHAPTERS = [
  'FoundationOperationTemplate',
  'InferenceExpansionPolicy',
  'PlatonicGoodTemplate',
  'CoordinateGravityWindTemplate',
  'OctaDomainTemplate',
  'AnimeStudiesTemplate',
  'ExtremumDesignColorTemplate',
  'ReflectionClosureTemplate',
  'TermsTemplate',
  'PhenomenonSystemTemplate',
  'ObservationIntegrationTemplate',
  'PEMTemplate',
  'PhenomenonProfileTemplate',
  'GlobalAcceptanceTemplate',
];

function close(a, b, tolerance = EPS) {
  assert.ok(Math.abs(a - b) <= tolerance, `${a} differs from ${b} by more than ${tolerance}`);
}

function customSourceSettings() {
  return {
    group: 'cyclic',
    sectors: 8,
    radius: 1.5,
    tilt: 25,
    orientation: 30,
    seed: {
      ...DEFAULT_ROSETTE_SETTINGS.seed,
      profile: 'tighten',
      strength: 75,
      flip: false,
      widthStart: 0.8,
      widthEnd: 0.2,
    },
  };
}

function screenToProjected([x, y]) {
  const [, , width, height] = VIEW_BOX;
  const [x0, y0] = VIEW_BOX;
  return [x * width + x0, -(y * height + y0)];
}

function textLeaves(value, result = []) {
  if (typeof value === 'string') result.push(value);
  else if (Array.isArray(value)) value.forEach((item) => textLeaves(item, result));
  else if (value && typeof value === 'object') Object.values(value).forEach((item) => textLeaves(item, result));
  return result;
}

function assertDesignMatchesModel(pose, sourceSettings) {
  const design = constructPlanarDesign(pose, sourceSettings);
  const model = constructPlanarProjection(pose, sourceSettings);
  const motif = design.PhenomenonSystemTemplate.SharedConditions.PlanarMotif;
  assert.deepEqual(motif.selected_pose, model.pose);
  assert.deepEqual(motif.source_settings, model.sourceSettings);
  assert.equal(motif.construction_instance_count, model.instances.length);
  assert.equal(motif.screen_polygons.length, model.instances.length);
  assert.equal(motif.projected_polygons.length, model.instances.length);
  let vertexCount = 0;
  for (let i = 0; i < model.instances.length; i += 1) {
    const expected = model.instances[i];
    const raw = motif.projected_polygons[i];
    const actual = motif.screen_polygons[i];
    assert.deepEqual(Object.keys(raw), ['index', 'vertices']);
    assert.deepEqual(Object.keys(actual), ['index', 'vertices']);
    assert.equal(raw.index, expected.index);
    assert.equal(actual.index, expected.index);
    assert.deepEqual(raw.vertices, expected.projectedPolygon);
    assert.equal(actual.vertices.length, raw.vertices.length);
    vertexCount += actual.vertices.length;
    for (let j = 0; j < expected.projectedPolygon.length; j += 1) {
      const projected = expected.projectedPolygon[j];
      const screen = actual.vertices[j];
      const recovered = screenToProjected(screen);
      close(recovered[0], projected[0]);
      close(recovered[1], projected[1]);
      const [, , width, height] = VIEW_BOX;
      const [x0, y0] = VIEW_BOX;
      close(screen[0], (raw.vertices[j][0] - x0) / width);
      close(screen[1], (-raw.vertices[j][1] - y0) / height);
    }
  }
  return { design, model, vertexCount };
}

test('preserves the complete 14-chapter structure and non-evaluated generation state', () => {
  const { design } = assertDesignMatchesModel(DEFAULT_POSE, DEFAULT_SOURCE_SETTINGS);
  assert.deepEqual(Object.keys(design), EXPECTED_CHAPTERS);

  const operation = design.FoundationOperationTemplate;
  assert.equal(operation.OutputContract.operation, 'design_only');
  const generation = operation.GenerationContract;
  assert.match(generation.backend, /未選択/);
  assert.deepEqual(generation.entries, []);
  assert.equal(generation.coverage_status, 'not_run');
  assert.deepEqual(generation.unresolved, []);

  const acceptance = design.GlobalAcceptanceTemplate;
  const results = acceptance.ValidationResults;
  assert.equal(results.StructuralInspection.status, 'not_run');
  assert.equal(results.SemanticReconciliation.status, 'not_run');
  assert.equal(results.RenderObservation.status, 'not_run');
  assert.equal(acceptance.ComparativeEvaluation.status, 'not_run');
  assert.equal(acceptance.OutcomeEvaluation.intent_alignment.status, 'not_run');
  assert.equal(acceptance.OutcomeEvaluation.artistic_effect.status, 'not_run');
  assert.equal(acceptance.EvaluatorCalibration.status, 'not_run');

  const gaze = design.PEMTemplate.CausalMesh;
  assert.equal(gaze.gaze_target_policy, 'not_applicable_display_only');
  assert.match(gaze.gaze_path_A, /^not_applicable:/);
  assert.match(gaze.gaze_path_B, /^not_applicable:/);
  assert.match(gaze.adjustment_reason, /視線経路/);
  assert.equal(gaze.physical_mesh_required, false);
  assert.equal(Object.hasOwn(gaze, 'local_extrema_connected_to_gaze_paths'), false);

  const projection = design.CoordinateGravityWindTemplate.ProjectionSet;
  assert.equal(projection.explicit_selection, 'user_declared');
  assert.equal(projection.projections.length, 1);
  assert.equal(projection.projections[0].projection_id, 'P1');
  assert.equal(projection.projections[0].projection_model, 'explicit_mapping');
  assert.deepEqual(projection.projections[0].entity_refs, []);
  assert.match(projection.selection_basis, /現在の設定/);
});

test('keeps PH and Entity registries empty with only one display-artifact observation', () => {
  const { design } = assertDesignMatchesModel(DEFAULT_POSE, DEFAULT_SOURCE_SETTINGS);
  const phenomenon = design.PhenomenonSystemTemplate;
  assert.deepEqual(Object.keys(phenomenon.PhenomenonRegistry), []);
  assert.deepEqual(Object.keys(phenomenon.PhenomenonBlock), []);
  assert.deepEqual(Object.keys(phenomenon.EntityRegistry), []);
  const observations = design.ObservationIntegrationTemplate.ObservationRegistry;
  assert.deepEqual(Object.keys(observations), ['OBS1']);
  assert.equal(observations.OBS1.operation_type, 'display_artifact');
  assert.deepEqual(observations.OBS1.input_references, []);
});

test('records only the selected pose, source settings, and every current projected polygon', () => {
  const cases = [
    { pose: DEFAULT_POSE, source: DEFAULT_SOURCE_SETTINGS },
    { pose: { projection: 'perspective', tilt: -80, roll: -180, distance: 2 }, source: customSourceSettings() },
    { pose: { projection: 'perspective', tilt: 80, roll: 180, distance: 8 }, source: customSourceSettings() },
    { pose: { projection: 'orthographic', tilt: -80, roll: 180, distance: 2 }, source: customSourceSettings() },
    { pose: { projection: 'orthographic', tilt: 80, roll: -180, distance: 8 }, source: DEFAULT_SOURCE_SETTINGS },
  ];
  for (const { pose, source } of cases) {
    const { design, model, vertexCount } = assertDesignMatchesModel(pose, source);
    const motif = design.PhenomenonSystemTemplate.SharedConditions.PlanarMotif;
    assert.ok(vertexCount > 0);
    assert.equal(motif.selected_pose.projection, pose.projection);
    assert.equal(motif.selected_pose.distance, pose.distance);
    assert.equal(motif.screen_polygons.length, model.instances.length);
    assert.ok(!Object.hasOwn(motif, 'baseline'));
    assert.ok(!Object.hasOwn(motif, 'helpers'));
    assert.ok(!Object.hasOwn(motif, 'comparison'));
  }
});

test('specifies a transparent 1024-square single-color, stroke-free motif', () => {
  const { design } = assertDesignMatchesModel(DEFAULT_POSE, DEFAULT_SOURCE_SETTINGS);
  const motif = design.PhenomenonSystemTemplate.SharedConditions.PlanarMotif;
  assert.deepEqual(motif.output_pixels, [1024, 1024]);
  assert.deepEqual(motif.screen_domain, [0, 0, 1, 1]);
  assert.equal(motif.fill_srgb.toLowerCase(), '#147d78');
  assert.equal(motif.fill_alpha, 1);
  assert.equal(motif.background_alpha, 0);
  assert.match(motif.fill_rule, /nonzero/);
  assert.match(motif.fill_rule, /ストロークなし/);
  assert.equal(motif.paint_order, 'indexの昇順。各多角形を別々に閉じて塗る。');
  assert.deepEqual(motif.projected_svg_view_box, VIEW_BOX);
  assert.deepEqual(motif.screen_from_projected, [
    [1 / VIEW_BOX[2], 0, -VIEW_BOX[0] / VIEW_BOX[2]],
    [0, -1 / VIEW_BOX[3], -VIEW_BOX[1] / VIEW_BOX[3]],
    [0, 0, 1],
  ]);
});

test('rejects invalid pose and source through the existing projection constructor', () => {
  assert.throws(() => constructPlanarDesign({ ...DEFAULT_POSE, tilt: 81 }, DEFAULT_SOURCE_SETTINGS));
  assert.throws(() => constructPlanarDesign(DEFAULT_POSE, { ...DEFAULT_SOURCE_SETTINGS, sectors: 1 }));
  assert.throws(() => constructPlanarDesign(DEFAULT_POSE, {
    ...DEFAULT_SOURCE_SETTINGS,
    seed: { ...DEFAULT_SOURCE_SETTINGS.seed, widthStart: 9 },
  }));
});

test('does not mutate inputs and isolates each returned design', () => {
  const pose = { projection: 'perspective', tilt: -35, roll: 75, distance: 4.5 };
  const source = customSourceSettings();
  const poseBefore = structuredClone(pose);
  const sourceBefore = structuredClone(source);
  const one = constructPlanarDesign(pose, source);
  assert.deepEqual(pose, poseBefore);
  assert.deepEqual(source, sourceBefore);
  const motifOne = one.PhenomenonSystemTemplate.SharedConditions.PlanarMotif;
  motifOne.screen_polygons[0].vertices[0][0] = -300;
  motifOne.source_settings.seed.widthStart = 0;
  one.FoundationOperationTemplate.GenerationContract.entries.push('local mutation');

  const two = constructPlanarDesign(pose, source);
  const motifTwo = two.PhenomenonSystemTemplate.SharedConditions.PlanarMotif;
  assert.notEqual(motifTwo.screen_polygons[0].vertices[0][0], -300);
  assert.equal(motifTwo.source_settings.seed.widthStart, source.seed.widthStart);
  assert.deepEqual(two.FoundationOperationTemplate.GenerationContract.entries, []);
  assert.notEqual(one.PhenomenonSystemTemplate, two.PhenomenonSystemTemplate);
});

test('exports the arguments, not the default or pinned baseline values', () => {
  const pose = { projection: 'orthographic', tilt: 35, roll: -70, distance: 6.25 };
  const source = customSourceSettings();
  const { design, model } = assertDesignMatchesModel(pose, source);
  const motif = design.PhenomenonSystemTemplate.SharedConditions.PlanarMotif;
  assert.deepEqual(motif.selected_pose, pose);
  assert.deepEqual(motif.source_settings, source);
  assert.equal(motif.construction_instance_count, 8);
  assert.equal(motif.source_settings.group, 'cyclic');
  assert.equal(motif.source_settings.seed.profile, 'tighten');
  assert.notDeepEqual(motif.selected_pose, DEFAULT_POSE);
  assert.notDeepEqual(motif.source_settings, DEFAULT_SOURCE_SETTINGS);
  assert.equal(motif.screen_polygons.length, model.instances.length);
});

test('forbidden legacy identifiers, colors, and 1000 references are absent from all design strings', () => {
  const { design } = assertDesignMatchesModel(DEFAULT_POSE, DEFAULT_SOURCE_SETTINGS);
  const strings = textLeaves(design);
  const legacyIdA = ['R', '_left'].join('');
  const legacyIdB = ['G1', 'T1'].join('');
  const oldFourDigit = ['10', '00'].join('');
  for (const text of strings) {
    assert.equal(text.includes(legacyIdA), false);
    assert.equal(text.includes(legacyIdB), false);
    assert.equal(text.includes(oldFourDigit), false);
  }
  const colors = strings.flatMap((text) => text.match(/#[0-9a-f]{6}/gi) ?? []);
  assert.deepEqual([...new Set(colors.map((color) => color.toLowerCase()))], ['#147d78']);
});
