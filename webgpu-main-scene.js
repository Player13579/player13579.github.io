/* Ordered main-field WebGPU scene recorder. The caller creates every pass with
 * the main runtime's renderer/device, prepares text/images before draw(), and
 * passes scene.record as the runtime's synchronous record callback. The authored
 * field pass owns the first clear: use mainRuntime.draw({ recordClears: true }).
 * This module never creates a canvas, adapter, device, or fallback renderer. */
(function (root) {
  'use strict';

  // Matches the active draw() slots in app.js. A null stage is an intentional
  // gap and is returned in the report; an omitted required stage is an error.
  const ORDER = Object.freeze([
    'map', 'environmentE', 'stations', 'mapObjects', 'mysteryBoxes', 'alchemyObjects',
    'gravityHazards', 'groundItems', 'facilityEffects',
    'bodies', 'worldSound', 'throwPreview', 'preparationSummons', 'players',
    'gunnerAim', 'killCamera', 'hitEffects', 'magicEffects', 'attackTargets',
    'taskIndicators', 'hud', 'minimap', 'modeBanner', 'expandedMap',
    'lighting', 'killAnimation', 'sensory', 'markerExplanation', 'acquisition'
  ]);
  const REQUIRED = Object.freeze([
    'map', 'environmentE', 'stations', 'mapObjects', 'mysteryBoxes', 'alchemyObjects',
    'gravityHazards', 'groundItems', 'facilityEffects', 'bodies', 'worldSound',
    'throwPreview', 'players', 'gunnerAim', 'killCamera', 'hitEffects',
    'magicEffects', 'attackTargets', 'taskIndicators', 'hud', 'minimap',
    'modeBanner', 'killAnimation', 'sensory', 'markerExplanation'
  ]);
  const REQUIRED_SET = new Set(REQUIRED);
  const EMP_TYPES = new Set(['emp', 'emp-charge', 'emp-resonance',
    'emp-cancel', 'emp-storage-lock']);
  const EMP_SOUND_VARIANTS = Object.freeze({
    emp: Object.freeze(['positive', 'negative']),
    'emp-charge': Object.freeze(['positive', 'negative']),
    'emp-resonance': Object.freeze(['positive', 'negative']),
    'emp-cancel': Object.freeze(['opposite']),
    'emp-storage-lock': Object.freeze(['storage'])
  });
  const SPECIAL_AMMO_TYPES = new Set(['action-special-ammo-load',
    'action-special-ammo-shot', 'action-special-ammo-impact']);
  const METHOD = Object.freeze({
    map: 'enqueue', environmentE: 'record', stations: 'record', mapObjects: 'draw', mysteryBoxes: 'record',
    alchemyObjects: 'record', gravityHazards: 'record',
    groundItems: 'record', facilityEffects: 'record', bodies: 'record',
    worldSound: 'record', throwPreview: 'record', preparationSummons: 'record',
    players: 'record', gunnerAim: 'record', killCamera: 'record',
    hitEffects: 'record', magicEffects: 'enqueue', attackTargets: 'record',
    taskIndicators: 'draw', hud: 'draw', minimap: 'draw', modeBanner: 'draw',
    expandedMap: 'record', lighting: 'record', killAnimation: 'record',
    sensory: 'enqueue', markerExplanation: 'draw', acquisition: 'record'
  });
  const own = (object, key) => Object.prototype.hasOwnProperty.call(object, key);
  function leaseFor(result) {
    if (!result) return null;
    if (typeof result.release === 'function') return () => result.release();
    if (typeof result.destroy === 'function') return () => result.destroy();
    if (Array.isArray(result.batches)) return () => result.batches.forEach(batch => batch.destroy());
    if (typeof result === 'object' && result !== null && typeof result.encode === 'function') return () => result.destroy?.();
    return null;
  }
  function create({ renderer, passes = {} } = {}) {
    if (!renderer?.device || typeof renderer.beginFrame !== 'function')
      throw new TypeError('Main scene requires the active shared WebGPU renderer');
    const device = renderer.device;
    let destroyed = false;
    function prepare({ stages, device: preparedDevice = device } = {}) {
      if (destroyed) throw new Error('Main WebGPU scene destroyed');
      if (preparedDevice !== device) throw new Error('Main scene prepared on a different WebGPU device');
      if (!stages || typeof stages !== 'object' || Array.isArray(stages))
        throw new TypeError('Main scene needs explicit stage inputs');
      const unknown = Object.keys(stages).filter(name => !ORDER.includes(name));
      if (unknown.length) throw new Error(`Unknown main scene stages: ${unknown.join(', ')}`);
      const missing = REQUIRED.filter(name => !own(stages, name) || stages[name] === null || stages[name] === undefined);
      if (missing.length) throw new Error(`Missing mandatory WebGPU main scene stages: ${missing.join(', ')}`);
      const unavailable = ORDER.filter(name => stages[name] != null &&
        (typeof passes[name === 'magicEffects' ? 'shapes' : name]?.[METHOD[name]] !== 'function' ||
          (['stations', 'alchemyObjects', 'facilityEffects', 'bodies', 'worldSound',
            'hitEffects', 'attackTargets'].includes(name) && typeof passes.shapes?.enqueue !== 'function')));
      if (unavailable.length) throw new Error(`Unavailable WebGPU main scene passes: ${unavailable.join(', ')}`);
      const summon = stages.preparationSummons;
      const playerStage = stages.players;
      if (summon != null) {
        if (!(summon.scene?.entries instanceof Map) || !Array.isArray(summon.scene.players))
          throw new TypeError('Preparation summons need roster players and shared entries Map');
        if (playerStage.entries !== summon.scene.entries ||
            typeof playerStage.createCommands !== 'function' || playerStage.commands !== undefined)
          throw new Error('Preparation players need a post-summon command builder and the same entries Map');
      } else if (!Array.isArray(playerStage.commands) || playerStage.createCommands !== undefined) {
        throw new TypeError('Players without preparation summons need prepared commands');
      }
      if (!Number.isInteger(playerStage.markerGeneration) ||
          typeof playerStage.headMarkersForCommand !== 'function' ||
          typeof passes.headMarkers?.record !== 'function')
        throw new TypeError('Players need a shared head-marker pass, generation and per-command tail planner');
      if (typeof passes.playerNameplates?.record !== 'function' ||
          typeof playerStage.selfPlayerId !== 'string' || !playerStage.selfPlayerId ||
          typeof playerStage.preparation !== 'boolean')
        throw new TypeError('Players need prepared shared-frame nameplates and preparation ownership');
      const magic = stages.magicEffects;
      if (!Array.isArray(magic.sourceEffectIds) || !Array.isArray(magic.events) ||
          !Array.isArray(magic.omitted))
        throw new TypeError('Main scene magicEffects needs source IDs, ordered events, and explicit omissions');
      const hoverSprint = playerStage.hoverSprint;
      if (!hoverSprint?.scene || !Array.isArray(hoverSprint.planned) ||
          typeof passes.hoverSprintE?.record !== 'function' ||
          hoverSprint.scene.events.some(event =>
            !magic.omitted.some(item => String(item.effectId) === String(event.id) &&
              item.reason === 'hover-sprint-player-stage-owns-live-state')) ||
          hoverSprint.planned.some(effect =>
            !hoverSprint.scene.players.some(player => String(player.id) === effect.playerId) ||
            (effect.eventId && !hoverSprint.scene.events.some(event => event.id === effect.eventId))))
        throw new TypeError('Hover Sprint player stage needs live state and exact claimed activation sources');
      const markerCoverage = magic.markerCoverage;
      if (!markerCoverage || !Array.isArray(markerCoverage.visibleRetained))
        throw new TypeError('Main scene magicEffects needs explicit visible retained-marker coverage');
      const empCoverage = magic.empCoverage;
      if (!empCoverage || !Array.isArray(empCoverage.visibleEmp))
        throw new TypeError('Main scene magicEffects needs explicit visible EMP coverage');
      const specialAmmoCoverage = magic.specialAmmoCoverage;
      if (!specialAmmoCoverage || !Array.isArray(specialAmmoCoverage.visibleSpecialAmmo))
        throw new TypeError('Main scene magicEffects needs explicit visible special-ammo coverage');
      const ids = magic.sourceEffectIds.map(id => {
        if ((typeof id !== 'string' && typeof id !== 'number') || String(id) === '')
          throw new TypeError('Magic source effect ID required');
        return String(id);
      });
      if (new Set(ids).size !== ids.length) throw new Error('Duplicate magic source effect ID');
      const positions = new Map(ids.map((id, index) => [id, index]));
      const retained = new Map();
      for (const item of markerCoverage.visibleRetained) {
        const id = String(item?.effectId ?? '');
        if (!positions.has(id) || retained.has(id) ||
            !['enhance-activation','fighter-energy-charge'].includes(item?.effectType) ||
            typeof item.instanceKey !== 'string' || !item.instanceKey ||
            typeof item.playerId !== 'string' || !item.playerId)
          throw new TypeError(`Invalid visible retained-marker source: ${id}`);
        retained.set(id,item);
      }
      if (retained.size && !Number.isInteger(magic.markerGeneration))
        throw new TypeError('Visible retained markers need the current marker generation');
      const visibleEmp = new Map();
      for (const item of empCoverage.visibleEmp) {
        const id = String(item?.effectId ?? '');
        if (!positions.has(id) || visibleEmp.has(id) || !EMP_TYPES.has(item?.effectType))
          throw new TypeError(`Invalid visible EMP source: ${id}`);
        visibleEmp.set(id, item.effectType);
      }
      const visibleSpecialAmmo = new Map();
      for (const item of specialAmmoCoverage.visibleSpecialAmmo) {
        const id = String(item?.effectId ?? '');
        if (!positions.has(id) || visibleSpecialAmmo.has(id) ||
            !SPECIAL_AMMO_TYPES.has(item?.effectType) ||
            !['weak', 'penetrate', 'shock'].includes(item?.variant))
          throw new TypeError(`Invalid visible special-ammo source: ${id}`);
        visibleSpecialAmmo.set(id, item);
      }
      const owned = new Set();
      let previousPosition = -1;
      for (const omission of magic.omitted) {
        const id = String(omission?.effectId ?? '');
        if (!positions.has(id) || owned.has(id)) throw new Error(`Duplicate or unknown magic omission: ${id}`);
        if (typeof omission.reason !== 'string' || !omission.reason.trim() ||
            omission.reason.toLowerCase().includes('unsupported'))
          throw new Error(`Magic omission ${id} needs an intentional nonvisual reason`);
        owned.add(id);
      }
      for (const [index, event] of magic.events.entries()) {
        const id = String(event?.effectId ?? '');
        const position = positions.get(id);
        if (position === undefined || owned.has(id)) throw new Error(`Duplicate or unknown magic event: ${id}`);
        if (position <= previousPosition) throw new Error(`Magic event order differs from source effects: ${id}`);
        previousPosition = position;
        owned.add(id);
        if (event?.type === 'shapes') {
          if (!Array.isArray(event.commands) || !event.commands.length)
            throw new TypeError(`Magic event ${index} needs shape commands`);
        } else if (event?.type === 'gunnerAimAcquisition') {
          const effect = event.input?.effect, planned = event.input?.planned;
          if (typeof passes.gunnerAim?.recordAcquisition !== 'function' ||
              effect?.type !== 'gunner-passive-aim' || String(effect.id ?? '') !== id ||
              planned?.effectId !== id || !Number.isFinite(planned.progress) ||
              planned.progress < 0 || planned.progress >= 1 ||
              !Array.isArray(planned.line) || planned.line.length !== 4 ||
              !planned.line.every(Number.isFinite) ||
              !Array.isArray(planned.target) || planned.target.length !== 4 ||
              !planned.target.every(Number.isFinite))
            throw new TypeError(`Magic Gunner aim ${id} needs one exact source-owned plan`);
        } else if (event?.type === 'headMarker') {
          const source=retained.get(id), input=event.input, planned=input?.planned;
          const prefix=source?.effectType==='enhance-activation'?'enhance:':'fighter-ec:';
          const expectedKey=`${prefix}${source?.instanceKey}:${source?.playerId}`;
          if (!source || !input || input.sourceEffectId!==id ||
              input.effectType!==source.effectType ||
              input.instanceKey!==source.instanceKey || input.playerId!==source.playerId ||
              !planned || planned.generation!==magic.markerGeneration ||
              !Array.isArray(planned.unsupported) || planned.unsupported.length ||
              !Array.isArray(planned.commands) || !planned.commands.length ||
              !Array.isArray(planned.hitTargets) || planned.hitTargets.length!==1 ||
              planned.hitTargets[0]?.key!==expectedKey ||
              !planned.commands.some(command=>command.kind===source.effectType) ||
              planned.commands.some(command=>!([source.effectType,
                source.effectType==='enhance-activation'?'enhance-propagation':''].includes(command.kind))))
            throw new TypeError(`Magic retained marker ${id} needs one exact source-owned plan`);
        } else if (event?.type === 'empEffect') {
          const input = event.input, effect = input?.effect, planned = input?.planned;
          const effectType = visibleEmp.get(id);
          if (!effectType || typeof passes.empEffect?.record !== 'function' || !input ||
              input.sourceEffectId !== id || String(effect?.id ?? '') !== id ||
              effect.type !== effectType || planned?.effectId !== id ||
              planned.type !== effectType || !Number.isFinite(planned.progress) ||
              planned.progress <= 0 || planned.progress >= 1 ||
              !(planned.values instanceof Float32Array) || planned.values.length !== 16 ||
              !planned.values.every(Number.isFinite))
            throw new TypeError(`Magic EMP ${id} needs one exact source-owned plan`);
        } else if (event?.type === 'specialAmmoEffect') {
          const input = event.input, effect = input?.effect, planned = input?.planned;
          const source = visibleSpecialAmmo.get(id);
          if (!source || typeof passes.specialAmmoEffect?.record !== 'function' ||
              input.sourceEffectId !== id || String(effect?.id ?? '') !== id ||
              effect.type !== source.effectType ||
              String(effect.variant || '').split(':')[0] !== source.variant ||
              planned?.effectId !== id || planned.type !== source.effectType ||
              planned.variant !== source.variant ||
              !Number.isFinite(planned.progress) || planned.progress <= 0 ||
              planned.progress >= 1 || !(planned.values instanceof Float32Array) ||
              planned.values.length !== 16 || !planned.values.every(Number.isFinite))
            throw new TypeError(`Magic special ammo ${id} needs one exact source-owned plan`);
        } else if (event?.type === 'commonActionBodyE') {
          const input = event.input, effect = input?.effect;
          const scene = input?.scene;
          const sourceFields = input?.sourceFields;
          const fieldsMatch = sourceFields && Object.keys(sourceFields).every(key =>
            Object.is(sourceFields[key], effect?.[key]));
          const duration = effect?.duration ?? effect?.durationMs;
          const lifetime = duration == null || Number(duration) === 0 ? 1200 : Number(duration);
          const elapsed = Number(scene?.nowMs) - Number(effect?.startedAt);
          const actor = scene?.players?.find(player =>
            String(player?.id ?? '') === String(effect?.playerId ?? ''));
          if (typeof passes.commonActionBodyE?.record !== 'function' ||
              effect?.type !== 'action-mana' || String(effect.id ?? '') !== id ||
              !fieldsMatch ||
              !['欲望', '気概', '理知', 'renki'].includes(effect.variant) ||
              !String(input.viewerId || '') || input.viewerId !== magic.viewerId ||
              input.phase !== 'playing' || magic.phase !== 'playing' ||
              !Array.isArray(scene?.effects) || scene.effects.length !== 1 ||
              scene.effects[0] !== effect || !Array.isArray(scene.players) ||
              !actor || !actor.alive || actor.ejected || actor.inVent || actor.invisible ||
              ![effect.x, effect.y, effect.startedAt, scene.nowMs, lifetime,
                input.camera?.x, input.camera?.y, input.zoom].every(Number.isFinite) ||
              lifetime <= 0 || elapsed < 0 || elapsed >= lifetime ||
              (effect.variant === 'renki' && !['normal', 'tenfold'].includes(effect.completionKind)))
            throw new TypeError(`Magic action mana ${id} needs one live viewer-owned actor event`);
        } else if (event?.type === 'mysteryBoxRevealE') {
          const input = event.input, effect = input?.effect, planned = input?.planned;
          const elapsed = magic.now - effect?.startedAt;
          if (typeof passes.mysteryBoxRevealE?.record !== 'function' ||
              input?.sourceEffectId !== id || effect?.type !== 'mystery-box' ||
              String(effect.id ?? '') !== id ||
              !String(magic.viewerId || '') || magic.phase !== 'playing' ||
              String(effect.viewerId ?? '') !== String(magic.viewerId) ||
              String(effect.playerId ?? '') !== String(magic.viewerId) ||
              effect.durationMs !== 2600 || !Number.isFinite(effect.startedAt) ||
              !Number.isFinite(magic.now) || elapsed < 0 || elapsed >= 2600 ||
              ![effect.x, effect.y, effect.radius].every(Number.isFinite) ||
              effect.radius <= 0 ||
              !['product', 'ability'].includes(effect.acquisitionKind) ||
              !String(effect.acquisitionId || '') ||
              String(effect.variant || '') !== String(effect.acquisitionId) ||
              planned?.effectId !== id || planned.startedAt !== effect.startedAt ||
              planned.durationMs !== 2600 || planned.elapsed !== elapsed ||
              planned.progress !== elapsed / 2600 ||
              planned.kind !== effect.acquisitionKind ||
              planned.variant !== String(effect.variant) ||
              planned.reducedMotion !== Boolean(magic.reducedMotion) ||
              ![planned.centerX, planned.centerY, planned.radiusX, planned.radiusY,
                planned.pixelWidth, planned.pixelHeight].every(Number.isFinite))
            throw new TypeError(`Magic mystery box ${id} needs one viewer-owned server event and opening plan`);
        } else if (event?.type === 'gravityImpact') {
          if (typeof passes.gravityImpacts?.record !== 'function')
            throw new Error('Magic gravity impact needs WebGPU gravityImpacts.record');
          if (!Array.isArray(event.scene?.effects) || event.scene.effects.length !== 1 ||
              !String(event.scene.effects[0]?.type || '').startsWith('gravity-storm-') ||
              String(event.scene.effects[0]?.id ?? '') !== id)
            throw new TypeError(`Magic event ${index} needs one gravity-storm effect`);
        } else if (event?.type === 'grenadeImpact') {
          if (typeof passes.grenadeImpacts?.record !== 'function')
            throw new Error('Magic grenade impact needs WebGPU grenadeImpacts.record');
          const impact = event.scene?.effects?.[0];
          if (!Array.isArray(event.scene?.effects) || event.scene.effects.length !== 1 ||
              !['grenade-frag-impact', 'grenade-stun-impact'].includes(impact?.type) ||
              String(impact.id ?? '') !== id ||
              (impact.sourceId != null &&
                ((typeof impact.sourceId !== 'string' && typeof impact.sourceId !== 'number') ||
                  String(impact.sourceId) === '')))
            throw new TypeError(`Magic event ${index} needs one identified grenade impact`);
        } else if (event?.type === 'bodyBenefit') {
          if (typeof passes.bodyBenefits?.record !== 'function')
            throw new Error('Magic body benefit needs WebGPU bodyBenefits.record');
          if (!event.input || typeof event.input !== 'object' ||
              !['gain-heal', 'gain-overheal'].includes(event.input.effect?.type) ||
              String(event.input.effect?.id ?? '') !== id)
            throw new TypeError(`Magic event ${index} needs one supported body benefit effect`);
        } else if (event?.type === 'staminaBenefitE') {
          const input = event.input, effect = input?.effect;
          if (typeof passes.staminaBenefitE?.record !== 'function' ||
              effect?.type !== 'gain-stamina' || String(effect.id ?? '') !== id ||
              !Number.isFinite(input?.actorElapsedMs) || input.actorElapsedMs < 0 ||
              ![effect.actorWorld?.x, effect.actorWorld?.y, input?.camera?.x,
                input?.camera?.y, input?.zoom].every(Number.isFinite) ||
              input.zoom <= 0 || !String(effect.causeId ?? ''))
            throw new TypeError(`Magic stamina benefit ${id} needs one live body event`);
        } else if (event?.type === 'manaBenefitE') {
          const input = event.input, effect = input?.effect;
          if (typeof passes.manaBenefitE?.record !== 'function' ||
              effect?.type !== 'gain-mana' || effect.variant === 'desire-recovery' ||
              String(effect.id ?? '') !== id ||
              !Number.isFinite(input?.actorElapsedMs) || input.actorElapsedMs < 0 ||
              ![effect.actorWorld?.x, effect.actorWorld?.y, input?.camera?.x,
                input?.camera?.y, input?.zoom].every(Number.isFinite) ||
              input.zoom <= 0 || !String(effect.causeId ?? ''))
            throw new TypeError(`Magic mana benefit ${id} needs one live body event`);
        } else if (event?.type === 'bodyBenefitExtra' || event?.type === 'statusTempo') {
          const extra = event.type === 'bodyBenefitExtra';
          const pass = extra ? passes.bodyBenefitExtra : passes.statusTempo;
          const effect = event.input?.effect, planned = event.input?.planned;
          if (typeof pass?.record !== 'function' ||
              String(effect?.id ?? '') !== id || planned?.effectId !== id ||
              !(extra
                ? ['gain-luckBoost', 'gain-statusRecovery', 'gain-cooldownReduction',
                    'gain-acceleration'].includes(effect.type) &&
                  planned.kind === effect.effectKind
                : ['gravity-accelerate', 'gravity-decelerate', 'natural-recovery'].includes(effect.type) &&
                  planned.type === effect.type) ||
              !Number.isFinite(planned.progress) || planned.progress < 0 ||
              planned.progress >= 1)
            throw new TypeError(`Magic event ${index} needs one owned ${event.type} plan`);
        } else if (['barrierE', 'bustE', 'dodgeE', 'renkiE', 'ideaE'].includes(event?.type)) {
          const source = event.input?.scene?.effects?.[0];
          const pass = passes[event.type];
          if (typeof pass?.record !== 'function' ||
              !Array.isArray(event.input?.scene?.effects) ||
              event.input.scene.effects.length !== 1 ||
              String(source?.id ?? '') !== id ||
              !Array.isArray(event.input.scene.players) ||
              !Number.isFinite(event.input.scene.nowMs) ||
              !Number.isFinite(event.input.camera?.x) ||
              !Number.isFinite(event.input.camera?.y) ||
              !(event.input.zoom > 0))
            throw new TypeError(`Magic event ${index} needs one owned ${event.type} source`);
        } else if (event?.type === 'sunbeamE') {
          const effect = event.input?.effect;
          if (typeof passes.sunbeamE?.record !== 'function' ||
              effect?.type !== 'flora-sunbeam' || String(effect?.id ?? '') !== id ||
              String(effect.playerId ?? '') !== event.input.playerId ||
              typeof effect.variant !== 'string' || !effect.variant ||
              typeof effect.sunbeamCausalId !== 'string' || !effect.sunbeamCausalId ||
              ![effect.targetX, effect.targetY, effect.x, effect.y,
                event.input.elapsed, event.input.now].every(Number.isFinite) ||
              !(effect.duration > 0) ||
              (event.input.activeAction && event.input.submittedHands != null) ||
              (!event.input.activeAction &&
                (!Array.isArray(event.input.submittedHands) ||
                  !event.input.submittedHands.length)))
            throw new TypeError(`Magic event ${index} needs one event-bound Sunbeam path`);
        } else if (event?.type === 'fighterEnergyE') {
          const source = event.input?.scene?.events?.[0];
          const actor = event.input?.scene?.players?.find(player =>
            String(player?.id ?? '') === String(source?.playerId ?? ''));
          const elapsed = Number(event.input?.scene?.nowMs) - Number(source?.startedAt);
          if (typeof passes.fighterEnergyE?.record !== 'function' ||
              event.input?.scene?.events?.length !== 1 || source?.type !== 'fighter-slash' ||
              String(source.id ?? '') !== id || !String(source.playerId ?? '') || !actor ||
              ![source.x, source.y, source.targetX, source.targetY, source.startedAt,
                event.input.scene.nowMs, event.input.camera?.x, event.input.camera?.y,
                event.input.zoom].every(Number.isFinite) ||
              !(event.input.zoom > 0) || elapsed < 0 || elapsed >= 440)
            throw new TypeError(`Magic Fighter slash ${id} needs one live source-owned path`);
        } else if (event?.type === 'healE') {
          const effect = event.input?.effect, planned = event.input?.planned;
          if (typeof passes.healE?.record !== 'function' || effect?.type !== 'flora' ||
              String(effect.id ?? '') !== id || String(planned?.id ?? '') !== id ||
              String(planned?.ownerId ?? '') !== String(effect.playerId ?? '') ||
              !Number.isFinite(planned?.phase?.wall) || planned.phase.wall < 0 ||
              planned.phase.wall >= 12 || !Number.isFinite(planned.phase.actor) ||
              !Number.isFinite(planned?.zoom) || planned.zoom <= 0)
            throw new TypeError(`Magic event ${index} needs one owned Heal plan`);
        } else if (['alchemyE', 'hackerRootE', 'hackerStatusRecoveryE', 'floraE'].includes(event?.type)) {
          const effect = event.input?.effect, planned = event.input?.planned;
          if (typeof passes[event.type]?.record !== 'function' ||
              String(effect?.id ?? '') !== id ||
              String(planned?.effectId ?? planned?.id ?? '') !== id ||
              !Number.isFinite(planned?.progress) || planned.progress < 0 ||
              planned.progress >= 1 ||
              !(event.type === 'alchemyE'
                ? effect.type === 'alchemy-human-transmutation' &&
                  event.input.scene?.effects?.length === 1 &&
                  event.input.scene.effects[0] === effect
                : event.type === 'hackerRootE'
                  ? effect.type === 'hacker-root' &&
                    ['all-operators', 'release'].includes(effect.variant)
                  : event.type === 'hackerStatusRecoveryE'
                    ? effect.type === 'hacker-status-recover' &&
                      effect.variant === 'cleared'
                    : ['flora', 'flora-invisible'].includes(effect.type) &&
                      planned.type === effect.type &&
                      (effect.type !== 'flora-invisible' ||
                        String(effect.viewerId || '') === String(effect.playerId || '') &&
                        String(effect.viewerId || '') === String(magic.viewerId || ''))))
            throw new TypeError(`Magic event ${index} needs one owned ${event.type} plan`);
        } else if (['gravityFieldE', 'rigidItemImpactE', 'bottleShardsE',
          'archiveCabinetE', 'cableSpoolE'].includes(event?.type)) {
          const effect = event.input?.effect, planned = event.input?.planned;
          const expectedType = { gravityFieldE: 'gravity-time-keeper',
            rigidItemImpactE: 'rigid-item-impact', bottleShardsE: 'bottle-shards',
            archiveCabinetE: 'object-archiveCabinet',
            cableSpoolE: 'object-cableSpool' }[event.type];
          if (typeof passes[event.type]?.record !== 'function' ||
              effect?.type !== expectedType || String(effect?.id ?? '') !== id ||
              String(planned?.effectId ?? planned?.id ?? '') !== id ||
              (event.type === 'gravityFieldE'
                ? planned.kind !== 'time-keeper' ||
                  event.input.scene?.effects?.length !== 1 ||
                  event.input.scene.effects[0] !== effect
                : !Number.isFinite(planned?.progress ?? planned?.elapsed)) ||
              (event.type === 'archiveCabinetE' || event.type === 'cableSpoolE') &&
                planned.objectId !== effect.objectId)
            throw new TypeError(`Magic event ${index} needs one owned ${event.type} plan`);
        } else if (event?.type === 'fireActivation') {
          if (typeof passes.fireActivation?.record !== 'function')
            throw new Error('Magic fire activation needs WebGPU fireActivation.record');
          if (!event.input || typeof event.input !== 'object' ||
              event.input.effect?.type !== 'fire' ||
              String(event.input.effect?.id ?? '') !== id ||
              typeof event.input.effect?.fireCausalId !== 'string' ||
              !event.input.effect.fireCausalId)
            throw new TypeError(`Magic event ${index} needs one standalone fire effect`);
        } else if (event?.type === 'corridorA01E') {
          const effect = event.input?.effect, source = event.input?.event;
          const planned = event.input?.planned;
          if (typeof passes.corridorA01E?.record !== 'function' ||
              effect?.type !== 'object-airlockGasketReader' ||
              effect.objectId !== 'v317-corridor-a01-1' ||
              String(effect.id ?? '') !== id || source?.id !== id ||
              source.kind !== 'reader-use' ||
              source.objectId !== effect.objectId ||
              source.atMs !== effect.startedAt ||
              planned?.eventId !== id || planned.kind !== 'reader-use' ||
              !Number.isFinite(planned.elapsed) || planned.elapsed < 0 ||
              planned.elapsed >= 760)
            throw new TypeError(`Magic event ${index} needs one owned a01 reader E`);
        } else if (event?.type === 'corridorObjectUseE' ||
            event?.type === 'roomObjectUseE') {
          const effect = event.input?.effect, planned = event.input?.planned;
          if (typeof passes[event.type]?.record !== 'function' ||
              !String(effect?.type || '').startsWith('object-') ||
              String(effect?.id ?? '') !== id || planned?.eventId !== id ||
              planned?.objectId !== effect?.objectId ||
              planned?.effectKind !== effect?.effectKind ||
              !Number.isFinite(planned?.progress) || planned.progress < 0 ||
              planned.progress >= 1 || !Number.isFinite(planned?.source?.x) ||
              !Number.isFinite(planned?.source?.y))
            throw new TypeError(`Magic event ${index} needs one owned ${event.type}`);
        } else if (event?.type === 'reactorRoomObjectsE' ||
            event?.type === 'powerRoomObjectsE') {
          const effect = event.input?.effect, planned = event.input?.planned;
          if (typeof passes[event.type]?.record !== 'function' ||
              effect?.type !== 'object-powerCabinet' ||
              String(effect?.id ?? '') !== id || planned?.eventId !== id ||
              planned?.objectId !== effect.objectId ||
              planned?.effectKind !== effect.effectKind || planned?.state !== 2 ||
              !Number.isFinite(planned?.progress) || planned.progress < 0 ||
              planned.progress >= 1)
            throw new TypeError(`Magic event ${index} needs one owned power cabinet plan`);
        } else if (event?.type === 'medicalObjectE') {
          const effect = event.input?.effect, planned = event.input?.planned;
          if (typeof passes.medicalObjectE?.record !== 'function' ||
              effect?.type !== 'object-relaxationBed' ||
              effect.objectId !== 'v302-medical-diagnosticBed-1' ||
              String(effect.id ?? '') !== id || planned?.effectId !== id ||
              !Number.isFinite(planned.elapsed) || planned.elapsed < 0 ||
              planned.elapsed >= 900)
            throw new TypeError(`Magic event ${index} needs one owned medical object E`);
        } else if (event?.type === 'medicalCabinetE' ||
            event?.type === 'medicalFootbathUseE') {
          const cabinet = event.type === 'medicalCabinetE';
          const pass = cabinet ? passes.medicalCabinetE : passes.medicalFootbathUseE;
          const effect = event.input?.effect, planned = event.input?.planned;
          if (typeof pass?.record !== 'function' ||
              effect?.type !== (cabinet ? 'object-herbalCabinet' : 'object-footBath') ||
              effect.objectId !== (cabinet ? 'v302-medical-medicalCabinet-2' :
                'v302-medical-sterilizer-3') ||
              String(effect.id ?? '') !== id || planned?.effectId !== id ||
              !Number.isFinite(planned.elapsed) || planned.elapsed < 0 ||
              planned.elapsed >= (cabinet ? 1180 : 1050))
            throw new TypeError(`Magic event ${index} needs one owned medical use E`);
        } else if (event?.type === 'medicalUploadConsoleE') {
          const effect = event.input?.effect, planned = event.input?.planned;
          if (typeof passes.medicalUploadConsoleE?.record !== 'function' ||
              effect?.type !== 'action-task' || effect.mode !== 'upload' ||
              effect.targetId !== 'upload-d' || String(effect.id ?? '') !== id ||
              planned?.completionId !== id || planned.phase !== 'complete')
            throw new TypeError(`Magic event ${index} needs one owned medical upload E`);
        } else if (event?.type === 'taskCompletion') {
          if (typeof passes.facilityEffects?.record !== 'function')
            throw new Error('Magic task completion needs WebGPU facilityEffects.record');
          if (!event.input || event.input.effect?.type !== 'action-task' ||
              !['download', 'upload'].includes(event.input.effect.mode) ||
              String(event.input.effect.id ?? '') !== id ||
              !Array.isArray(event.input.scene?.stations) ||
              event.input.scene.stations.length !== 1 ||
              !Array.isArray(event.input.scene?.magicEffects) ||
              event.input.scene.magicEffects.length !== 1 ||
              event.input.scene.magicEffects[0] !== event.input.effect ||
              event.input.scene.stations[0].completionEffect !== event.input.effect)
            throw new TypeError(`Magic event ${index} needs one owned task completion`);
        } else throw new TypeError(`Unsupported magic event ${index}: ${event?.type}`);
      }
      const dropped = ids.filter(id => !owned.has(id));
      if (dropped.length) throw new Error(`Unowned magic effects: ${dropped.join(', ')}`);
      const routedMarkers=new Set(magic.events.filter(event=>event.type==='headMarker')
        .map(event=>String(event.effectId)));
      const unported=[...retained.keys()].filter(id=>!routedMarkers.has(id));
      if (unported.length) throw new Error(`Visible retained markers lack source-order WebGPU routes: ${unported.join(', ')}`);
      const routedEmp = new Set(magic.events.filter(event => event.type === 'empEffect')
        .map(event => String(event.effectId)));
      const unportedEmp = [...visibleEmp.keys()].filter(id => !routedEmp.has(id));
      if (unportedEmp.length) throw new Error(`Visible EMP effects lack source-order WebGPU routes: ${unportedEmp.join(', ')}`);
      const routedSpecialAmmo = new Set(magic.events.filter(event =>
        event.type === 'specialAmmoEffect').map(event => String(event.effectId)));
      const unportedSpecialAmmo = [...visibleSpecialAmmo.keys()].filter(id =>
        !routedSpecialAmmo.has(id));
      if (unportedSpecialAmmo.length)
        throw new Error(`Visible special ammo lacks source-order WebGPU routes: ${unportedSpecialAmmo.join(', ')}`);
      const gaps = ORDER.filter(name => !REQUIRED_SET.has(name) && (!own(stages, name) || stages[name] == null));
      const leases = [];
      let released = false, recorded = false;
      return Object.freeze({ stages: Object.freeze({ ...stages }), gaps: Object.freeze(gaps), device,
        addLease(result) {
          if (released) throw new Error('Main scene frame resources already released');
          const lease = leaseFor(result);
          if (lease) leases.push(lease);
        },
        markRecorded() {
          if (released || recorded) throw new Error('Main scene frame already recorded or released');
          recorded = true;
        },
        release() {
          if (released) return;
          released = true;
          let firstError;
          for (let i = leases.length - 1; i >= 0; i--) {
            try { leases[i](); } catch (error) { firstError ||= error; }
          }
          leases.length = 0;
          if (firstError) throw firstError;
        }
      });
    }

    function record({ frame, target, viewport, renderer: frameRenderer, prepared } = {}) {
      if (destroyed) throw new Error('Main WebGPU scene destroyed');
      if (frameRenderer !== renderer || prepared?.device !== device)
        throw new Error('Main scene frame must use its prepared renderer/device');
      if (!frame || typeof frame.stage !== 'function' || typeof frame.add !== 'function' ||
          typeof frame.sprite !== 'function' || typeof target !== 'string' || !target)
        throw new TypeError('Main scene needs a shared frame and target');
      if (![viewport?.width, viewport?.height, viewport?.pixelWidth, viewport?.pixelHeight]
          .every(value => Number.isInteger(value) && value > 0))
        throw new TypeError('Main scene needs logical viewport and physical backing dimensions');
      if (!prepared?.stages || typeof prepared.markRecorded !== 'function')
        throw new TypeError('Use mainScene.prepare for frame inputs');
      prepared.markRecorded();
      const stages = prepared.stages, results = {}, recorded = [];
      const markerHitTargets = [];
      const preparationHitTargets = [];
      const phenomenonSoundVisualReceipts = [];
      const empSoundVisualReceipts = [];
      const staminaBenefitSoundReceipts = [];
      const manaBenefitSoundReceipts = [];
      const environmentSoundReceipts = [];
      const mysteryOpeningSoundReceipts = [];
      const gunnerAimSoundReceipts = [];
      const healSoundVisualReceipts = [];
      const barrierSoundVisualReceipts = [];
      const fireActivationReceipts = [];
      const healEvents = (stages.magicEffects?.events || []).filter(event => event.type === 'healE');
      const healRecorded = new Set();
      passes.healE?.reconcile?.(healEvents.map(event => String(event.effectId)));
      const sunbeamHands = new Map();
      const barrierSpriteQuads = new Map();
      let sunbeamFrameToken = null;
      const run = (name, callback) => {
        const input = stages[name];
        if (input == null) return;
        if (typeof input !== 'object' || Array.isArray(input))
          throw new TypeError(`Main scene stage ${name} needs an input object`);
        try {
          const result = callback(input);
          if (result && typeof result.then === 'function')
            throw new TypeError(`Main scene stage ${name} must record synchronously`);
          prepared.addLease(result);
          results[name] = result;
          recorded.push(name);
        } catch (error) {
          error.message = `Main scene ${name}: ${error.message}`;
          throw error;
        }
      };
      const need = (name, method) => {
        const pass = passes[name];
        if (!pass || typeof pass[method] !== 'function')
          throw new Error(`Missing WebGPU pass ${name}.${method}`);
        if (pass.device && pass.device !== device)
          throw new Error(`WebGPU pass ${name} belongs to another device`);
        return pass;
      };
      const common = input => ({ ...input, frame, target, viewport });
      // No frame.clear here: map.enqueue is the first, clearing pass.
      run('map', input => need('map', 'enqueue').enqueue(frame, {
        target, width: viewport.width, height: viewport.height,
        pixelWidth: viewport.pixelWidth, pixelHeight: viewport.pixelHeight,
        cameraX: input.camera.x, cameraY: input.camera.y, zoom: input.zoom
      }));
      // A required empty plan is an explicit no-op for maps without this room.
      run('environmentE', input => {
        const result = need('environmentE', 'record').record({
          frame, target, viewport, planned: input.planned
        });
        if (input.fixtures?.length) {
          if (!Array.isArray(input.fixtures))
            throw new TypeError('Medical fixture E plans must be an array');
          for (const planned of input.fixtures) {
            const outcome = need('medicalFixtureE', 'record').record({
              frame, target, viewport, planned });
            if (!outcome?.drawn || outcome.fixtureId !== planned.fixtureId)
              throw new Error(`Medical fixture ${planned.fixtureId} was not drawn`);
          }
        }
        if (input.uploadConsole) {
          const outcome = need('medicalUploadConsoleE', 'record').record({
            frame, target, viewport, planned: input.uploadConsole });
          if (!outcome?.drawn || outcome.phase !== input.uploadConsole.phase)
            throw new Error('Medical upload console idle E was not drawn');
        }
        const source = input.soundSource;
        if (input.planned && result?.drawn === true && source != null) {
          if (source.mapId !== 'station' || source.roomId !== input.roomId ||
              source.mapId !== input.mapId || typeof source.roomId !== 'string' ||
              !source.roomId || typeof source.sourceId !== 'string' ||
              !/^footBath:.+$/.test(source.sourceId) ||
              source.kind !== 'bathAmbient' ||
              !Number.isFinite(source.x) || !Number.isFinite(source.y))
            throw new TypeError('Medical environment sound source identity or coordinates are invalid');
          environmentSoundReceipts.push(Object.freeze({ roomId: source.roomId,
            mapId: source.mapId, sourceId: source.sourceId, kind: source.kind,
            x: source.x, y: source.y }));
        }
        return result;
      });
      run('stations', input => need('stations', 'record').record({ ...common(input), shapes: need('shapes', 'enqueue') }));
      run('mapObjects', input => need('mapObjects', 'draw').draw(common(input)));
      run('mysteryBoxes', input => need('mysteryBoxes', 'record').record(common(input)));
      run('alchemyObjects', input => need('alchemyObjects', 'record').record({ ...common(input), shapes: need('shapes', 'enqueue') }));
      run('gravityHazards', input => {
        const outcome = need('gravityHazards', 'record').record({ ...common(input),
          prepared: input.preparedPlan });
        if (input.fieldScene?.gravityZones?.length) {
          const field = need('gravityFieldE', 'record').record({ frame, target,
            viewport, scene: input.fieldScene, camera: input.camera, zoom: input.zoom });
          if (!Array.isArray(field?.fields) ||
              field.fields.some(item => item.kind !== 'storm'))
            throw new Error('Gravity field state pass drew an event-owned source');
        }
        return outcome;
      });
      run('groundItems', input => {
        const pass = need('groundItems', 'record');
        if (!Array.isArray(input.commands)) throw new TypeError('Prepared ground-item commands required');
        frame.stage('world:ground-items');
        const batch = { sprite: item => frame.sprite(target, item), rect: item => frame.rect(target, item) };
        for (const command of input.commands) {
          if (pass.record(batch, command, input.textAtlas) === false)
            throw new Error('Ground-item text atlas is not ready for a prepared command');
        }
        return { drawn: input.commands.length };
      });
      run('facilityEffects', input => need('facilityEffects', 'record').record({ ...common(input), shapes: need('shapes', 'enqueue') }));
      run('bodies', input => need('bodies', 'record').record({ ...common(input), shapes: need('shapes', 'enqueue') }));
      run('worldSound', input => need('worldSound', 'record').record({ ...common(input), shapes: need('shapes', 'enqueue') }));
      run('throwPreview', input => input.scene
        ? need('throwPreview', 'record').record(common(input)) : null);
      run('preparationSummons', input => need('preparationSummons', 'record').record(common(input)));
      run('players', input => {
        const cache = need('players', 'record');
        const markers = need('headMarkers', 'record');
        const summonInput = stages.preparationSummons;
        const entries = summonInput?.scene.entries;
        const arrivalFor = player => player && !player.isBot && !player.ejected
          ? entries.get(String(player.id || ''))?.arrival || null : null;
        const commands = summonInput ? input.createCommands({ entries, arrivalFor,
          summonResult: results.preparationSummons, viewport }) : input.commands;
        if (!Array.isArray(commands)) throw new TypeError('Synchronous player commands required');
        const slashOwners = new Set();
        for (const command of commands) if (command?.movementMode === 'fighter-slash') {
          const id = String(command.sourceEffectId ?? '');
          const event = stages.magicEffects.events.find(item =>
            item.type === 'fighterEnergyE' && String(item.effectId) === id);
          const expired = stages.magicEffects.omitted.some(item =>
            String(item.effectId) === id && item.reason === 'fighter-slash-visual-outside-lifetime' &&
            String(item.playerId) === String(command.playerId));
          const source = event?.input?.scene?.events?.[0];
          if (!id || slashOwners.has(id) ||
              !stages.magicEffects.sourceEffectIds.some(sourceId => String(sourceId) === id) ||
              !(event && String(source?.playerId) === String(command.playerId) || expired))
            throw new Error(`Fighter slash pose lacks its same-frame source: ${id}`);
          slashOwners.add(id);
        }
        frame.stage('world:players:sprite');
        const markerViewport = Object.freeze({ ...viewport, generation: input.markerGeneration });
        commands.forEach((command, index) => {
          const sprite = command?.sprite;
          const transform = sprite?.transform;
          if (Array.isArray(transform) && transform.length === 6 &&
              transform.every(Number.isFinite) &&
              [sprite.x, sprite.y, sprite.w, sprite.h].every(Number.isFinite) &&
              sprite.w > 0 && sprite.h > 0) {
            const [a, b, c, d, tx, ty] = transform;
            const corners = [[sprite.x, sprite.y], [sprite.x + sprite.w, sprite.y],
              [sprite.x, sprite.y + sprite.h], [sprite.x + sprite.w, sprite.y + sprite.h]]
              .map(([x, y]) => ({ x: a * x + c * y + tx, y: b * x + d * y + ty }));
            const top = Math.min(...corners.map(point => point.y));
            const bottom = Math.max(...corners.map(point => point.y));
            const left = Math.min(...corners.map(point => point.x));
            const right = Math.max(...corners.map(point => point.x));
            const playerId = String(command.playerId || '');
            if (barrierSpriteQuads.has(playerId))
              throw new Error(`Barrier r0.7 owner ${playerId} has duplicate submitted sprites`);
            barrierSpriteQuads.set(playerId, Object.freeze({
              center: Object.freeze({ x: (left + right) / 2, y: (top + bottom) / 2 }),
              receiverHeightPx: bottom - top }));
          }
          const ownerHeals = healEvents.filter(event =>
            event.input.planned.ownerId === String(command.playerId));
          const recordHealSide = side => {
            for (const event of ownerHeals) {
              const outcome = need('healE', 'record').record({ frame, target,
                viewport, planned: event.input.planned, side });
              if (outcome?.drawn !== true || outcome.eventId !== String(event.effectId) ||
                  outcome.side !== side)
                throw new Error(`Heal ${event.effectId} ${side} was not drawn`);
            }
          };
          recordHealSide('back');
          cache.record(frame, target, command);
          recordHealSide('front');
          for (const event of ownerHeals) {
            if (healRecorded.has(String(event.effectId)))
              throw new Error(`Heal ${event.effectId} owner was submitted twice`);
            healRecorded.add(String(event.effectId));
            healSoundVisualReceipts.push(Object.freeze({ effectId: String(event.effectId),
              playerId: String(command.playerId), wallSeconds: event.input.planned.phase.wall,
              actorSeconds: event.input.planned.phase.actor }));
          }
          if (command.movementMode === 'flora-sunbeam') {
            const hands = root.DvaWebGPUPlayerSprite?.sunbeamHandsForCommand?.(
              command, input.camera, input.zoom);
            const id = String(command.sourceEffectId ?? '');
            if (!id || !hands?.length || sunbeamHands.has(id))
              throw new Error(`Sunbeam player ${String(command.playerId)} lacks distinct submitted hands`);
            sunbeamHands.set(id, Object.freeze({ effectId: id,
              playerId: String(command.playerId), poseKey: command.poseKey,
              assetPath: command.assetPath, assetSha256: command.assetSha256,
              hands }));
          }
          const tail = input.headMarkersForCommand({ command, index, viewport: markerViewport });
          if (!tail || typeof tail.then === 'function' ||
              String(tail.playerId || '') !== String(command.playerId || '') ||
              !Array.isArray(tail.unsupported) || tail.unsupported.length ||
              !tail.planned || tail.planned.generation !== input.markerGeneration ||
              !Array.isArray(tail.planned.unsupported) || tail.planned.unsupported.length ||
              !Array.isArray(tail.planned.commands) || !Array.isArray(tail.planned.hitTargets))
            throw new Error(`Player ${String(command.playerId)} head-marker tail incomplete or unsupported`);
          const hits = markers.record({ frame, target, viewport: markerViewport, planned: tail.planned });
          if (!Array.isArray(hits) || hits.length !== tail.planned.hitTargets.length ||
              hits.some((hit, hitIndex) => hit !== tail.planned.hitTargets[hitIndex]))
            throw new Error(`Player ${String(command.playerId)} head-marker targets differ from recorded plan`);
          markerHitTargets.push(...hits);
        });
        if (input.bustScene) {
          const outcome = need('bustE', 'record').record({ frame, target, viewport,
            scene: input.bustScene, camera: input.camera, zoom: input.zoom });
          if (!Array.isArray(outcome?.effects) ||
              outcome.effects.some(effect => effect.kind !== 'sustain'))
            throw new Error('Player bust state pass drew an event-owned source');
        }
        if (input.rootPlans) {
          if (!Array.isArray(input.rootPlans))
            throw new TypeError('Player ROOT state plans must be an array');
          for (const planned of input.rootPlans) {
            if (planned.mode !== 1 ||
                !String(planned.effectId || '').startsWith('hacker-root-state:'))
              throw new TypeError('Player ROOT state pass needs sustained state ownership');
            const outcome = need('hackerRootE', 'record').record({ frame, target,
              viewport, planned });
            if (outcome?.drawn !== true || outcome.effectId !== planned.effectId)
              throw new Error('Player ROOT state pass did not draw its plan');
          }
        }
        const hover = input.hoverSprint;
        const hoverOutcome = need('hoverSprintE', 'record').record({ frame, target,
          viewport, scene: hover.scene, camera: hover.camera, zoom: hover.zoom });
        if (hoverOutcome?.drawn !== hover.planned.length ||
            hoverOutcome.effects?.some((effect, index) =>
              effect.playerId !== hover.planned[index]?.playerId ||
              effect.phase !== hover.planned[index]?.phase ||
              effect.eventId !== hover.planned[index]?.eventId))
          throw new Error('Hover Sprint submitted effects differ from same-frame live plan');
        const nameplates = need('playerNameplates', 'record').record({
          frame, target, commands, selfPlayerId: input.selfPlayerId,
          preparation: input.preparation });
        if (!nameplates || !Array.isArray(nameplates.hits) ||
            (!input.preparation && nameplates.hits.length) ||
            nameplates.hits.some(hit =>
              !['skin', 'name'].includes(hit.field) ||
              String(hit.playerId) !== input.selfPlayerId))
          throw new Error('Player nameplate preparation hits differ from the self frame');
        preparationHitTargets.push(...nameplates.hits);
        return { drawn: commands.length, nameplates,
          markerHitTargets: Object.freeze(markerHitTargets.slice()) };
      });
      run('gunnerAim', input => need('gunnerAim', 'record').record(common(input)));
      run('killCamera', input => need('killCamera', 'record').record(common(input)));
      run('hitEffects', input => need('hitEffects', 'record').record({ ...common(input), shapes: need('shapes', 'enqueue') }));
      run('magicEffects', input => {
        const shapes = need('shapes', 'enqueue');
        const sunbeamEvents = [];
        // drawMagicEffects iterates state.magicEffects in order; a gravity-storm
        // impact can occur between other TE draws. Record each event at its own
        // position instead of moving all impacts into an early world pass.
        input.events.forEach((event, index) => {
          if (event.type === 'shapes') {
            prepared.addLease(shapes.enqueue(frame, {
              target, width: viewport.width, height: viewport.height,
              pixelWidth: viewport.pixelWidth, pixelHeight: viewport.pixelHeight,
              label: `world:magic-effects:${index}`, commands: event.commands
            }));
          } else if (event.type === 'gunnerAimAcquisition') {
            const outcome = need('gunnerAim', 'recordAcquisition').recordAcquisition({
              frame, target, viewport, ...event.input });
            prepared.addLease(outcome);
            if (outcome?.drawn !== true || outcome.effectId !== event.effectId)
              throw new Error(`Magic Gunner aim ${event.effectId} was not drawn`);
            const visibleAtMs = event.input.visibleAtMs;
            const startedAt = event.input.effect.startedAt;
            if (!Number.isFinite(visibleAtMs) ||
                visibleAtMs < startedAt || visibleAtMs >= startedAt + 900 ||
                Math.abs(event.input.planned.progress -
                  (visibleAtMs - startedAt) / 900) > 1e-6)
              throw new Error(`Magic Gunner aim ${event.effectId} visual time differs from its plan`);
            gunnerAimSoundReceipts.push(Object.freeze({
              effectId: event.effectId, playerId: event.input.effect.playerId,
              targetId: event.input.effect.targetId,
              variant: event.input.effect.variant,
              startedAt: event.input.effect.startedAt,
              visibleAtMs,
              progress: event.input.planned.progress }));
          } else if (event.type === 'headMarker') {
            const planned=event.input.planned;
            const markerViewport=Object.freeze({ ...viewport,
              generation: input.markerGeneration });
            const hits=need('headMarkers','record').record({frame,target,
              viewport:markerViewport,planned});
            if (!Array.isArray(hits) || hits.length!==planned.hitTargets.length ||
                hits.some((hit,hitIndex)=>hit!==planned.hitTargets[hitIndex]))
              throw new Error(`Magic retained marker ${event.effectId} targets differ from recorded plan`);
            markerHitTargets.push(...hits);
          } else if (event.type === 'empEffect') {
            const outcome = need('empEffect', 'record').record({ frame, target,
              viewport, planned: event.input.planned });
            if (outcome?.effectId !== event.effectId ||
                outcome.type !== event.input.effect.type || outcome.drawn !== true)
              throw new Error(`Magic EMP ${event.effectId} was not fully claimed and drawn`);
            const effect = event.input.effect;
            if (typeof effect?.id === 'string' && effect.id &&
                EMP_SOUND_VARIANTS[effect.type]?.includes(effect.variant) &&
                typeof effect.empCausalId === 'string' && effect.empCausalId &&
                effect.playerId != null && String(effect.playerId) &&
                [effect.x, effect.y, effect.startedAt,
                  event.input.visibleAtMs].every(Number.isFinite)) {
              empSoundVisualReceipts.push(Object.freeze({
                effectId: effect.id, type: effect.type, variant: effect.variant,
                empCausalId: effect.empCausalId, playerId: String(effect.playerId),
                x: effect.x, y: effect.y, startedAt: effect.startedAt,
                visibleAtMs: event.input.visibleAtMs
              }));
            }
          } else if (event.type === 'specialAmmoEffect') {
            const outcome = need('specialAmmoEffect', 'record').record({ frame, target,
              viewport, planned: event.input.planned });
            if (outcome?.effectId !== event.effectId ||
                outcome.type !== event.input.effect.type ||
                outcome.variant !== event.input.planned.variant || outcome.drawn !== true)
              throw new Error(`Magic special ammo ${event.effectId} was not fully claimed and drawn`);
          } else if (event.type === 'commonActionBodyE') {
            const outcome = need('commonActionBodyE', 'record').record({
              frame, target, viewport, shapes: need('shapes', 'enqueue'), ...event.input });
            prepared.addLease(outcome?.batch);
            if (!Array.isArray(outcome?.owned) || outcome.owned.length !== 1 ||
                String(outcome.owned[0].id) !== String(event.effectId) ||
                outcome.unsupported?.length || outcome.commands?.length < 1)
              throw new Error(`Magic action mana ${event.effectId} was not drawn exactly once`);
          } else if (event.type === 'mysteryBoxRevealE') {
            const outcome = need('mysteryBoxRevealE', 'record').record({ frame, target,
              viewport, planned: event.input.planned });
            if (outcome?.effectId !== event.effectId || outcome.drawn !== true ||
                outcome.recorded !== true)
              throw new Error(`Magic mystery box ${event.effectId} was not fully claimed and drawn`);
            mysteryOpeningSoundReceipts.push(Object.freeze({
              effectId: String(event.effectId),
              playerId: String(event.input.effect.playerId),
              viewerId: String(event.input.effect.viewerId),
              startedAt: event.input.effect.startedAt,
              progress: event.input.planned.progress
            }));
          } else if (event.type === 'corridorA01E') {
            const outcome = need('corridorA01E', 'record').record({ frame, target,
              viewport, planned: event.input.planned });
            if (outcome?.eventId !== event.effectId ||
                outcome.kind !== 'reader-use' || outcome.drawn !== true)
              throw new Error(`a01 reader E ${event.effectId} was not drawn`);
          } else if (event.type === 'corridorObjectUseE' ||
              event.type === 'roomObjectUseE') {
            const outcome = need(event.type, 'record').record({ frame, target,
              viewport, planned: event.input.planned });
            if (outcome?.eventId !== event.effectId ||
                outcome?.objectId !== event.input.effect.objectId ||
                outcome.drawn !== true)
              throw new Error(`${event.type} ${event.effectId} was not drawn`);
          } else if (event.type === 'reactorRoomObjectsE' ||
              event.type === 'powerRoomObjectsE') {
            const outcome = need(event.type, 'record').record({ frame, target,
              viewport, planned: event.input.planned });
            if (event.type === 'reactorRoomObjectsE' ? outcome !== true :
                outcome?.drawn !== true || outcome?.eventId !== event.effectId ||
                outcome?.objectId !== event.input.effect.objectId)
              throw new Error(`${event.type} ${event.effectId} was not drawn`);
          } else if (event.type === 'medicalObjectE') {
            const outcome = need('medicalObjectE', 'record').record({ frame, target,
              viewport, planned: event.input.planned });
            if (outcome?.effectId !== event.effectId || outcome.drawn !== true)
              throw new Error(`Medical object E ${event.effectId} was not drawn`);
          } else if (event.type === 'medicalCabinetE' ||
              event.type === 'medicalFootbathUseE') {
            const passName = event.type === 'medicalCabinetE'
              ? 'medicalCabinetE' : 'medicalFootbathUseE';
            const outcome = need(passName, 'record').record({ frame, target,
              viewport, planned: event.input.planned });
            if (outcome?.effectId !== event.effectId || outcome.drawn !== true)
              throw new Error(`Medical use E ${event.effectId} was not drawn`);
          } else if (event.type === 'medicalUploadConsoleE') {
            const outcome = need('medicalUploadConsoleE', 'record').record({ frame,
              target, viewport, planned: event.input.planned });
            if (outcome?.completionId !== event.effectId ||
                outcome.phase !== 'complete' || outcome.drawn !== true)
              throw new Error(`Medical upload E ${event.effectId} was not drawn`);
          } else if (event.type === 'gravityImpact') {
            const outcome = need('gravityImpacts', 'record').record({
              frame, target, viewport, scene: event.scene,
              camera: event.camera || input.camera, zoom: event.zoom || input.zoom
            });
            if (!Array.isArray(outcome?.commands) || !outcome.commands.length)
              throw new Error(`Magic gravity impact ${event.effectId} recorded no draw commands`);
            prepared.addLease(outcome);
          } else if (event.type === 'grenadeImpact') {
            const impact = event.scene.effects[0];
            const outcome = need('grenadeImpacts', 'record').record({
              shapes, frame, target, viewport, scene: event.scene,
              camera: event.camera || input.camera, zoom: event.zoom || input.zoom
            });
            // The grenade pass returns its shape batch inside the outcome.
            // Lease it before checking claims, including on a validation error.
            prepared.addLease(outcome?.batch);
            if (!Array.isArray(outcome?.commands) || !outcome.commands.length ||
                !Array.isArray(outcome.claims) || outcome.claims.length !== 1 ||
                outcome.claims[0].effect !== impact ||
                outcome.claims[0].type !== impact.type ||
                outcome.claims[0].sourceId !== (impact.sourceId ?? null) ||
                !Array.isArray(outcome.unhandled) || outcome.unhandled.length)
              throw new Error(`Magic grenade impact ${event.effectId} was not fully claimed and drawn`);
          } else if (event.type === 'bodyBenefit') {
            const outcome = need('bodyBenefits', 'record').record({
              ...event.input, frame, target, viewport
            });
            if (outcome !== true)
              throw new Error(`Magic body benefit ${event.effectId} was not drawn`);
            const effect = event.input?.effect;
            if (effect?.type === 'gain-overheal') {
              const effectId = effect.id, playerId = effect.playerId;
              const roomId = stages.magicEffects?.roomId ??
                stages.magicEffects?.data?.roomId ?? '';
              const now = event.input?.now;
              const duration = Number(event.input?.soundDurationMs);
              if ((typeof effectId !== 'string' && typeof effectId !== 'number') ||
                  String(effectId) === '' || playerId == null || String(playerId) === '' ||
                  !roomId || !Number.isFinite(now) || !Number.isFinite(effect.startedAt) ||
                  !(duration > 0))
                throw new TypeError(`Magic body benefit ${event.effectId} has invalid sound receipt identity or progress`);
              phenomenonSoundVisualReceipts.push(Object.freeze({
                roomId: String(roomId), effectId, playerId,
                kind: 'overheal',
                progress: (now - effect.startedAt) / duration
              }));
            }
          } else if (event.type === 'staminaBenefitE') {
            const outcome = need('staminaBenefitE', 'record').record({
              ...event.input, frame, target, viewport
            });
            if (outcome?.drawn !== 1)
              throw new Error(`Magic stamina benefit ${event.effectId} was not drawn`);
            staminaBenefitSoundReceipts.push(Object.freeze({
              effectId: event.effectId,
              causeId: event.input.effect.causeId,
              playerId: event.input.effect.playerId,
              actorElapsedMs: event.input.actorElapsedMs,
              x: event.input.effect.actorWorld.x,
              y: event.input.effect.actorWorld.y
            }));
          } else if (event.type === 'manaBenefitE') {
            const outcome = need('manaBenefitE', 'record').record({
              ...event.input, frame, target, viewport
            });
            if (outcome?.drawn !== 1)
              throw new Error(`Magic mana benefit ${event.effectId} was not drawn`);
            manaBenefitSoundReceipts.push(Object.freeze({
              effectId: event.effectId,
              causeId: event.input.effect.causeId,
              playerId: event.input.effect.playerId,
              actorElapsedMs: event.input.actorElapsedMs,
              x: event.input.effect.actorWorld.x,
              y: event.input.effect.actorWorld.y
            }));
          } else if (event.type === 'bodyBenefitExtra' || event.type === 'statusTempo') {
            const pass = event.type === 'bodyBenefitExtra' ? 'bodyBenefitExtra' : 'statusTempo';
            const outcome = need(pass, 'record').record({ frame, target, viewport,
              planned: event.input.planned });
            if (outcome?.effectId !== event.effectId || outcome.drawn !== true)
              throw new Error(`Magic ${pass} ${event.effectId} was not drawn`);
            if (event.input.effect.type === 'gain-acceleration') {
              const effect = event.input.effect;
              const roomId = stages.magicEffects?.roomId ??
                stages.magicEffects?.data?.roomId ?? '';
              if (!roomId || !effect.playerId || !Number.isFinite(event.input.planned.progress))
                throw new TypeError(`Magic acceleration benefit ${event.effectId} has invalid sound receipt`);
              phenomenonSoundVisualReceipts.push(Object.freeze({
                roomId: String(roomId), effectId: effect.id,
                kind: 'accelerationBenefit', playerId: effect.playerId,
                progress: event.input.planned.progress
              }));
            }
          } else if (event.type === 'barrierE') {
            const outcome = need('barrierE', 'record').record({ frame, target, viewport,
              ...event.input });
            const planned = outcome?.events?.[0];
            const quad = barrierSpriteQuads.get(String(planned?.ownerId || ''));
            if (outcome?.drawn !== 1 || outcome.events?.length !== 1 ||
                String(planned?.id) !== String(event.effectId) || !quad ||
                !(quad.receiverHeightPx > 0))
              throw new Error(`Barrier r0.7 ${event.effectId} lacks its submitted owner sprite`);
            const rendered = need('barrierProR07Game', 'record').record({ frame, target, viewport,
              events: [{ id: planned.id, event: planned.variant, tMs: planned.tMs,
                center: quad.center, receiverHeightPx: quad.receiverHeightPx }] });
            if (rendered?.drawn !== 1 || rendered.eventIds?.[0] !== planned.id)
              throw new Error(`Barrier r0.7 ${event.effectId} was not drawn once`);
            const roomId = String(stages.magicEffects?.roomId ??
              stages.magicEffects?.data?.roomId ?? '');
            if (!roomId) throw new Error(`Barrier r0.7 ${event.effectId} lacks room identity`);
            barrierSoundVisualReceipts.push(Object.freeze({ roomId,
              effectId: planned.id, ownerId: planned.ownerId,
              variant: planned.variant, progress: planned.progress }));
          } else if (['bustE', 'dodgeE', 'renkiE', 'ideaE'].includes(event.type)) {
            const outcome = need(event.type, 'record').record({ frame, target, viewport,
              ...event.input });
            const entries = outcome?.events || outcome?.effects;
            if (!Array.isArray(entries) || entries.length !== 1 ||
                String(entries[0].id) !== String(event.effectId) ||
                outcome.drawn !== 1 || !Array.isArray(outcome.commands) ||
                !outcome.commands.length)
              throw new Error(`Magic ${event.type} ${event.effectId} was not drawn once`);
          } else if (event.type === 'sunbeamE') {
            const input = event.input;
            const receipt = sunbeamHands.get(String(event.effectId));
            const hands = input.activeAction ? receipt?.hands : input.submittedHands;
            if (!Array.isArray(hands) || !hands.length ||
                (input.activeAction && receipt.playerId !== input.playerId) ||
                hands.some(hand => !Number.isFinite(hand.x) || !Number.isFinite(hand.y)))
              throw new Error(`Magic Sunbeam ${event.effectId} has no matching submitted hand`);
            const effect = input.effect;
            sunbeamEvents.push({ effect, hands, camera: input.camera,
              zoom: input.zoom, elapsed: input.elapsed,
              actorRate: input.actorRate, characterElapsedMs: input.characterElapsedMs,
              reducedMotion: input.reducedMotion, alive: true, visible: true });
          } else if (event.type === 'fighterEnergyE') {
            const outcome = need('fighterEnergyE', 'record').record({ frame, target,
              viewport, ...event.input });
            if (outcome?.drawn !== 1 || outcome.effects?.length !== 1 ||
                outcome.effects[0]?.id !== String(event.effectId) ||
                outcome.effects[0]?.kind !== 'slash' ||
                !Array.isArray(outcome.commands) || !outcome.commands.length)
              throw new Error(`Magic Fighter slash ${event.effectId} was not drawn once`);
          } else if (event.type === 'healE') {
            if (!healRecorded.has(String(event.effectId)))
              throw new Error(`Magic Heal ${event.effectId} lacks its same-frame actor and both sides`);
          } else if (['alchemyE', 'hackerRootE', 'hackerStatusRecoveryE', 'floraE'].includes(event.type)) {
            const outcome = need(event.type, 'record').record({ frame, target, viewport,
              ...(event.type === 'alchemyE' ? { scene: event.input.scene,
                camera: event.input.camera, zoom: event.input.zoom } :
                { planned: event.input.planned }) });
            if (event.type === 'alchemyE'
              ? outcome?.drawn !== 1 || outcome.effects?.[0]?.id !== event.effectId
              : outcome?.drawn !== true || outcome.effectId !== event.effectId)
              throw new Error(`Magic ${event.type} ${event.effectId} was not drawn once`);
          } else if (['gravityFieldE', 'rigidItemImpactE', 'bottleShardsE',
            'archiveCabinetE', 'cableSpoolE'].includes(event.type)) {
            const outcome = need(event.type, 'record').record({ frame, target, viewport,
              ...(event.type === 'gravityFieldE'
                ? { scene: event.input.scene, camera: event.input.camera,
                  zoom: event.input.zoom }
                : event.type === 'archiveCabinetE' || event.type === 'cableSpoolE'
                  ? { effect: event.input.effect, now: event.input.now,
                    phase: event.input.phase, camera: event.input.camera,
                    zoom: event.input.zoom, reducedMotion: event.input.reducedMotion }
                  : { planned: event.input.planned }) });
            if (event.type === 'gravityFieldE'
              ? outcome?.drawn !== 1 || outcome.fields?.[0]?.id !== event.effectId
              : event.type === 'archiveCabinetE' || event.type === 'cableSpoolE'
                ? outcome !== true
                : outcome?.drawn !== true || outcome.effectId !== event.effectId)
              throw new Error(`Magic ${event.type} ${event.effectId} was not drawn once`);
          } else if (event.type === 'fireActivation') {
            const outcome = need('fireActivation', 'record').record({
              ...event.input, frame, target, viewport
            });
            if (outcome !== true)
              throw new Error(`Magic fire activation ${event.effectId} was not drawn`);
            fireActivationReceipts.push(Object.freeze({
              effectId: String(event.effectId),
              fireCausalId: event.input.effect.fireCausalId,
              playerId: String(event.input.effect.playerId)
            }));
          } else if (event.type === 'taskCompletion') {
            const outcome = need('facilityEffects', 'record').record({
              ...event.input, frame, target, viewport,
              shapes: need('shapes', 'enqueue')
            });
            if (!(outcome?.drawn > 0))
              throw new Error(`Magic task completion ${event.effectId} was not drawn`);
            prepared.addLease(outcome);
          }
        });
        // One complete submission, including [], lets the source retire SFX
        // when the last visible beam ends. The palms above came from this
        // frame's player commands or a previously submitted hand receipt.
        const sunbeamFrame = need('sunbeamE', 'record').record({ frame, target,
          viewport, events: sunbeamEvents, roomId: input.roomId });
        if (!Number.isSafeInteger(sunbeamFrame?.token) ||
            sunbeamFrame.eventIds.length !== sunbeamEvents.length)
          throw new Error('Magic Sunbeam frame has no complete-plan receipt');
        sunbeamFrameToken = sunbeamFrame.token;
        return { drawn: input.events.length };
      });
      run('attackTargets', input => need('attackTargets', 'record').record({ ...common(input), shapes: need('shapes', 'enqueue') }));
      run('taskIndicators', input => need('taskIndicators', 'draw').draw(common(input)));
      run('hud', input => need('hud', 'draw').draw(common(input)));
      run('minimap', input => need('minimap', 'draw').draw(common(input)));
      if (stages.players.preparation) {
        const bounds = stages.minimap?.scene?.bounds;
        if (!results.minimap || !bounds ||
            ![bounds.x, bounds.y, bounds.width, bounds.height].every(Number.isFinite) ||
            bounds.width <= 0 || bounds.height <= 0)
          throw new Error('Preparation map hit needs the submitted minimap bounds');
        preparationHitTargets.unshift(Object.freeze({ field: 'map',
          x: bounds.x, y: bounds.y, width: bounds.width,
          height: bounds.height }));
      }
      run('modeBanner', input => need('modeBanner', 'draw').draw(common(input)));
      run('expandedMap', input => need('expandedMap', 'record').record(common(input)));
      run('lighting', input => need('lighting', 'record').record(common(input)));
      run('killAnimation', input => need('killAnimation', 'record').record(common(input)));
      run('sensory', input => need('sensory', 'enqueue').enqueue(common(input)));
      run('markerExplanation', input => need('markerExplanation', 'draw').draw(common(input)));
      run('acquisition', input => {
        const pass = need('acquisition', 'record');
        return pass.record({ ...common(input),
          target: pass.target || target,
          viewport: input.preparedPlan?.viewport || input.viewport || viewport });
      });
      return Object.freeze({ recorded: Object.freeze(recorded), gaps: prepared.gaps,
        markerHitTargets: Object.freeze(markerHitTargets.slice()), results: Object.freeze(results),
        preparationHitTargets: Object.freeze(preparationHitTargets.slice()),
        minimapBounds: Object.freeze({ ...stages.minimap.scene.bounds }),
        phenomenonSoundVisualReceipts: Object.freeze(phenomenonSoundVisualReceipts.slice()),
        empSoundVisualReceipts: Object.freeze(empSoundVisualReceipts.slice()),
        staminaBenefitSoundReceipts: Object.freeze(staminaBenefitSoundReceipts.slice()),
        manaBenefitSoundReceipts: Object.freeze(manaBenefitSoundReceipts.slice()),
        environmentSoundReceipts: Object.freeze(environmentSoundReceipts.slice()),
        mysteryOpeningSoundReceipts: Object.freeze(mysteryOpeningSoundReceipts.slice()),
        gunnerAimSoundReceipts: Object.freeze(gunnerAimSoundReceipts.slice()),
        healSoundVisualReceipts: Object.freeze(healSoundVisualReceipts.slice()),
        barrierSoundVisualReceipts: Object.freeze(barrierSoundVisualReceipts.slice()),
        fireActivationReceipts: Object.freeze(fireActivationReceipts.slice()),
        sunbeamHandReceipts: Object.freeze([...sunbeamHands.values()]),
        sunbeamFrameToken });
    }
    return Object.freeze({ prepare, record, get device() { return device; }, destroy() { destroyed = true; } });
  }
  const api = Object.freeze({ create, ORDER, REQUIRED });
  root.DvaWebGPUMainScene = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof globalThis !== 'undefined' ? globalThis : window);
