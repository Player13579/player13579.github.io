import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import vm from 'node:vm';

const source = await readFile(new URL('./webgpu-e-gallery.js', import.meta.url), 'utf8');

test('gallery does not observe a status bridge value and keeps its status updates live', () => {
  class Element {
    constructor(tag = '') {
      this.tagName = tag;
      this.children = [];
      this.dataset = {};
      this.style = {};
      this.clientWidth = 980;
      this.clientHeight = 620;
      this.hidden = true;
      this.listeners = {};
      this.textContent = '';
    }
    append(...children) { this.children.push(...children); }
    replaceChildren(...children) { this.children = children; }
    setAttribute() {}
    addEventListener(name, callback) { this.listeners[name] = callback; }
    querySelector(selector) { return selector === 'iframe' ? this.children.find(child => child.tagName === 'iframe') ?? null : null; }
    remove() { this.removed = true; }
  }
  const elements = new Map();
  const document = {
    getElementById(id) { if (!elements.has(id)) elements.set(id, new Element(id)); return elements.get(id); },
    createElement(tag) { return new Element(tag); }
  };
  const status = { nodeType: 1, textContent: 'preview is still initializing' };
  class ChildNode {}
  let observeCalls = 0;
  class MutationObserver {
    observe() { observeCalls++; throw new TypeError("parameter 1 is not of type 'Node'"); }
    disconnect() {}
  }
  const childWindow = { Node: ChildNode, MutationObserver };
  const childDocument = { defaultView: childWindow, getElementById: () => status };
  let poll;
  const window = {
    setInterval(callback) { poll = callback; return 1; },
    clearInterval() {}
  };
  vm.runInNewContext(source, {
    document, window, URL, URLSearchParams,
    location: { search: '?verify=1', href: 'https://example.test/webgpu-e-gallery.html?verify=1' },
    navigator: { gpu: true },
    ResizeObserver: class { observe() {} disconnect() {} }
  });

  const iframe = document.getElementById('stage').children.find(child => child.tagName === 'iframe');
  assert.ok(iframe, 'default preview iframe is mounted');
  iframe.contentDocument = childDocument;
  iframe.listeners.load();
  assert.equal(observeCalls, 0, 'bridge object is rejected before observe()');
  assert.equal(typeof poll, 'function', 'polling fallback is installed');
  assert.equal(document.getElementById('notice').textContent, 'preview is still initializing');

  status.textContent = 'preview ready';
  poll();
  assert.equal(document.getElementById('notice').textContent, 'preview ready');
  assert.equal(iframe.src.includes('embed=1'), true, 'embedded auto-loop preview URL remains mounted');
});
