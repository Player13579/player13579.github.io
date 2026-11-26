/* Layout and controller for the match-only UI layer. This does not own the
 * session, canvas, tablet preference, or gameplay input. */
(function (root) {
  'use strict';
  const document = root.document;
  const overlayIds = [
    'fieldLowerRow', 'sidePanel',
    'fullscreenButton', 'titleHomeButton', 'leaveRoomButton', 'gameMuteButton',
    'gameTacticsButton', 'tabletButton', 'keybindButton', 'analyticsToggleButton'
  ];
  let active = false;
  let expanded = false;
  let room = null;
  let battle = null;
  let session = null;
  let lastPhase = null;
  let beforeMeeting = false;
  let closeInput = null;
  let button = null;
  let mapButton = null;
  const ownedInert = new Set();
  const modalIds = ['expandedMapOverlay', 'keybindOverlay', 'killCameraOverlay', 'fieldFeedPanel', 'switchDragMenu'];
  let inputGeneration = 0;
  let modalObserver = null;
  function noteModalChanges(records) {
    // Polls may reassign the same hidden value. Only actual visibility
    // transitions revoke a touch, including an open-and-close within one task.
    const after = new Map();
    for (let i = records.length - 1; i >= 0; --i) {
      const { target, oldValue } = records[i];
      const nextValue = after.has(target) ? after.get(target) : target.getAttribute('hidden');
      if ((oldValue === null) !== (nextValue === null)) {
        inputGeneration += 1;
        return;
      }
      after.set(target, oldValue);
    }
  }
  function flushModalChanges() {
    if (modalObserver) noteModalChanges(modalObserver.takeRecords());
  }
  function modalOwnsInput() {
    return modalIds.some(id => document.getElementById(id)?.hidden === false);
  }
  const panelToolIds = ['fullscreenButton', 'titleHomeButton', 'debugForceEndButton',
    'leaveRoomButton', 'operatorReselectButton', 'gameMuteButton', 'gameTacticsButton',
    'tabletButton', 'analyticsToggleButton', 'keybindButton'];
  const panelHomes = new Map();
  let unified = false;
  const unifiedCssReady = () => root.getComputedStyle(document.documentElement)
    .getPropertyValue('--dva-one-match-panel-ready').trim() === '1';
  function setUnifiedPanel(next) {
    if (next === unified || (next && !unifiedCssReady())) return;
    const side = document.getElementById('sidePanel');
    const head = document.getElementById('matchPanelHeader');
    const tools = document.getElementById('matchPanelToolbar');
    const field = document.getElementById('fieldLowerRow');
    if (!side || !head || !tools || !field) return;
    const move = (node, into, before = null) => {
      if (!node?.parentNode) return;
      const home = document.createComment('match-panel-home');
      node.parentNode.insertBefore(home, node);
      panelHomes.set(node, home);
      into.insertBefore(node, before);
    };
    if (next) {
      for (const id of panelToolIds) move(document.getElementById(id), tools);
      move(field, side, document.getElementById('statusPanel'));
      head.hidden = false;
    } else {
      head.hidden = true;
      for (const [node, home] of panelHomes) {
        if (home.parentNode) home.parentNode.replaceChild(node, home);
      }
      panelHomes.clear();
    }
    unified = next;
    document.body.classList.toggle('dva-unified-panel-active', unified);
  }

  function apply() {
    const body = document.body;
    if (!body || !button) return;
    body.classList.toggle('dva-full-canvas', active);
    body.classList.toggle('dva-match-ui-open', active && expanded);
    setUnifiedPanel(active && expanded && lastPhase === 'playing');
    button.hidden = !active || lastPhase === 'meeting';
    if (mapButton) mapButton.hidden = !active || lastPhase !== 'playing';
    button.setAttribute('aria-expanded', String(active && expanded));
    button.textContent = expanded ? 'パネルを閉じる' : 'パネルを開く';
    for (const node of ownedInert) node.inert = false;
    ownedInert.clear();
    if (active && !expanded) {
      for (const id of overlayIds) {
        const node = document.getElementById(id);
        if (node && !node.inert) { ownedInert.add(node); node.inert = true; }
      }
    }
  }
  function toggle() {
    if (!active || lastPhase === 'meeting' || modalOwnsInput()) return;
    if (expanded) {
      closeInput?.();
      button.focus({ preventScroll: true });
    }
    expanded = !expanded;
    apply();
  }
  function init({ closeMatchUi, openMap } = {}) {
    if (button) return;
    button = document.getElementById('matchUiToggle');
    if (!button) return;
    closeInput = closeMatchUi;
    // A browser may rotate without sending a pointercancel to the old button.
    // Revoke only launchers; the movement stick still owns its own geometry.
    root.addEventListener?.('orientationchange', () => { inputGeneration += 1; });
    if (typeof root.MutationObserver === 'function') {
      modalObserver = new root.MutationObserver(noteModalChanges);
      for (const id of modalIds) {
        const node = document.getElementById(id);
        if (node) modalObserver.observe(node, { attributes: true, attributeFilter: ['hidden'], attributeOldValue: true });
      }
    }
    mapButton = document.getElementById('matchUiMapButton');
    if (mapButton) bindLauncher(mapButton, () => !mapButton.hidden, () => {
      mapButton.focus({ preventScroll: true });
      openMap?.();
    });
    bindLauncher(button, () => !button.hidden, toggle);
  }
  function bindLauncher(node, available, activate) {
    let touch = null, lastTouchActivation = -Infinity;
    const canActivate = () => available() && !modalOwnsInput();
    // Safari need not synthesize a click from a secondary touch while the
    // first finger is holding the joystick. Each launcher owns its touch.
    node.addEventListener('pointerdown', event => {
      flushModalChanges();
      if (event.pointerType === 'mouse') lastTouchActivation = -Infinity;
      if (!canActivate() || event.pointerType !== 'touch' || touch?.generation === inputGeneration) return;
      touch = { pointerId: event.pointerId, generation: inputGeneration };
      event.preventDefault();
      try { node.setPointerCapture(event.pointerId); } catch {}
    });
    const cancel = event => {
      if (touch?.pointerId === event.pointerId) {
        touch = null;
        lastTouchActivation = root.performance.now();
      }
    };
    node.addEventListener('pointercancel', cancel);
    node.addEventListener('lostpointercapture', cancel);
    node.addEventListener('pointerup', event => {
      flushModalChanges();
      if (touch?.pointerId !== event.pointerId) {
        // An old touch may arrive after a newly joined round already owns
        // this launcher. Its compatibility click must not toggle the new UI.
        if (event.pointerType === 'touch') lastTouchActivation = root.performance.now();
        return;
      }
      const valid = touch.generation === inputGeneration;
      touch = null;
      if (!valid || !canActivate()) {
        // Suppress a compatibility click from the revoked finger as well.
        lastTouchActivation = root.performance.now();
        if (event.cancelable) event.preventDefault();
        return;
      }
      const rect = node.getBoundingClientRect();
      if (event.clientX < rect.left || event.clientX > rect.right ||
          event.clientY < rect.top || event.clientY > rect.bottom) return;
      event.preventDefault();
      lastTouchActivation = root.performance.now();
      activate();
    });
    node.addEventListener('click', event => {
      flushModalChanges();
      if (!canActivate() || (event.detail && root.performance.now() - lastTouchActivation < 650)) return;
      activate();
    });
  }
  function sync(screen, data, blocked = false, sessionGeneration = null) {
    if (!button) return false;
    const phase = data?.phase ?? null;
    const nextActive = screen === 'game' && !blocked && (phase === 'playing' || phase === 'meeting');
    const nextRoom = nextActive ? data.roomId : null;
    const nextBattle = nextActive && Number.isFinite(data?.battleStartedAt) && data.battleStartedAt > 0
      ? data.battleStartedAt : null;
    const nextSession = nextActive ? sessionGeneration : null;
    const changedBattle = nextBattle !== null && battle !== null && nextBattle !== battle;
    const ownerChanged = nextRoom !== room || nextSession !== session || changedBattle;
    const changed = nextActive !== active || ownerChanged || phase !== lastPhase;
    if (!changed && battle === null) battle = nextBattle;
    if (!changed) return false;
    const geometryChanged = nextActive !== active;
    if (!nextActive || ownerChanged) {
      expanded = beforeMeeting = false;
      inputGeneration += 1;
    }
    if (nextActive && phase === 'meeting' && (lastPhase !== 'meeting' || ownerChanged)) {
      inputGeneration += 1;
      beforeMeeting = expanded;
      expanded = true;
    } else if (nextActive && phase === 'playing' && lastPhase === 'meeting') {
      expanded = beforeMeeting;
    }
    active = nextActive;
    room = nextRoom;
    if (ownerChanged || !nextActive || nextBattle !== null) battle = nextBattle;
    session = nextSession;
    lastPhase = phase;
    apply();
    return geometryChanged;
  }
  root.DvaFullCanvasUi = Object.freeze({ init, sync,
    get expanded() { return !active || expanded; } });
})(window);
