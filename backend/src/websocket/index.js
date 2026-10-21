const { WebSocketServer } = require('ws');

const HEARTBEAT_INTERVAL_MS = 30000;

let wss = null;
let heartbeatHandle = null;

function initWebSocket(server) {
  wss = new WebSocketServer({ server, path: '/ws' });

  wss.on('connection', (ws) => {
    ws.isAlive = true;
    ws.on('pong', () => {
      ws.isAlive = true;
    });

    ws.send(JSON.stringify({ type: 'HELLO', timestamp: new Date().toISOString() }));
  });

  heartbeatHandle = setInterval(() => {
    for (const ws of wss.clients) {
      if (ws.isAlive === false) {
        ws.terminate();
        continue;
      }
      ws.isAlive = false;
      ws.ping();
    }
  }, HEARTBEAT_INTERVAL_MS);

  return wss;
}

function getClients() {
  return wss ? wss.clients : [];
}

function closeWebSocket() {
  if (heartbeatHandle) {
    clearInterval(heartbeatHandle);
    heartbeatHandle = null;
  }
  if (wss) {
    wss.close();
    wss = null;
  }
}

module.exports = { initWebSocket, closeWebSocket, getClients };
