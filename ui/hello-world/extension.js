'use strict';

const vscode = require('vscode');

function activate(context) {
  let panel;
  let replyCount = 0;
  let disposed = false;

  const openPanel = () => {
    if (disposed) return;
    if (panel) {
      panel.reveal(vscode.ViewColumn.One);
      return;
    }

    const current = vscode.window.createWebviewPanel(
      'thetis.helloWorld',
      'Thetis Hello World',
      vscode.ViewColumn.One,
      { enableScripts: true, localResourceRoots: [] }
    );
    panel = current;
    current.webview.html = panelHtml();

    const messages = current.webview.onDidReceiveMessage((message) => {
      console.debug('[hello-host] received', message);
      if (!message || message.type !== 'ping' || panel !== current) return;
      replyCount += 1;
      void current.webview.postMessage({ type: 'pong', count: replyCount });
    });
    const closing = current.onDidDispose(() => {
      if (panel === current) panel = undefined;
      messages.dispose();
      closing.dispose();
    });
  };

  const command = vscode.commands.registerCommand('thetis.helloWorld', openPanel);
  const status = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 100);
  status.text = 'Thetis Hello World';
  status.tooltip = 'Open the Thetis Hello World extension';
  status.command = 'thetis.helloWorld';
  status.show();

  context.subscriptions.push(command, status, {
    dispose() {
      disposed = true;
      if (panel) panel.dispose();
    }
  });
  openPanel();
}

function panelHtml() {
  const nonce = Array.from(crypto.getRandomValues(new Uint8Array(16)),
    (byte) => byte.toString(16).padStart(2, '0')).join('');
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'nonce-${nonce}'; style-src 'nonce-${nonce}';">
  <title>Thetis Hello World</title>
  <style nonce="${nonce}">
    body {
      margin: 0;
      padding: 32px;
      background: var(--vscode-editor-background);
      color: var(--vscode-editor-foreground);
      font-family: var(--vscode-font-family);
      font-size: var(--vscode-font-size);
    }
    main { max-width: 640px; }
    h1 { font-size: 28px; font-weight: 600; }
    p { line-height: 1.6; }
    button {
      padding: 8px 14px;
      border: 1px solid var(--vscode-button-border, transparent);
      background: var(--vscode-button-background);
      color: var(--vscode-button-foreground);
      font: inherit;
      cursor: pointer;
    }
    button:hover { background: var(--vscode-button-hoverBackground); }
    button:focus-visible { outline: 2px solid var(--vscode-focusBorder); outline-offset: 2px; }
  </style>
</head>
<body>
  <main aria-label="Thetis Hello World">
    <h1>Hello World</h1>
    <p>Thetis is running this extension in the browser.</p>
    <button id="test-extension-host" type="button">Test Extension Host</button>
    <p id="extension-host-result" role="status" aria-live="polite">Ready to test the extension host.</p>
  </main>
  <script nonce="${nonce}">
    (() => {
      const vscode = acquireVsCodeApi();
      const button = document.getElementById('test-extension-host');
      const result = document.getElementById('extension-host-result');
      button.addEventListener('click', () => {
        console.debug('[hello-panel] click');
        vscode.postMessage({ type: 'ping' });
      });
      window.addEventListener('message', (event) => {
        const message = event.data;
        console.debug('[hello-panel] message', message);
        if (message && message.type === 'pong' && Number.isSafeInteger(message.count) && message.count > 0) {
          result.textContent = 'Extension host replied: ' + message.count;
        }
      });
      console.debug('[hello-panel] ready');
    })();
  </script>
</body>
</html>`;
}

module.exports = { activate };
