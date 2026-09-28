/* Shared-device composition for the currently connected main-field passes.
 * This is deliberately a partial registry: a caller must pass the full-frame
 * readiness gate before replacing the visible Canvas 2D frame. */
(function (root) {
  'use strict';

  const defaults = Object.freeze({
    scene: root.DvaWebGPUMainScene || (typeof require === 'function' ? require('./webgpu-main-scene.js') : null),
    field: root.DvaWebGPUFieldPass || (typeof require === 'function' ? require('./webgpu-field-pass.js') : null),
    environmentE: root.DvaWebGPUMedicalEnvironmentE || (typeof require === 'function' ? require('./webgpu-medical-environment-e.js') : null),
    corridorA01E: root.DvaWebGPUCorridorA01E || (typeof require === 'function' ? require('./webgpu-corridor-a01-e.js') : null),
    corridorObjectUseE: root.DvaWebGPUCorridorObjectUseE || (typeof require === 'function' ? require('./webgpu-corridor-object-use-e.js') : null),
    roomObjectUseE: root.DvaWebGPURoomObjectUseE || (typeof require === 'function' ? require('./webgpu-room-object-use-e.js') : null),
    reactorRoomObjectsE: root.DvaWebGPUReactorRoomObjectsE || (typeof require === 'function' ? require('./webgpu-reactor-room-objects-e.js') : null),
    powerRoomObjectsE: root.DvaWebGPUPowerRoomObjectsE || (typeof require === 'function' ? require('./webgpu-power-room-objects-e.js') : null),
    medicalObjectE: root.DvaWebGPUMedicalObjectE || (typeof require === 'function' ? require('./webgpu-medical-object-e.js') : null),
    medicalCabinetE: root.DvaWebGPUMedicalCabinetE || (typeof require === 'function' ? require('./webgpu-medical-cabinet-e.js') : null),
    medicalFootbathUseE: root.DvaWebGPUMedicalFootbathUseE || (typeof require === 'function' ? require('./webgpu-medical-footbath-use-e.js') : null),
    medicalUploadConsoleE: root.DvaWebGPUMedicalUploadConsoleE || (typeof require === 'function' ? require('./webgpu-medical-upload-console-e.js') : null),
    medicalFixtureE: root.DvaWebGPUMedicalFixtureE || (typeof require === 'function' ? require('./webgpu-medical-fixture-e.js') : null),
    shapes: root.DvaWebGPUEffectShapes || (typeof require === 'function' ? require('./webgpu-effect-shapes.js') : null),
    stations: root.DvaWebGPUStations || (typeof require === 'function' ? require('./webgpu-stations.js') : null),
    mapObjects: root.DvaWebGPUMapObjectLabels || (typeof require === 'function' ? require('./webgpu-map-object-labels.js') : null),
    mysteryBoxes: root.DvaWebGPUMysteryBoxes || (typeof require === 'function' ? require('./webgpu-mystery-boxes.js') : null),
    mysteryBoxRevealE: root.DvaWebGPUMysteryBoxRevealE || (typeof require === 'function' ? require('./webgpu-mystery-box-reveal-e.js') : null),
    alchemyObjects: root.DvaWebGPUAlchemyObjects || (typeof require === 'function' ? require('./webgpu-alchemy-objects.js') : null),
    groundItems: root.DvaWebGPUGroundItems || (typeof require === 'function' ? require('./webgpu-ground-items.js') : null),
    facilityEffects: root.DvaWebGPUFacilityEffects || (typeof require === 'function' ? require('./webgpu-facility-effects.js') : null),
    bodies: root.DvaWebGPUBodies || (typeof require === 'function' ? require('./webgpu-bodies.js') : null),
    worldSound: root.DvaWebGPUWorldSoundEffects || (typeof require === 'function' ? require('./webgpu-world-sound-effects.js') : null),
    throwPreview: root.DvaWebGPUThrowPreview || (typeof require === 'function' ? require('./webgpu-throw-preview.js') : null),
    preparationSummons: root.DvaWebGPUPreparationSummons || (typeof require === 'function' ? require('./webgpu-preparation-summons.js') : null),
    players: root.DvaWebGPUPlayerSprite || (typeof require === 'function' ? require('./webgpu-player-sprite.js') : null),
    playerNameplates: root.DvaWebGPUPlayerNameplates || (typeof require === 'function' ? require('./webgpu-player-nameplates.js') : null),
    headMarkers: root.DvaWebGPUHeadMarkers || (typeof require === 'function' ? require('./webgpu-head-markers.js') : null),
    gunnerAim: root.DvaWebGPUGunnerAim || (typeof require === 'function' ? require('./webgpu-gunner-aim.js') : null),
    killCamera: root.DvaWebGPUKillCameraMarkers || (typeof require === 'function' ? require('./webgpu-kill-camera-markers.js') : null),
    hitEffects: root.DvaWebGPUHitEffects || (typeof require === 'function' ? require('./webgpu-hit-effects.js') : null),
    gravityImpacts: root.DvaWebGPUGravityImpacts || (typeof require === 'function' ? require('./webgpu-gravity-impacts.js') : null),
    grenadeImpacts: root.DvaWebGPUGrenadeImpact || (typeof require === 'function' ? require('./webgpu-grenade-impact.js') : null),
    bodyBenefits: root.DvaWebGPUBodyBenefitPass || (typeof require === 'function' ? require('./webgpu-body-benefit-pass.js') : null),
    staminaBenefitE: root.DvaStaminaBenefitE || (typeof require === 'function' ? require('./webgpu-stamina-benefit-e.js') : null),
    manaBenefitE: root.DvaManaBenefitE || (typeof require === 'function' ? require('./webgpu-mana-benefit-e.js') : null),
    bodyBenefitExtra: root.DvaWebGPUBodyBenefitExtra || (typeof require === 'function' ? require('./webgpu-body-benefit-extra.js') : null),
    statusTempo: root.DvaWebGPUStatusTempoE || (typeof require === 'function' ? require('./webgpu-status-tempo-e.js') : null),
    barrierE: root.DvaWebGPUBarrierE || (typeof require === 'function' ? require('./webgpu-barrier-e.js') : null),
    barrierProR07Game: root.DvaWebGPUBarrierProR07Game || (typeof require === 'function' ? require('./webgpu-barrier-pro-r07-game.js') : null),
    bustE: root.DvaWebGPUBustE || (typeof require === 'function' ? require('./webgpu-bust-e.js') : null),
    dodgeE: root.DvaWebGPUDodgeE || (typeof require === 'function' ? require('./webgpu-dodge-e.js') : null),
    renkiE: root.DvaWebGPURenkiE || (typeof require === 'function' ? require('./webgpu-renki-e.js') : null),
    ideaE: root.DvaWebGPIdeaE || (typeof require === 'function' ? require('./webgpu-idea-e.js') : null),
    alchemyE: root.DvaWebGPUAlchemyE || (typeof require === 'function' ? require('./webgpu-alchemy-e.js') : null),
    hackerRootE: root.DvaWebGPUHackerRootE || (typeof require === 'function' ? require('./webgpu-hacker-root-e.js') : null),
    hackerStatusRecoveryE: root.DvaWebGPUHackerStatusRecoveryE || (typeof require === 'function' ? require('./webgpu-hacker-status-recovery-e.js') : null),
    floraE: root.DvaWebGPUFloraE || (typeof require === 'function' ? require('./webgpu-flora-e.js') : null),
    healE: root.DvaHealAstraE || (typeof require === 'function' ? require('./webgpu-heal-astra-prototype.js') : null),
    healSparkleE: root.DvaHealSparkle || (typeof require === 'function' ? require('./webgpu-heal-sparkle-r1.js') : null),
    healSparkleGameAdapter: root.DvaHealSparkleGameAdapter || (typeof require === 'function' ? require('./webgpu-heal-astra-sparkle-r1-game-adapter.js') : null),
    sunbeamE: root.DvaSunbeamAstraV3GameAdapter || (typeof require === 'function' ? require('./webgpu-sunbeam-astra-v3-game.js') : null),
    fighterEnergyE: root.DvaWebGPUFighterEnergyE || (typeof require === 'function' ? require('./webgpu-fighter-energy-e.js') : null),
    hoverSprintE: root.DvaWebGPUHoverSprintE || (typeof require === 'function' ? require('./webgpu-hover-sprint-e.js') : null),
    gravityFieldE: root.DvaWebGPUGravityFieldE || (typeof require === 'function' ? require('./webgpu-gravity-field-e.js') : null),
    rigidItemImpactE: root.DvaWebGPURigidItemImpactE || (typeof require === 'function' ? require('./webgpu-rigid-item-impact-e.js') : null),
    bottleShardsE: root.DvaWebGPUBottleShardsE || (typeof require === 'function' ? require('./webgpu-bottle-shards-e.js') : null),
    archiveCabinetE: root.DvaWebGPUArchiveCabinetE || (typeof require === 'function' ? require('./webgpu-archive-cabinet-e.js') : null),
    cableSpoolE: root.DvaWebGPUCableSpoolE || (typeof require === 'function' ? require('./webgpu-cable-spool-e.js') : null),
    fireActivation: root.DvaWebGPUFireActivation || (typeof require === 'function' ? require('./webgpu-fire-activation.js') : null),
    empEffect: root.DvaWebGPUEmpEffect || (typeof require === 'function' ? require('./webgpu-emp-effect.js') : null),
    specialAmmoEffect: root.DvaWebGPUSpecialAmmoEffect || (typeof require === 'function' ? require('./webgpu-special-ammo-effect.js') : null),
    commonActionBodyE: root.DvaWebGPUCommonActionBodyE || (typeof require === 'function' ? require('./webgpu-common-action-body-e.js') : null),
    attackTargets: root.DvaWebGPUAttackTargets || (typeof require === 'function' ? require('./webgpu-attack-targets.js') : null),
    taskIndicators: root.DvaWebGPUTaskIndicators || (typeof require === 'function' ? require('./webgpu-task-indicators.js') : null),
    hud: root.DvaWebGPUHud || (typeof require === 'function' ? require('./webgpu-hud.js') : null),
    minimap: root.DvaWebGPUMinimap || (typeof require === 'function' ? require('./webgpu-minimap.js') : null),
    modeBanner: root.DvaWebGPUModeBanner || (typeof require === 'function' ? require('./webgpu-mode-banner.js') : null),
    killBloom: root.DvaWebGPUKillResidualBloom || (typeof require === 'function' ? require('./webgpu-kill-residual-bloom.js') : null),
    killAnimation: root.DvaWebGPUKillAnimation || (typeof require === 'function' ? require('./webgpu-kill-animation.js') : null),
    sensory: root.DvaWebGPUSensoryBlackout || (typeof require === 'function' ? require('./webgpu-sensory-blackout.js') : null),
    markerExplanation: root.DvaWebGPUMarkerExplanation || (typeof require === 'function' ? require('./webgpu-marker-explanation.js') : null),
    expandedMap: root.DvaWebGPUExpandedMap || (typeof require === 'function' ? require('./webgpu-expanded-map.js') : null),
    acquisition: root.DvaWebGPUAcquisition || (typeof require === 'function' ? require('./webgpu-acquisition.js') : null)
  });
  const BUILT = Object.freeze(['map', 'environmentE', 'stations', 'mapObjects', 'mysteryBoxes',
    'alchemyObjects', 'gravityHazards', 'groundItems', 'facilityEffects',
    'bodies', 'worldSound', 'throwPreview', 'preparationSummons', 'players',
    'gunnerAim', 'killCamera', 'hitEffects', 'magicEffects',
    'attackTargets', 'taskIndicators',
    'hud', 'minimap', 'modeBanner', 'lighting', 'killAnimation', 'sensory',
    'markerExplanation', 'acquisition']);
  const MAGIC_EVENT_TYPES = Object.freeze(['shapes', 'gunnerAimAcquisition', 'gravityImpact', 'grenadeImpact',
    'bodyBenefit', 'staminaBenefitE', 'manaBenefitE', 'bodyBenefitExtra', 'statusTempo', 'barrierE', 'bustE', 'dodgeE', 'renkiE', 'ideaE', 'alchemyE', 'hackerRootE', 'hackerStatusRecoveryE', 'floraE', 'healE', 'sunbeamE', 'fighterEnergyE', 'gravityFieldE', 'rigidItemImpactE', 'bottleShardsE', 'archiveCabinetE', 'fireActivation', 'empEffect', 'specialAmmoEffect', 'commonActionBodyE', 'medicalObjectE',
    'medicalCabinetE', 'medicalFootbathUseE', 'medicalUploadConsoleE', 'corridorA01E', 'corridorObjectUseE', 'roomObjectUseE', 'reactorRoomObjectsE', 'powerRoomObjectsE',
    'taskCompletion', 'headMarker', 'mysteryBoxRevealE']);
  const own = (object, key) => Object.prototype.hasOwnProperty.call(object, key);

  function coverage(scene, passes) {
    if (!Array.isArray(scene?.ORDER) || !Array.isArray(scene?.REQUIRED))
      throw new TypeError('Main scene stage contract required');
    const supported = scene.ORDER.filter(name => own(passes, name));
    const unsupported = scene.ORDER.filter(name => !own(passes, name));
    const missingRequired = scene.REQUIRED.filter(name => !own(passes, name));
    return Object.freeze({ supported: Object.freeze(supported),
      unsupported: Object.freeze(unsupported),
      missingRequired: Object.freeze(missingRequired),
      fullFrameReady: unsupported.length === 0 });
  }

  function loadOptionalRoomPatchImage(source, { ImageCtor = root.Image,
    timeoutMs = 4000, schedule = root.setTimeout || setTimeout,
    cancel = root.clearTimeout || clearTimeout } = {}) {
    if (typeof ImageCtor !== 'function') return Promise.resolve(null);
    return new Promise(resolve => {
      const image = new ImageCtor();
      let settled = false;
      const finish = result => {
        if (settled) return;
        settled = true;
        cancel(timer);
        image.onload = null;
        image.onerror = null;
        resolve(result);
      };
      const timer = schedule(() => finish(null), timeoutMs);
      image.onload = () => finish(image.naturalWidth > 0 ? image : null);
      image.onerror = () => finish(null);
      image.fetchPriority = 'high';
      try { image.src = source; } catch (_) { finish(null); }
    });
  }

  async function create({ renderer, map, image, patches, textAtlas, atlasMetrics,
    expandedCanvas = null, expandedTarget = 'main-expanded-map',
    acquisitionCanvas = null, acquisitionTarget = 'main-acquisition-overlay',
    modules = defaults, onProgress = () => {}, onTiming = () => {} } = {}) {
    if (!renderer || renderer.state !== 'ready' || !renderer.device ||
        typeof renderer.format !== 'string' || !renderer.format ||
        typeof renderer.createGravityHazardPasses !== 'function')
      throw new TypeError('The active shared WebGPU renderer is required');
    if (typeof textAtlas?.layout !== 'function' ||
        typeof textAtlas?.ensure !== 'function' || !Array.isArray(textAtlas.textures))
      throw new TypeError('The uploaded shared WebGPU text atlas is required');
    if (![atlasMetrics?.ascent, atlasMetrics?.pixelSize].every(Number.isFinite) ||
        atlasMetrics.pixelSize <= 0)
      throw new TypeError('Source GPU text atlas metrics are required for the HUD');
    if (acquisitionCanvas &&
        (typeof renderer.registerTarget !== 'function' ||
          typeof acquisitionTarget !== 'string' || !acquisitionTarget ||
          acquisitionTarget === expandedTarget || acquisitionTarget === 'main'))
      throw new TypeError('Acquisition overlay needs a distinct shared renderer target name');
    const needsCorridorA01E = map?.objects?.some(object =>
      object?.id === 'v317-corridor-a01-1' &&
      object.type === 'airlockGasketReader') === true;
    const methods = { field: 'create', environmentE: 'create',
      ...(needsCorridorA01E ? { corridorA01E: 'create' } : {}),
      ...(modules === defaults || modules.corridorObjectUseE ? { corridorObjectUseE: 'create' } : {}),
      ...(modules === defaults || modules.roomObjectUseE ? { roomObjectUseE: 'create' } : {}),
      ...(modules === defaults || modules.reactorRoomObjectsE ? { reactorRoomObjectsE: 'create' } : {}),
      ...(modules === defaults || modules.powerRoomObjectsE ? { powerRoomObjectsE: 'create' } : {}),
      medicalObjectE: 'create',
      medicalCabinetE: 'create', medicalFootbathUseE: 'create', medicalUploadConsoleE: 'create',
      medicalFixtureE: 'create', shapes: 'create', stations: 'create',
      mapObjects: 'create', mysteryBoxes: 'create',
      ...(modules === defaults || modules.mysteryBoxRevealE ? { mysteryBoxRevealE: 'create' } : {}),
      alchemyObjects: 'create',
      groundItems: 'createTextureCache', facilityEffects: 'create',
      bodies: 'record', worldSound: 'record', throwPreview: 'create',
      preparationSummons: 'create', players: 'createTextureCache',
      playerNameplates: 'create', headMarkers: 'create',
      gunnerAim: 'create', killCamera: 'create', hitEffects: 'record',
      gravityImpacts: 'create', grenadeImpacts: 'record', bodyBenefits: 'create', staminaBenefitE: 'create', manaBenefitE: 'create', bodyBenefitExtra: 'create', statusTempo: 'create', barrierE: 'create', ...(modules === defaults || modules.barrierProR07Game ? { barrierProR07Game: 'create' } : {}), bustE: 'create', dodgeE: 'create', renkiE: 'create', ideaE: 'create', alchemyE: 'create', hackerRootE: 'create', hackerStatusRecoveryE: 'create', floraE: 'create', healE: 'create', healSparkleE: 'create', healSparkleGameAdapter: 'create', sunbeamE: 'create', fighterEnergyE: 'create', hoverSprintE: 'create', gravityFieldE: 'create', rigidItemImpactE: 'create', bottleShardsE: 'create', archiveCabinetE: 'create', fireActivation: 'create', empEffect: 'create', specialAmmoEffect: 'create',
      attackTargets: 'record', taskIndicators: 'create', hud: 'create',
      minimap: 'create', modeBanner: 'create', killBloom: 'create',
      killAnimation: 'create', sensory: 'enqueue', markerExplanation: 'create',
      acquisition: 'create', ...(expandedCanvas ? { expandedMap: 'create' } : {}) };
    const absent = Object.entries(methods).filter(([name, method]) =>
      typeof modules?.[name]?.[method] !== 'function').map(([name]) => name);
    if (!Array.isArray(modules?.scene?.ORDER) ||
        !Array.isArray(modules.scene.REQUIRED)) absent.unshift('scene');
    if (absent.length) throw new Error(`Missing main pass modules: ${absent.join(', ')}`);
    if (typeof onProgress !== 'function')
      throw new TypeError('Main pass registry progress callback must be a function');
    if (typeof onTiming !== 'function')
      throw new TypeError('Main pass registry timing callback must be a function');
    const owned = [], readiness = [], pendingReadiness = new Set(), passes = Object.create(null);
    let awaitingReadiness = false;
    const progress = stage => onProgress(stage);
    const timingClock = root.performance && typeof root.performance.now === 'function'
      ? () => root.performance.now() : null;
    const timing = (name, startedAt = null) => {
      if (!timingClock) return null;
      const atMs = timingClock();
      if (!Number.isFinite(atMs)) return null;
      const durationMs = startedAt === null ? null : Math.max(0, atMs - startedAt);
      if (durationMs !== null && !Number.isFinite(durationMs)) return null;
      const mark = Object.freeze({ name, atMs,
        ...(durationMs === null ? {} : { durationMs }) });
      try { onTiming(mark); } catch (_) { /* Diagnostics cannot affect pass creation. */ }
      return atMs;
    };
    const progressReadiness = () => progress(`ready:${[...pendingReadiness].join('+') || 'none'}`);
    const add = (name, value, method) => {
      if (!value || typeof value[method] !== 'function' ||
          typeof value.destroy !== 'function' ||
          (value.device && value.device !== renderer.device)) {
        try { value?.destroy?.(); } catch (_) { /* Keep validation error. */ }
        throw new TypeError(`Invalid shared-device WebGPU ${name} pass`);
      }
      owned.push(value);
      try {
        // Shader-backed passes may expose a readiness promise while their
        // pipelines compile. Attach a rejection observer immediately; the
        // aggregate below still propagates failures through create().
        const ready = value.ready;
        if (ready && typeof ready.then === 'function') {
          const promise = Promise.resolve(ready);
          promise.catch(() => {});
          pendingReadiness.add(name);
          promise.then(() => {
            pendingReadiness.delete(name);
            if (awaitingReadiness) progressReadiness();
          }, () => {
            pendingReadiness.delete(name);
            if (awaitingReadiness) progressReadiness();
          });
          readiness.push(promise);
        }
      } catch (error) {
        try { value.destroy(); } catch (_) { /* Preserve readiness error. */ }
        owned.pop();
        throw error;
      }
      passes[name] = value;
    };
    const borrow = (name, value, method = 'record') => {
      if (!value || typeof value[method] !== 'function' ||
          (value.device && value.device !== renderer.device))
        throw new TypeError(`Invalid shared-device WebGPU ${name} module`);
      passes[name] = value;
    };
    try {
      // Every constructor is given the same renderer/device; none opens a new
      // context or obtains a second adapter. The authored field is async.
      add('shapes', modules.shapes.create({ device: renderer.device,
        format: renderer.format }), 'enqueue');
      progress('field');
      // Start field, Sunbeam, stamina, mana, and Heal on the same renderer
      // before yielding. Observe field/Sunbeam outcomes immediately so either
      // rejection is handled while all five builds are still in flight.
      const startRequiredPass = (name, create) => {
        const startedAt = timing(`${name}.invoke`);
        let creation;
        try {
          creation = create();
        } catch (error) {
          timing(`${name}.rejected`, startedAt);
          return Promise.resolve({ status: 'rejected', reason: error });
        }
        timing(`${name}.returned`, startedAt);
        return Promise.resolve(creation).then(value => {
          timing(`${name}.resolved`, startedAt);
          return { status: 'fulfilled', value };
        }, reason => {
          timing(`${name}.rejected`, startedAt);
          return { status: 'rejected', reason };
        });
      };
      const fieldCreation = startRequiredPass('field', () =>
        modules.field.create({ owner: renderer, map, image, patches }));
      progress('sunbeam');
      const sunbeamCreation = startRequiredPass('sunbeam', () =>
        modules.sunbeamE.create({ renderer }));
      const barrierR07Creation = modules.barrierProR07Game
        ? startRequiredPass('barrierR07', () => modules.barrierProR07Game.create({
          device: renderer.device, format: renderer.format }))
        : Promise.resolve({ status: 'fulfilled', value: null });
      // These independent E pipelines use the same renderer and can compile
      // while the field and Sunbeam passes initialize. Keep them registry-owned
      // immediately so every later failure follows the normal rollback path.
      const earlyPassFailures = [];
      const startEarlyOwnedPass = (name, create, method = 'record', adapt = value => value) => {
        try { add(name, adapt(create()), method); }
        catch (error) { earlyPassFailures.push(error); }
      };
      startEarlyOwnedPass('staminaBenefitE', () =>
        modules.staminaBenefitE.create({ renderer, frameOwner: renderer }));
      startEarlyOwnedPass('manaBenefitE', () =>
        modules.manaBenefitE.create({ renderer, frameOwner: renderer }));
      startEarlyOwnedPass('healE', () => {
        return modules.healSparkleGameAdapter.create({ renderer,
          baseModule: modules.healE, sparkleModule: modules.healSparkleE });
      });
      const [fieldResult, sunbeamResult, barrierR07Result] = await Promise.all([
        fieldCreation, sunbeamCreation, barrierR07Creation]);
      if (fieldResult.status === 'rejected' || sunbeamResult.status === 'rejected' ||
          barrierR07Result.status === 'rejected') {
        // If the peer succeeded, it has not been published or adopted yet.
        // Retire it here and preserve the original creation error.
        const successful = [fieldResult, sunbeamResult, barrierR07Result]
          .filter(result => result.status === 'fulfilled').map(result => result.value);
        await Promise.allSettled(successful.map(value => Promise.resolve()
          .then(() => value?.destroy?.())));
        throw fieldResult.status === 'rejected' ? fieldResult.reason :
          sunbeamResult.status === 'rejected' ? sunbeamResult.reason : barrierR07Result.reason;
      }
      const fieldPass = fieldResult.value;
      const sunbeam = sunbeamResult.value;
      const barrierR07 = barrierR07Result.value;
      try {
        add('map', fieldPass, 'enqueue');
        add('sunbeamE', sunbeam, 'record');
        if (barrierR07) add('barrierProR07Game', Object.freeze({ device: renderer.device,
          record: barrierR07.record, destroy: barrierR07.destroy }), 'record');
      } catch (error) {
        // add() retires the pass whose registration failed. If map failed
        // first, Sunbeam has not been handed to the registry yet.
        if (!passes.map && !owned.includes(sunbeam)) {
          try { await sunbeam?.destroy?.(); } catch (_) { /* Preserve registration error. */ }
        }
        if (barrierR07 && !passes.barrierProR07Game) {
          try { await barrierR07.destroy(); } catch (_) { /* Preserve registration error. */ }
        }
        throw error;
      }
      if (earlyPassFailures.length) throw earlyPassFailures[0];
      const preSunbeamConstructorsStartedAt = timing('pre-sunbeam-constructors.begin');
      progress('passes');
      add('environmentE', modules.environmentE.create({ device: renderer.device,
        format: renderer.format }), 'record');
      if (needsCorridorA01E)
        add('corridorA01E', modules.corridorA01E.create({ device: renderer.device,
          format: renderer.format }), 'record');
      if (modules.corridorObjectUseE)
        add('corridorObjectUseE', modules.corridorObjectUseE.create({ renderer,
          frameOwner: renderer }), 'record');
      if (modules.roomObjectUseE)
        add('roomObjectUseE', modules.roomObjectUseE.create({ renderer,
          frameOwner: renderer }), 'record');
      if (modules.reactorRoomObjectsE)
        add('reactorRoomObjectsE', modules.reactorRoomObjectsE.create({ renderer,
          frameOwner: renderer }), 'record');
      if (modules.powerRoomObjectsE)
        add('powerRoomObjectsE', modules.powerRoomObjectsE.create({ renderer,
          frameOwner: renderer }), 'record');
      add('medicalFixtureE', modules.medicalFixtureE.create({ device: renderer.device,
        format: renderer.format }), 'record');
      add('medicalUploadConsoleE', modules.medicalUploadConsoleE.create({ device: renderer.device,
        format: renderer.format }), 'record');
      add('stations', modules.stations.create({ device: renderer.device, textAtlas }), 'record');
      add('mapObjects', modules.mapObjects.create({ textAtlas }), 'draw');
      add('mysteryBoxes', modules.mysteryBoxes.create({ device: renderer.device }), 'record');
      if (modules.mysteryBoxRevealE)
        add('mysteryBoxRevealE', modules.mysteryBoxRevealE.create({ frameOwner: renderer }), 'record');
      add('alchemyObjects', modules.alchemyObjects.create({ device: renderer.device, textAtlas }), 'record');
      add('gravityHazards', renderer.createGravityHazardPasses({ textAtlas }), 'record');
      add('groundItems', modules.groundItems.createTextureCache(renderer.device), 'record');
      add('facilityEffects', modules.facilityEffects.create({ device: renderer.device,
        format: renderer.format }), 'record');
      borrow('bodies', modules.bodies);
      borrow('worldSound', modules.worldSound);
      add('throwPreview', modules.throwPreview.create({ device: renderer.device,
        format: renderer.format, textAtlas }), 'record');
      add('preparationSummons', modules.preparationSummons.create({
        device: renderer.device }), 'record');
      add('players', modules.players.createTextureCache(renderer.device), 'record');
      borrow('playerNameplates', modules.playerNameplates.create({ textAtlas }));
      if (typeof passes.playerNameplates.prepareLabels !== 'function')
        throw new TypeError('Shared player nameplates need async label preparation');
      add('headMarkers', modules.headMarkers.create({ frameOwner: renderer }), 'record');
      add('gunnerAim', modules.gunnerAim.create({ device: renderer.device,
        format: renderer.format }), 'record');
      borrow('killCamera', modules.killCamera.create({ textAtlas,
        shapes: passes.shapes }));
      borrow('hitEffects', modules.hitEffects);
      add('gravityImpacts', modules.gravityImpacts.create({
        device: renderer.device }), 'record');
      borrow('grenadeImpacts', modules.grenadeImpacts);
      add('bodyBenefits', modules.bodyBenefits.create({ renderer }), 'record');
      add('bodyBenefitExtra', modules.bodyBenefitExtra.create({ frameOwner: renderer }), 'record');
      add('statusTempo', modules.statusTempo.create({ frameOwner: renderer }), 'record');
      for (const name of ['barrierE', 'bustE', 'dodgeE', 'renkiE', 'ideaE']) {
        const pass = modules[name].create();
        add(name, Object.freeze({ device: renderer.device,
          record: pass.record, ready: pass.ready, destroy: pass.destroy }), 'record');
      }
      for (const name of ['alchemyE', 'hackerRootE', 'hackerStatusRecoveryE', 'floraE']) {
        const pass = modules[name].create({ renderer, frameOwner: renderer });
        add(name, Object.freeze({ device: renderer.device,
          record: pass.record, ready: pass.ready, destroy: pass.destroy }), 'record');
      }
      timing('pre-sunbeam-constructors.end', preSunbeamConstructorsStartedAt);
      const postSunbeamConstructorsStartedAt = timing('post-sunbeam-constructors.begin');
      progress('passes-after-sunbeam');
      add('fighterEnergyE', modules.fighterEnergyE.create(), 'record');
      const hoverSprint = modules.hoverSprintE.create();
      add('hoverSprintE', Object.freeze({ device: renderer.device,
        record: hoverSprint.record, destroy: hoverSprint.destroy }), 'record');
      for (const name of ['gravityFieldE', 'rigidItemImpactE', 'bottleShardsE',
        'archiveCabinetE', 'cableSpoolE']) {
        const pass = modules[name].create({ renderer, frameOwner: renderer });
        add(name, Object.freeze({ device: renderer.device,
          record: pass.record, ready: pass.ready, destroy: pass.destroy }), 'record');
      }
      add('fireActivation', modules.fireActivation.create({ renderer }), 'record');
      add('empEffect', modules.empEffect.create({ frameOwner: renderer }), 'record');
      add('specialAmmoEffect', modules.specialAmmoEffect.create({ frameOwner: renderer }), 'record');
      add('commonActionBodyE', modules.commonActionBodyE.create(), 'record');
      add('medicalObjectE', modules.medicalObjectE.create({ device: renderer.device,
        format: renderer.format }), 'record');
      add('medicalCabinetE', modules.medicalCabinetE.create({ device: renderer.device,
        format: renderer.format }), 'record');
      add('medicalFootbathUseE', modules.medicalFootbathUseE.create({ device: renderer.device,
        format: renderer.format }), 'record');
      // MainScene records each source event in order. Shapes already owns the
      // `magicEffects` stage method; the other five event routes are real pass
      // dependencies, with taskCompletion reusing facilityEffects + shapes.
      passes.magicEffects = passes.shapes;
      borrow('attackTargets', modules.attackTargets);
      add('taskIndicators', modules.taskIndicators.create({ textAtlas }), 'draw');
      borrow('hud', modules.hud.create({ textAtlas, atlasMetrics }), 'draw');
      add('minimap', modules.minimap.create({ device: renderer.device,
        format: renderer.format }), 'draw');
      borrow('modeBanner', modules.modeBanner.create({ textAtlas }), 'draw');
      const bloom = modules.killBloom.create({ device: renderer.device });
      if (!bloom || typeof bloom.prepare !== 'function' ||
          typeof bloom.release !== 'function') {
        try { bloom?.release?.(); } catch (_) { /* Keep validation error. */ }
        throw new TypeError('Invalid shared-device kill bloom pass');
      }
      owned.push({ destroy: () => bloom.release() });
      borrow('killAnimation', modules.killAnimation.create({ textAtlas, bloom }));
      borrow('sensory', modules.sensory, 'enqueue');
      borrow('markerExplanation', modules.markerExplanation.create({ textAtlas }), 'draw');
      if (expandedCanvas) {
        if (typeof renderer.registerTarget !== 'function' ||
            typeof expandedTarget !== 'string' || !expandedTarget)
          throw new TypeError('Expanded map needs a shared renderer target name');
        const expanded = modules.expandedMap.create({ device: renderer.device,
          format: renderer.format, text: textAtlas });
        if (!expanded || typeof expanded.prepare !== 'function' ||
            typeof expanded.draw !== 'function' || typeof expanded.destroy !== 'function') {
          try { expanded?.destroy?.(); } catch (_) { /* Keep validation error. */ }
          throw new TypeError('Invalid shared-device expanded-map pass');
        }
        let targetHandle;
        try {
          targetHandle = renderer.registerTarget(expandedTarget, expandedCanvas, {
            width: Math.max(1, expandedCanvas.width || 1),
            height: Math.max(1, expandedCanvas.height || 1),
            logicalWidth: 1200, logicalHeight: 760 });
        } catch (error) { expanded.destroy(); throw error; }
        const prepared = new WeakSet();
        // The app must prove that its visible expanded-map surface is the one
        // registered on this shared device before admitting a candidate frame.
        const wrapper = Object.freeze({ device: renderer.device,
          canvas: expandedCanvas, target: expandedTarget,
          async prepare({ scene, viewport } = {}) {
            if (!scene?.map || viewport?.kind !== 'expanded' ||
                viewport.width !== 1200 || viewport.height !== 760 ||
                !Number.isInteger(viewport.pixelWidth) ||
                !Number.isInteger(viewport.pixelHeight))
              throw new TypeError('Expanded map needs its scene and committed viewport');
            await expanded.prepare(scene);
            targetHandle.resize(viewport.pixelWidth, viewport.pixelHeight,
              { width: viewport.width, height: viewport.height });
            const value = Object.freeze({ scene, viewport });
            prepared.add(value);
            return value;
          },
          record({ frame, preparedPlan } = {}) {
            if (!prepared.has(preparedPlan))
              throw new TypeError('Prepare expanded map before main-frame recording');
            prepared.delete(preparedPlan);
            return expanded.draw({ frame, target: expandedTarget,
              scene: preparedPlan.scene, viewport: preparedPlan.viewport });
          },
          destroy() {
            let error;
            try { expanded.destroy(); } catch (caught) { error = caught; }
            try { targetHandle.unregister(); } catch (caught) { error ||= caught; }
            if (error) throw error;
          }
        });
        add('expandedMap', wrapper, 'record');
      }
      // app.js drawLighting is currently a literal return (no Canvas output).
      // Keep this explicit, so a later nontrivial lighting implementation must
      // replace this stage rather than being silently dropped.
      borrow('lighting', Object.freeze({ device: renderer.device,
        record() { return Object.freeze({ drawn: false, reason: 'Canvas lighting is no-op' }); } }));
      let acquisitionFailure = '';
      let acquisitionHandle = null;
      if (acquisitionCanvas) {
        acquisitionHandle = renderer.registerTarget(acquisitionTarget, acquisitionCanvas, {
          width: Math.max(1, acquisitionCanvas.width || 1),
          height: Math.max(1, acquisitionCanvas.height || 1),
          logicalWidth: 1, logicalHeight: 1, alphaMode: 'premultiplied'
        });
      }
      const preparedAcquisition = new WeakSet();
      let acquisitionDestroyed = false, acquisition = null;
      // The overlay has no pixels in an ordinary field frame. Compile its
      // pipeline on the shared device without holding the first map/player
      // submission. An active acquisition is admitted only after it is ready.
      progress('acquisition-background');
      const acquisitionPending = Promise.resolve().then(() =>
        modules.acquisition.create(null, { frameOwner: renderer, timeoutMs: 30000,
          onFailure(reason) { acquisitionFailure = String(reason || ''); } }))
        .then(value => {
          if (!value || value.state !== 'ready' ||
              typeof value.enqueue !== 'function' ||
              typeof value.destroy !== 'function') {
            value?.destroy?.();
            acquisitionFailure ||= 'invalid shared-frame acquisition pass';
            return;
          }
          if (acquisitionDestroyed) value.destroy();
          else acquisition = value;
        }, error => { acquisitionFailure = error?.message || String(error); });
      add('acquisition', Object.freeze({ device: renderer.device,
        target: acquisitionHandle ? acquisitionTarget : null,
        whenReady: acquisitionPending,
        get state() { return acquisitionDestroyed ? 'destroyed' :
          acquisition?.state === 'ready' ? 'ready' :
            acquisitionFailure ? 'failed' : 'initializing'; },
        get failure() { return acquisitionFailure; },
        prepare({ viewport, drawFrame } = {}) {
          if (acquisitionDestroyed || renderer.state !== 'ready' || acquisition?.state !== 'ready')
            throw new Error(`Shared acquisition pass unavailable: ${acquisitionFailure || 'initializing'}`);
          if (!acquisitionHandle) throw new Error('Acquisition overlay canvas is required');
          if (viewport?.kind !== 'acquisition' ||
              ![viewport.width, viewport.height].every(value => Number.isFinite(value) && value > 0) ||
              ![viewport.pixelWidth, viewport.pixelHeight].every(value => Number.isInteger(value) && value > 0) ||
              !Array.isArray(drawFrame?.effects) ||
              drawFrame.width !== viewport.width || drawFrame.height !== viewport.height ||
              drawFrame.pixelWidth !== viewport.pixelWidth ||
              drawFrame.pixelHeight !== viewport.pixelHeight)
            throw new TypeError('Acquisition needs effects and exact overlay viewport dimensions');
          acquisitionHandle.resize(viewport.pixelWidth, viewport.pixelHeight,
            { width: viewport.pixelWidth, height: viewport.pixelHeight });
          const plan = Object.freeze({ viewport, drawFrame });
          preparedAcquisition.add(plan);
          return plan;
        },
        record({ frame, target, viewport, drawFrame, preparedPlan } = {}) {
          if (acquisitionDestroyed || acquisition?.state !== 'ready' || renderer.state !== 'ready')
            throw new Error('Shared acquisition pass unavailable');
          if (acquisitionHandle) {
            if (!preparedAcquisition.has(preparedPlan) || target !== acquisitionTarget ||
                viewport !== preparedPlan.viewport)
              throw new TypeError('Prepare the acquisition overlay before main-frame recording');
            preparedAcquisition.delete(preparedPlan);
            if (acquisition.enqueue(frame, target, preparedPlan.drawFrame,
              { clear: { r: 0, g: 0, b: 0, a: 0 } }) !== true)
              throw new Error('Shared acquisition overlay pass did not enqueue');
            return true;
          }
          if (drawFrame?.effects?.length)
            throw new Error('Active acquisition effects require an overlay canvas');
          if (viewport?.kind !== 'main' || !drawFrame ||
              !Array.isArray(drawFrame.effects) ||
              drawFrame.width !== viewport?.width ||
              drawFrame.height !== viewport?.height ||
              drawFrame.pixelWidth !== viewport?.pixelWidth ||
              drawFrame.pixelHeight !== viewport?.pixelHeight)
            throw new TypeError('Acquisition needs effects and exact main viewport dimensions');
          if (acquisition.enqueue(frame, target, drawFrame) !== true)
            throw new Error('Shared acquisition pass did not enqueue');
          return true;
        },
        destroy() {
          if (acquisitionDestroyed) return acquisitionPending;
          acquisitionDestroyed = true;
          let error;
          try { acquisition?.destroy(); } catch (caught) { error = caught; }
          try { acquisitionHandle?.unregister(); } catch (caught) { error ||= caught; }
          if (error) throw error;
          return acquisitionPending;
        }
      }), 'record');
      // create() is already asynchronous (the field pass is asynchronous),
      // so complete optional GPU pipeline compilation before publishing the
      // registry to a caller that can record the first frame.
      timing('post-sunbeam-constructors.end', postSunbeamConstructorsStartedAt);
      awaitingReadiness = true;
      progressReadiness();
      const readinessStartedAt = timing('readiness.await.begin');
      try {
        await Promise.all(readiness);
      } catch (error) {
        timing('readiness.await.rejected', readinessStartedAt);
        throw error;
      }
      timing('readiness.await.end', readinessStartedAt);
      awaitingReadiness = false;
      progress('complete');
      timing('registry.ready');
      let destroyed = false;
      const status = coverage(modules.scene, passes);
      return Object.freeze({
        device: renderer.device, passes: Object.freeze(passes), status,
        magicEventTypes: MAGIC_EVENT_TYPES,
        assertFullFrameReady() {
          if (destroyed) throw new Error('Main pass registry destroyed');
          if (status.unsupported.length)
            throw new Error(`Main WebGPU frame incomplete: ${status.unsupported.join(', ')}`);
          return true;
        },
        destroy() {
          if (destroyed) return;
          destroyed = true;
          let firstError;
          const pending = [];
          for (let i = owned.length - 1; i >= 0; i--) {
            try {
              const result = owned[i].destroy();
              if (result && typeof result.then === 'function') pending.push(result);
            } catch (error) { firstError ||= error; }
          }
          owned.length = 0;
          if (firstError) throw firstError;
          if (pending.length) {
            const settled = Promise.allSettled(pending).then(results => {
              const rejected = results.find(result => result.status === 'rejected');
              if (rejected) throw rejected.reason;
            });
            settled.catch(error => root.console?.error?.(
              'Main WebGPU async pass destruction failed', error));
            return settled;
          }
        }
      });
    } catch (error) {
      const pending = [];
      for (let i = owned.length - 1; i >= 0; i--) {
        try {
          const result = owned[i].destroy();
          if (result && typeof result.then === 'function') pending.push(result);
        } catch (_) { /* Keep construction error. */ }
      }
      if (pending.length) await Promise.allSettled(pending);
      throw error;
    }
  }

  const api = Object.freeze({ create, BUILT, loadOptionalRoomPatchImage });
  root.DvaWebGPUMainPassRegistry = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof globalThis !== 'undefined' ? globalThis : window);
