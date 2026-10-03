export function parseGalleryHandshake(params, expectedVersionId) {
  const token = params.get('galleryStartupToken') || '';
  const versionId = params.get('galleryVersionId') || '';
  const attemptEpoch = Number(params.get('galleryAttemptEpoch'));
  if (!/^[0-9a-f]{32}$/i.test(token) || versionId !== expectedVersionId || !Number.isSafeInteger(attemptEpoch) || attemptEpoch <= 0) return null;
  return Object.freeze({ token, versionId, attemptEpoch });
}

export function mapLogicalProjection(viewport, sourcePoint, opticalCenter, logical = { width:960, height:480 }, designZoom = 0.9) {
  const width=Number(viewport.width), height=Number(viewport.height);
  if (!(width>0&&height>0&&logical.width>0&&logical.height>0&&designZoom>0)) throw new Error('positive projection dimensions required');
  const fit=Math.min(width/logical.width,height/logical.height);
  const offsetX=(width-logical.width*fit)/2, offsetY=(height-logical.height*fit)/2;
  const project=p=>Object.freeze({x:offsetX+Number(p.x)*fit,y:offsetY+Number(p.y)*fit});
  return Object.freeze({width,height,scale:designZoom*fit,hand:project(sourcePoint),opticalCenter:project(opticalCenter),
    fit,offsetX,offsetY});
}

export function makeCompletedFrameProof(frame, { canvasConnected, canvasRect, sourceHashes, completedFrame } = {}) {
  if (!frame?.submitted || !frame?.sequence) throw new Error('a submitted frame is required');
  if (!completedFrame?.completed || completedFrame.sequence !== frame.sequence) throw new Error('matching queue-completed frame is required');
  if (!Number.isSafeInteger(frame.passes) || frame.passes < 1) throw new Error('positive integer completed-frame pass count is required');
  if (!canvasConnected) throw new Error('connected canvas is required');
  const viewportWidth = Number(canvasRect?.width), viewportHeight = Number(canvasRect?.height);
  if (!(Number.isFinite(viewportWidth) && viewportWidth > 0 && Number.isFinite(viewportHeight) && viewportHeight > 0))
    throw new Error('positive connected-canvas CSS viewport is required');
  if (!sourceHashes?.plan || !sourceHashes?.shader) throw new Error('exact creative source hashes are required');
  return Object.freeze({ recorded:true, submitted:true, completed:true, canvasConnected:true,
    passes:frame.passes, viewportWidth, viewportHeight,
    sequence:frame.sequence, causeId:frame.causeId, causeGeneration:frame.causeGeneration,
    uniformAge:frame.uniformAge, effectAgeMs:frame.effectAgeMs, source:frame.source,
    pathEnd:frame.pathEnd, direction:frame.direction, controls:frame.controls,
    view:frame.view, viewport:frame.viewport, presentationFormat:frame.presentationFormat, worldFormat:frame.worldFormat,
    worldTargetCount:frame.targetCount, passCount:frame.passes, sourceHashes:Object.freeze({ ...sourceHashes }),
    submittedSerial:frame.sequence, completedSerial:completedFrame.sequence });
}
