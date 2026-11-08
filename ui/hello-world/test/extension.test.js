'use strict';

const assert = require('node:assert/strict');
const { webcrypto } = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

const extensionPath = path.join(__dirname, '..', 'extension.js');

function emitter() {
  const listeners = new Set();
  return {
    event(listener) {
      listeners.add(listener);
      return { dispose: () => listeners.delete(listener) };
    },
    fire(value) {
      for (const listener of [...listeners]) listener(value);
    },
    get size() { return listeners.size; }
  };
}

function loadExtension() {
  assert.ok(fs.existsSync(extensionPath), 'The browser extension implementation must exist');
  const commands = new Map();
  const panels = [];
  const statusItems = [];
  const context = { subscriptions: [] };
  const vscode = {
    ViewColumn: { One: 1 },
    StatusBarAlignment: { Left: 1 },
    commands: {
      registerCommand(id, callback) {
        commands.set(id, callback);
        return { dispose: () => commands.delete(id) };
      }
    },
    window: {
      createStatusBarItem(alignment, priority) {
        const item = {
          alignment, priority, visible: false, disposed: false,
          show() { this.visible = true; },
          dispose() { this.disposed = true; this.visible = false; }
        };
        statusItems.push(item);
        return item;
      },
      createWebviewPanel(viewType, title, column, options) {
        const received = emitter();
        const disposed = emitter();
        const panel = {
          viewType, title, column, options, disposed: false, reveals: [], replies: [],
          received, disposedEvent: disposed,
          reveal(column) { this.reveals.push(column); },
          dispose() {
            if (this.disposed) return;
            this.disposed = true;
            disposed.fire();
          },
          onDidDispose: disposed.event,
          webview: {
            html: '',
            onDidReceiveMessage: received.event,
            postMessage(message) {
              const payload = JSON.parse(JSON.stringify(message));
              panel.replies.push(payload);
              if (panel.deliverToWebview) panel.deliverToWebview(payload);
              return Promise.resolve(true);
            }
          }
        };
        panels.push(panel);
        return panel;
      }
    }
  };
  const sandbox = {
    module: { exports: {} },
    require(id) {
      assert.equal(id, 'vscode', 'Browser code must use only the VS Code API dependency');
      return vscode;
    },
    crypto: webcrypto,
    Uint8Array
  };
  vm.runInNewContext(fs.readFileSync(extensionPath, 'utf8'), sandbox, { filename: extensionPath });
  sandbox.module.exports.activate(context);
  return { commands, panels, statusItems, context };
}

function runWebview(panel) {
  const script = /<script\b[^>]*>([\s\S]*?)<\/script>/i.exec(panel.webview.html);
  assert.ok(script, 'The panel must include its local interaction script');
  const buttonListeners = new Map();
  const elements = {
    'test-extension-host': { addEventListener: (event, callback) => buttonListeners.set(event, callback) },
    'extension-host-result': { textContent: '' }
  };
  vm.runInNewContext(script[1], {
    document: { getElementById: (id) => elements[id] },
    window: {
      addEventListener(event, callback) {
        assert.equal(event, 'message');
        panel.deliverToWebview = (data) => callback({ data });
      }
    },
    acquireVsCodeApi: () => ({ postMessage: (message) => panel.received.fire(message) })
  });
  return {
    click: () => buttonListeners.get('click')(),
    result: () => elements['extension-host-result'].textContent
  };
}

// Removing startup opening or registering the wrong command breaks the entry points.
test('activation opens the editor panel and exposes a command and status item for reopening it', () => {
  const host = loadExtension();
  assert.equal(host.panels.length, 1);
  assert.equal(host.panels[0].title, 'Thetis Hello World');
  assert.equal(host.panels[0].column, 1);
  assert.equal(typeof host.commands.get('thetis.helloWorld'), 'function');
  assert.equal(host.statusItems.length, 1);
  assert.equal(host.statusItems[0].command, 'thetis.helloWorld');
  assert.equal(host.statusItems[0].visible, true);
});

// Creating a new panel from the command would lose the current editor and leak panels.
test('the command reveals the existing panel without creating duplicates', () => {
  const host = loadExtension();
  host.commands.get('thetis.helloWorld')();
  host.commands.get('thetis.helloWorld')();
  assert.equal(host.panels.length, 1);
  assert.deepEqual(host.panels[0].reveals, [1, 1]);
});

// A missing listener, wrong message type, or missing count update breaks the real round trip.
test('the webview button pings the host and renders incrementing pong counts', () => {
  const host = loadExtension();
  const panel = host.panels[0];
  const page = runWebview(panel);
  panel.received.fire(null);
  panel.received.fire({ type: 'unrelated' });
  assert.deepEqual(panel.replies, []);
  page.click();
  assert.deepEqual(panel.replies, [{ type: 'pong', count: 1 }]);
  assert.equal(page.result(), 'Extension host replied: 1');
  page.click();
  assert.deepEqual(panel.replies[1], { type: 'pong', count: 2 });
  assert.equal(page.result(), 'Extension host replied: 2');
});

// Keeping a disposed reference or callback would prevent reopening or send stale replies.
test('closing the panel releases callbacks and the command creates a working replacement', () => {
  const host = loadExtension();
  const original = host.panels[0];
  original.received.fire({ type: 'ping' });
  original.dispose();
  assert.equal(original.received.size, 0);
  assert.equal(original.disposedEvent.size, 0);
  host.commands.get('thetis.helloWorld')();
  assert.equal(host.panels.length, 2);
  original.received.fire({ type: 'ping' });
  assert.deepEqual(original.replies, [{ type: 'pong', count: 1 }]);
  const replacement = host.panels[1];
  replacement.received.fire({ type: 'ping' });
  assert.deepEqual(replacement.replies, [{ type: 'pong', count: 2 }]);
});

// Failing to register owned resources would retain command, status item, or panel listeners.
test('disposing the extension context releases the panel and registered entry points', () => {
  const host = loadExtension();
  for (const disposable of [...host.context.subscriptions].reverse()) disposable.dispose();
  assert.equal(host.panels[0].disposed, true);
  assert.equal(host.panels[0].received.size, 0);
  assert.equal(host.panels[0].disposedEvent.size, 0);
  assert.equal(host.commands.size, 0);
  assert.equal(host.statusItems[0].disposed, true);
});

// Relaxing the policy or referencing outside content would expand this local-only panel's access.
test('the panel exposes the greeting and button with nonce-restricted local content', () => {
  const panel = loadExtension().panels[0];
  assert.equal(panel.options.enableScripts, true);
  assert.deepEqual(Array.from(panel.options.localResourceRoots), []);
  assert.match(panel.webview.html, /<h1>Hello World<\/h1>/);
  assert.match(panel.webview.html, /<button\b[^>]*>Test Extension Host<\/button>/);
  const policy = /<meta\s+http-equiv="Content-Security-Policy"\s+content="([^"]+)"/.exec(panel.webview.html);
  assert.ok(policy);
  assert.match(policy[1], /default-src 'none'/);
  const nonce = /script-src 'nonce-([a-f0-9]{32})'/.exec(policy[1]);
  assert.ok(nonce);
  assert.ok(panel.webview.html.includes('<script nonce="' + nonce[1] + '">'));
  assert.ok(panel.webview.html.includes('<style nonce="' + nonce[1] + '">'));
  assert.doesNotMatch(panel.webview.html, /<(?:iframe|img|link)\b|\ssrc=|https?:\/\//i);
});
