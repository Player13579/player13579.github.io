# Teleport pixel r1 — producer/adapter contract

Owned design-only artifact, GPT-6.1-Sol. No production changes, generated images, browser or server started. Baseline is canonical Git HEAD `6275464f6f37b98b8113b529cdef2132eb487030`. Read actual HEAD main/worker producers and viewer serializer; ROOT `server.js` is a current dirty source, not a separately proven published HEAD server. Luna implementation must change the server authority and regenerate main/worker by the existing generation workflow, then prove equivalence; copying dirty server wholesale is forbidden.

## Covered successful relocations

| Producer | Game meaning | Pixel r1 |
|---|---|---|
| `teleportPlayer(..., mode='body')` | Gravity 地点転移; always moves caster, even if request carries another target | Included, family `gravity-body`, actor=caster |
| `teleportPlayer(..., mode='target')` | Gravity 対象転移; may move selected actor or self | Included, family `gravity-target`, actor=actual movingTarget |
| `teleportBotToward` / Gravity clairvoyance / borrowed or batch routes invoking the same successful producer | Same physical relocation | Included under the successful producer's family; no route inference |
| `useTeleportMapScroll` (`/api/instant-warp`, non-Gravity clairvoyance) | Consume an already owned warp charge, move self | Included, distinct family `scroll-body`, source type remains `action-warp` |
| `mode='heart'` / `action-heart-teleport` | Remote heart attack/elimination; no body relocation | Excluded; preserve its own action/E |
| Scroll acquisition, purchases, mystery/loot rewards, entitlement seeding | Receive permission, no relocation | Excluded; preserve acquisition E |
| Friendly-fire reflection, invalid destination/target, insufficient MP, unavailable ability, no warp charge | Failure/reflection without accepted relocation | No successful receipt, no pixel body or SFX |

`instant-warp` is the scroll-use API label, not a new instantaneous actor/caster ability. Coordinate abilities that do not call these two accepted movement producers are not admitted. Existing input validation, role/access, allied-target reflection, MP costs, warp charge decrement, movement cancellation, relocationRevision, cooldown, events and win checks remain authoritative and in their existing order. Visual duration never delays or changes authoritative motion.

## Actual existing source contract

Both HEAD main and worker use `moveByExpandedMapTeleport`: capture raw actor origin, clear movement, reset airborne/mode/velocity/navigation, move to validated destination, increment actor relocationRevision. Gravity emits two different `magic_` IDs, `action-teleport` radius135, durationMs0: departure `playerId=caster`, `targetId=movingActor`, x/y=rounded raw origin, targetX/Y=rounded destination, variant empty; arrival `playerId=movingActor`, variant arrival, x/y=rounded actor destination. Scroll emits `action-warp` radius125 with self playerId, departure targetX/Y and arrival variant; no targetId. Each push calls `now()` independently; timestamp equality is not pairing proof. Current helper returns no effect object, and batch suppression returns false.

Viewer serializer omits invisible effect owner; Gravity departure also disappears when transported target is concealed. Thus visible arrival can legitimately exist without visible departure (e.g. hidden caster, visible transported actor). A mandatory public two-endpoint proof would either conceal a valid visible arrival or leak the hidden caster/origin. The prototype's original full-pair-only admission is insufficient for this actual policy and must be adapted before integration.

## Authoritative commit receipt, created once

Immediately after existing movement succeeds, create one server-generated unique `teleportCastId`; never accept a client cast ID as authority. Keep a server immutable commit snapshot:

`schema='teleport-body-commit-r1'`, castId, roomId, server room/match incarnation ID, family, casterId, transportedActorId, authoritative successful timestamp `committedAtServerMs`, raw finite from/to, relocated actor revisionBefore/revisionAfter, and presentation identity snapshot sufficient to resolve the actor's authored pose (actual visible appearance/character identity, authored direction input and stable facing). Include linked departureId/arrivalId once their actual events are emitted. IDs must remain distinct. Snapshot is the single accepted relocation; it is not a new item acquisition receipt.

Raw coordinates must preserve `moveByExpandedMapTeleport` values; legacy magic x/y fields remain rounded and are checked against Math.round(raw coordinates). Do not render at rounded legacy coordinates when exact authoritative from/to is available. Capture pose metadata before movement resets movementMode, but do not add a pose animation command or alter actor mechanics on server.

Add only whitelisted metadata to existing two event records: teleportCastId, family, transported actor identity, endpoint role, actor relocationRevisionAfter and the endpoint-safe projection described below. Preserve type, radius, variant, playerId, targetId, target coords and existing ID semantics. Do not pair by timestamps, proximity, array adjacency, nearest actor, same caster alone, or request API labels.

Batch presentation dedup keys must remain unchanged: shared castId is NOT a dedup key. Capture exact event IDs actually retained for that one cast; never join a suppressed later arrival to the first departure. If the existing batch presents only the first pair but a subsequent cast relocates again, its old visual receipt cancels on relocation revision mismatch. Do not change batch movement or emit additional events to force every cast to display. No pair means no full-pair completion claim.

## Viewer projection and endpoint leases

