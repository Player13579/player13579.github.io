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
    function textureFor(command) {
      const image = command.image;
      const current = textures.get(image);
      if (current && current.width === image.naturalWidth &&
          current.height === image.naturalHeight) return current.texture;
      const texture = device.createTexture({ label: `DVA authored ${command.assetPath}`,
        size: [image.naturalWidth, image.naturalHeight], format: 'rgba8unorm',
        usage: textureUsage.COPY_DST | textureUsage.TEXTURE_BINDING | textureUsage.RENDER_ATTACHMENT });
      try {
        device.queue.copyExternalImageToTexture({ source: image },
          { texture, premultipliedAlpha: true }, [image.naturalWidth, image.naturalHeight]);
      } catch (error) { texture.destroy(); throw error; }
      ownedTextures.add(texture);
      textures.set(image, { width: image.naturalWidth, height: image.naturalHeight, texture });
      return texture;
    }
    return Object.freeze({
      textureFor,
      record(frame, target, command) {
        if (!command || command.stage !== 'world:players:sprite') throw new TypeError('Authored player command required');
        frame.sprite(target, { ...command.sprite, texture: textureFor(command) });
      },
      destroy() { for (const texture of ownedTextures) texture.destroy(); ownedTextures.clear(); textures.clear(); }
    });
  }
  const api = Object.freeze({ createCommand, createTextureCache, sunbeamHandsForCommand });
  root.DvaWebGPUPlayerSprite = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof globalThis !== 'undefined' ? globalThis : window);
