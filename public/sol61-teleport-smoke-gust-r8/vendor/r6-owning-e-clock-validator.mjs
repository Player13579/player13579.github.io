// Exact standalone extraction of the frozen R6 owning-clock validator; no R6 creative planning or geometry is included.
const finite=Number.isFinite;
function validateOwningClock(clock,expected) {
 return Boolean(clock&&Object.isFrozen(clock)&&clock.schema==='teleport-actor-e-clock-r2'&&clock.current===true&&
  clock.actorId===expected.actorId&&clock.causalId===expected.causalId&&clock.roomId===expected.roomId&&
  clock.generation===expected.generation&&Number.isSafeInteger(clock.generation)&&clock.generation>=0&&
  clock.relocationRevision===expected.revision&&Number.isSafeInteger(clock.relocationRevision)&&clock.relocationRevision>0&&
  finite(clock.atEms)&&clock.atEms>=0&&Array.isArray(clock.sourceIds)&&Object.isFrozen(clock.sourceIds)&&
  clock.sourceIds.length===expected.sourceIds.length&&new Set(clock.sourceIds).size===clock.sourceIds.length&&clock.sourceIds.every((id,i)=>typeof id==='string'&&id.length>0&&id===expected.sourceIds[i]));
}
export { validateOwningClock };