Server authority may retain the full commit; a client receives only the projection allowed by the existing viewer serializer. Add metadata **after applying the existing endpoint visibility gates**, without relaxing any gate. Every admitted endpoint carries castId, room/incarnation, family, visible transportedActorId, endpoint role, endpoint's actual source ID/position/server timestamp, relocation revision and public pose identity. A viewer without caster visibility does not receive caster identity or hidden departure coordinates through arrival metadata. A viewer without an endpoint's existing visibility does not receive its proof, position, pose, sound or suppressed source ID.

When both endpoints are already visible, the adapter can retain exact casterId, from/to and both source proofs and join them by castId. Otherwise it creates an endpoint-only lease. Endpoint-only arrival is a legitimate reconstitution at its actual visible destination, not a fabricated completed departure. Endpoint-only departure does not derive destination from an omitted endpoint, though already public legacy target coordinates remain public under existing policy. Same UV cell identity is maintained using one pinned pose definition wherever both endpoint leases exist. No public mandatory private join or new cryptographic authenticity claim; trust remains the existing authoritative snapshot transport.

Client attaches `clientRoomSessionGeneration`, source eClock room ID and one immutable local first-receipt time. Server room incarnation and client generation are different fields. Dedup key = room incarnation + client generation + castId + endpoint role. Repeated polls cannot restart phase/audio. Reject raw numeric strings, nonfinite coordinates/clocks, wrong source ID/type/radius/variant/family, conflicting duplicate cast/endpoint, source/actor mismatch, revision jump inconsistent with saved commit, wrong room/incarnation, stale client generation, or proof mutation. Missing intentionally concealed endpoint is allowed as endpoint-only; malformed visible source is blocked with diagnostics.

Clock: server epoch timestamps are provenance, never subtracted from performance.now. Pixel lifecycle uses one local wall-receipt time basis captured once, 640ms unscaled by actor accelerate/decelerate; source eClockRoomId must match current room before any expiry/privacy/offscreen omission. Raw local now/start are finite nonnegative in the same room-bound wall time domain. Paused/hidden rendering does not restart or replay. Late polling may shorten visible lifetime; never reset to make an old cast appear fresh. E-clock adapter may map server age using the established room clock translator; if no trustworthy translation exists, first local receipt begins the finite presentation and its status explicitly remains receipt-timed. Do not pretend server epoch is a client visual clock.

## Pose, body ownership and retirement

Resolve transported actor, not departure.playerId. At successful receipt, select exact authored standing pose from immutable presentation identity; an existing last-rendered command is usable only if actor identity and pre-relocation revision match. Current post-move location is not origin proof. If authored command/identity cannot be established, preserve ordinary body and report missing pose; no closest/caster sprite substitution. Apply the existing prototype's asset path/hash, crop/sourceSize, device/uploadVersion pin and affine restrictions. No Canvas2D, readback or new bitmap.

Exclusive body suppression is actor+cast+revision+endpoint lease. Suppress only while prepared pixel commands own a valid visible arrival; never hide an ordinary body merely because a source exists. Departure renders saved pose at saved origin; it does not suppress an unrelated current actor there. Actor movement away from saved destination, another relocation revision, death/ejection/vent, privacy change, room/session change, device retirement or missing pose cancels relevant body lease and restores the correct current body. No gameplay immobilization. Prepared references live until GPU completion, release once. Receipt/source snapshot retention may outlive legacy magic array pruning only through 640ms lease; source retirement must not mutate that proof, restart audio, or imply E completion. Source arrays and existing server TTL remain unchanged.

Each endpoint retires source-owned commands/audio after its finite coverage. Causal receipt remains bounded in session dedup retention to prevent repeat snapshots. A later legitimate cast has a new castId even at identical from/to. SFX emits only once per actually submitted visible endpoint phase and verify is always silent. Do not register completion before GPU submit; cancellation/partial endpoint remains explicitly partial or omitted.

## Small implementation boundary and acceptance

Luna: producer helper + whitelisted push fields; two successful relocation callsites; existing serializer's metadata-safe endpoint projection; generated main/worker synchronization; client pure receipt adapter plus source/pose/body lease hooks. Keep production creative shader intact; prototype adapter needs endpoint-only source support and raw coordinates in a separately reviewed change. Index/SW versioning and gallery replay/publish are parent integration, not this contract's completion.

Tests must execute actual producer paths for self/other target, body ignoring supplied target, scroll, clairvoyance Gravity/scroll, bot, successful batch; assert original coordinates/MP/warp charge/revision/events unchanged except added metadata. Negative heart/reflection/wall target/MP/charge cases emit no commit. Actual viewer projection tests: hidden caster visible target gives arrival-only, concealed target does not leak origin/pose/caster through extra metadata, self visibility preserved. Mutation/session/clock/duplicate/rounding/revision tests and repeated-poll dedup; source prune with valid retained proof expires finitely; movement/new teleport cancels; correct actor pose and no body suppression without prepared pixel commands. GPU image recognition and submitted phase/audio tests remain primary acceptance. This document designs a future connection; current pending action-teleport is not completed pixel E.

Validation: actual HEAD main/worker functions and serializer inspected; current root server has matching successful relocation shape but unpublished dirty status explicitly retained. No producer, game or GPU test was executed by this design assignment.

モデル分担: GPT-6.1-Sol 100% — causal/privacy/body lease cross-system design.
