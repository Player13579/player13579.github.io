/* Authored character sprite commands for the shared ordered WebGPU renderer.
 * The game supplies its resolved manifest entry and live animation state; this
 * module owns logical-viewport geometry and texture upload, never a device or
 * presentation loop. The shared target maps logical coordinates to DPR backing. */
(function (root) {
  'use strict';
  const finite = Number.isFinite;
  const textureUsage = root.GPUTextureUsage || { COPY_DST: 0x02, TEXTURE_BINDING: 0x04, RENDER_ATTACHMENT: 0x10 };
  const identity = [1, 0, 0, 1, 0, 0];
  const translate = (x, y) => [1, 0, 0, 1, x, y];
  const scale = (x, y) => [x, 0, 0, y, 0, 0];
  const rotate = angle => [Math.cos(angle), Math.sin(angle), -Math.sin(angle), Math.cos(angle), 0, 0];
  function multiply(a, b) {
    return [a[0] * b[0] + a[2] * b[1], a[1] * b[0] + a[3] * b[1],
      a[0] * b[2] + a[2] * b[3], a[1] * b[2] + a[3] * b[3],
      a[0] * b[4] + a[2] * b[5] + a[4], a[1] * b[4] + a[3] * b[5] + a[5]];
  }
  const chain = matrices => matrices.reduce(multiply, identity);
  function validFrame(frame, image) {
    return frame && [frame.x, frame.y, frame.width, frame.height].every(finite) &&
      frame.x >= 0 && frame.y >= 0 && frame.width > 0 && frame.height > 0 &&
      frame.x + frame.width <= image.naturalWidth && frame.y + frame.height <= image.naturalHeight;
  }
  function createCommand(options) {
    const { player, identity: actorIdentity, direction, mode, entry, image, frame,
      body = {}, camera, zoom, alpha = 1, arrival = null,
      arrivalAnchor = player, order = 0 } = options;
    const layout = entry?.layout, origin = layout?.sourceOrigin, ground = layout?.ground;
    if (!player || !entry?.assetPath || !image?.complete || !(image.naturalWidth > 0) ||
        !(image.naturalHeight > 0) || !validFrame(frame, image) || !origin || !ground ||
        ![player.x, player.y, camera?.x, camera?.y, zoom, alpha, order,
          origin.x, origin.y, ground.x, ground.y, layout.scale,
          body.lean ?? 0, body.sway ?? 0, body.lift ?? 0].every(finite) ||
        zoom <= 0 || layout.scale <= 0 || alpha < 0 || alpha > 1) return null;
    const matrices = [scale(zoom, zoom),
      translate(-camera.x, -camera.y)];
    if (arrival?.active) {
      const { descent, lean, stanceX, stanceY } = arrival;
      if (![descent, lean, stanceX, stanceY].every(finite) || stanceX <= 0 || stanceY <= 0) return null;
      if (![arrivalAnchor?.x, arrivalAnchor?.y].every(finite)) return null;
      matrices.push(translate(arrivalAnchor.x, arrivalAnchor.y), translate(0, -descent), rotate(lean),
        scale(stanceX, stanceY), translate(-arrivalAnchor.x, -arrivalAnchor.y));
    }
    matrices.push(translate(player.x, player.y));
    // The visible nameplate and preparation input share this actor-local
    // transform, before only the body receives gait sway, lean and lift.
    const anchorTransform = Object.freeze(chain(matrices));
    matrices.push(translate(ground.x, ground.y),
      rotate(body.lean || 0), translate(body.sway || 0, -(body.lift || 0)));
    const sprite = Object.freeze({
      x: -origin.x * layout.scale, y: -origin.y * layout.scale,
      w: frame.width * layout.scale, h: frame.height * layout.scale,
      crop: [frame.x, frame.y, frame.width, frame.height],
      sourceSize: [image.naturalWidth, image.naturalHeight],
      transform: chain(matrices), color: [1, 1, 1, alpha], order, mode: 'source-over'
    });
    return Object.freeze({ stage: 'world:players:sprite', playerId: player.id,
      identity: actorIdentity, direction, movementMode: mode, assetPath: entry.assetPath,
      image, sprite, anchorTransform });
  }
  // A hand receipt is derived only from the exact authored sprite command
  // queued into the shared frame. Points are local to its cropped pose.
  function sunbeamHandsForCommand(command, camera, zoom) {
    const pose = command?.sunbeamPose;
    const sprite = command?.sprite;
    if (!pose || !sprite || !Array.isArray(pose.emitters) || !pose.emitters.length ||
        !Number.isFinite(camera?.x) || !Number.isFinite(camera?.y) ||
        !finite(zoom) || zoom <= 0 || !Array.isArray(sprite.transform) ||
        sprite.transform.length !== 6 || !sprite.transform.every(finite) ||
        !finite(pose.scale) || pose.scale <= 0 ||
        !finite(pose.origin?.x) || !finite(pose.origin?.y) ||
        !command.sourceEffectId || command.movementMode !== 'flora-sunbeam') return null;
    const [a, b, c, d, tx, ty] = sprite.transform;
    const hands = pose.emitters.map(point => {
      if (!finite(point?.x) || !finite(point?.y) ||
          point.x < 0 || point.y < 0 || point.x >= sprite.crop[2] ||
          point.y >= sprite.crop[3]) return null;
      const x = (point.x - pose.origin.x) * pose.scale;
      const y = (point.y - pose.origin.y) * pose.scale;
      return { x: (a * x + c * y + tx) / zoom + camera.x,
        y: (b * x + d * y + ty) / zoom + camera.y };
    });
    return hands.every(point => point && finite(point.x) && finite(point.y))
      ? Object.freeze(hands.map(point => Object.freeze(point))) : null;
  }
  function createTextureCache(device) {
    if (!device?.createTexture || !device?.queue?.copyExternalImageToTexture) {
      throw new TypeError('The shared WebGPU device and queue are required');
    }
    // Image identity keeps a prior frame's queued command alive if a sheet is
    // reloaded before submission; the shared renderer owns cache destruction.
    const textures = new Map();
    const ownedTextures = new Set();
    const entries = new Set();
    let nextUploadVersion = 0;
    let cacheDestroyed = false;
    let destroyPromise = null;
    let finishDestroy = null;
    function maybeFinishDestroy() {
      if (!cacheDestroyed || [...entries].some(entry => entry.pins > 0)) return;
      for (const entry of entries) {
        if (!entry.destroyed) {
          try { entry.texture.destroy(); } catch (_) {}
          entry.destroyed = true;
        }
      }
      ownedTextures.clear();
      textures.clear();
      entries.clear();
      finishDestroy?.();
      finishDestroy = null;
    }
    function ownerLeaseFor(entry) {
      const lease = Object.freeze({
        deviceIdentity: device,
        uploadVersion: entry.uploadVersion,
        get current() { return !entry.destroyed && !cacheDestroyed && textures.get(entry.image) === entry; },
        get ready() { return this.current && entry.ready === true; },
        pin(uploadVersion) {
          if (uploadVersion !== entry.uploadVersion || !this.current || !this.ready)
            throw new Error('Player atlas upload is not ready at the requested generation');
          entry.pins++;
          let active = true;
          return Object.freeze({
            get current() { return active && !entry.destroyed; },
            release({ submitted = false, completion = null } = {}) {
              if (!active) return;
              active = false;
              const releasePin = () => {
                entry.pins = Math.max(0, entry.pins - 1);
                maybeFinishDestroy();
              };
              if (submitted) Promise.resolve(completion).catch(() => {}).then(releasePin);
              else releasePin();
            }
          });
        }
      });
      return lease;
    }
    function textureFor(command) {
      if (cacheDestroyed) throw new Error('Player sprite texture cache destroyed');
      const image = command.image;
      const current = textures.get(image);
      if (current && current.width === image.naturalWidth &&
          current.height === image.naturalHeight && !current.destroyed) return current.texture;
      const texture = device.createTexture({ label: `DVA authored ${command.assetPath}`,
        size: [image.naturalWidth, image.naturalHeight], format: 'rgba8unorm',
        usage: textureUsage.COPY_DST | textureUsage.TEXTURE_BINDING | textureUsage.RENDER_ATTACHMENT });
      try {
        device.queue.copyExternalImageToTexture({ source: image },
          { texture, premultipliedAlpha: true }, [image.naturalWidth, image.naturalHeight]);
      } catch (error) { texture.destroy(); throw error; }
      const entry = { image, width: image.naturalWidth, height: image.naturalHeight,
        texture, uploadVersion: ++nextUploadVersion, ready: true, destroyed: false, pins: 0 };
      entry.ownerLease = ownerLeaseFor(entry);
      ownedTextures.add(texture);
      entries.add(entry);
      textures.set(image, entry);
      return texture;
    }
    function prepareSampledResource(command, { frameId, viewportGeneration } = {}) {
      if (!command || command.stage !== 'world:players:sprite')
        throw new TypeError('Authored player command required');
      if (!(typeof frameId === 'string' && frameId) && !(Number.isFinite(frameId) && frameId > 0))
        throw new TypeError('Actor sampled resource needs its base-draw frame id');
      if (!(typeof viewportGeneration === 'string' && viewportGeneration) &&
          !(Number.isFinite(viewportGeneration)))
        throw new TypeError('Actor sampled resource needs a viewport generation');
      const sprite = command.sprite;
      if (!sprite || !Array.isArray(sprite.crop) || sprite.crop.length !== 4 ||
          !sprite.crop.every(finite) || !Array.isArray(sprite.sourceSize) || sprite.sourceSize.length !== 2 ||
          !sprite.sourceSize.every(finite) || !Array.isArray(sprite.transform) || sprite.transform.length !== 6 ||
          !sprite.transform.every(finite) || !Array.isArray(sprite.color) || sprite.color.length !== 4 ||
          !sprite.color.every(finite))
        throw new TypeError('Actor sampled resource must reference the final prepared sprite command');
      const texture = textureFor(command);
      const entry = textures.get(command.image);
      if (entry?.texture !== texture || entry?.ready !== true || entry?.destroyed)
        throw new Error('Actor atlas upload is not ready for the prepared command');
      const playerId = String(command.playerId ?? '');
      if (!playerId) throw new TypeError('Actor sampled resource needs its source player id');
      const actorInstanceId = `${playerId}@${String(frameId)}`;
      const subresource = Object.freeze({ baseMipLevel: 0, mipLevelCount: 1,
        baseArrayLayer: 0, arrayLayerCount: 1, aspect: 'all' });
      const spriteDescriptor = Object.freeze({ x: sprite.x, y: sprite.y, w: sprite.w, h: sprite.h,
        crop: Object.freeze(sprite.crop.slice()), sourceSize: Object.freeze(sprite.sourceSize.slice()),
        transform: Object.freeze(sprite.transform.slice()), color: Object.freeze(sprite.color.slice()),
        order: sprite.order, mode: sprite.mode });
      return Object.freeze({
        id: `actor-sprite:${actorInstanceId}`,
        kind: 'externalSample',
        texture, textureViewDescriptor: Object.freeze({ format: 'rgba8unorm', dimension: '2d',
          baseMipLevel: 0, mipLevelCount: 1, baseArrayLayer: 0, arrayLayerCount: 1, aspect: 'all' }),
        width: entry.width, height: entry.height, format: 'rgba8unorm', deviceIdentity: device,
        uploadVersion: entry.uploadVersion, alphaMode: 'premultiplied',
        colorEncoding: 'legacy-encoded', ready: entry.ready, ownerLease: entry.ownerLease,
        subresource,
        actor: Object.freeze({ actorInstanceId, playerId, identity: command.identity,
          direction: command.direction, movementMode: command.movementMode,
          frameId, viewportGeneration, assetIdentity: command.assetPath,
          imageIdentity: command.image, crop: spriteDescriptor.crop,
          sourceSize: spriteDescriptor.sourceSize, sprite: spriteDescriptor,
          footAnchorTransform: command.anchorTransform })
      });
    }
    return Object.freeze({
      textureFor,
      prepareSampledResource,
      record(frame, target, command) {
        if (!command || command.stage !== 'world:players:sprite') throw new TypeError('Authored player command required');
        frame.sprite(target, { ...command.sprite, texture: textureFor(command) });
      },
      destroy() {
        if (destroyPromise) return destroyPromise;
        cacheDestroyed = true;
        destroyPromise = new Promise(resolve => { finishDestroy = resolve; maybeFinishDestroy(); });
        return destroyPromise;
      }
    });
  }
  const api = Object.freeze({ createCommand, createTextureCache, sunbeamHandsForCommand });
  root.DvaWebGPUPlayerSprite = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof globalThis !== 'undefined' ? globalThis : window);
