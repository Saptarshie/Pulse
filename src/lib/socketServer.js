// src/lib/socketServer.js
// High-performance real-time WebSocket server for Pulse Direct Messages
const http = require('http');
const { WebSocketServer, WebSocket } = require('ws');

const PORT = parseInt(process.env.WS_PORT || '3005', 10);

// Map of username -> Set of active WebSocket connections
const clients = new Map();

const server = http.createServer((req, res) => {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  // Health check endpoint
  if (req.method === 'GET' && req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      status: 'ok',
      activeUsers: clients.size,
      uptime: process.uptime()
    }));
    return;
  }

  // Broadcast endpoint for Server Actions to notify connected WebSocket clients
  if (req.method === 'POST' && req.url === '/broadcast') {
    let body = '';
    req.on('data', chunk => {
      body += chunk;
    });

    req.on('end', () => {
      try {
        const payload = JSON.parse(body);
        const { recipient, sender, message, type = 'message' } = payload;

        const dataStr = JSON.stringify({
          type,
          sender,
          recipient,
          message,
          timestamp: new Date().toISOString()
        });

        let deliveredCount = 0;

        // Deliver to recipient sockets
        if (recipient && clients.has(recipient.toLowerCase())) {
          const recSockets = clients.get(recipient.toLowerCase());
          recSockets.forEach(ws => {
            if (ws.readyState === WebSocket.OPEN) {
              ws.send(dataStr);
              deliveredCount++;
            }
          });
        }

        // Deliver to sender's other sockets (e.g. other open tabs/windows)
        if (sender && clients.has(sender.toLowerCase())) {
          const sendSockets = clients.get(sender.toLowerCase());
          sendSockets.forEach(ws => {
            if (ws.readyState === WebSocket.OPEN) {
              ws.send(dataStr);
              deliveredCount++;
            }
          });
        }

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, deliveredCount }));
      } catch (err) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, error: err.message }));
      }
    });
    return;
  }

  res.writeHead(404);
  res.end();
});

const wss = new WebSocketServer({ server });

wss.on('connection', (ws) => {
  let authenticatedUser = null;
  ws.isAlive = true;

  ws.on('pong', () => {
    ws.isAlive = true;
  });

  ws.on('message', (data) => {
    try {
      const msg = JSON.parse(data.toString());

      if (msg.type === 'auth' && msg.username) {
        authenticatedUser = String(msg.username).trim().toLowerCase();

        if (!clients.has(authenticatedUser)) {
          clients.set(authenticatedUser, new Set());
        }
        clients.get(authenticatedUser).add(ws);

        console.log(`[Pulse WS] User authenticated: "${authenticatedUser}" (active sockets for user: ${clients.get(authenticatedUser).size}, total connected users: ${clients.size})`);

        ws.send(JSON.stringify({
          type: 'authenticated',
          username: authenticatedUser,
          connectedAt: new Date().toISOString()
        }));
      } else if (msg.type === 'ping') {
        ws.send(JSON.stringify({ type: 'pong' }));
      } else if (typeof msg.type === 'string' && (msg.type.startsWith('call:') || msg.type.startsWith('webrtc:'))) {
        // Forward WebRTC signaling messages
        const recipient = String(msg.recipient || msg.target || '').trim().toLowerCase();
        const sender = String(authenticatedUser || msg.sender || '').trim().toLowerCase();

        console.log(`[Pulse WS] Signaling: type="${msg.type}" from="${sender}" to="${recipient}"`);

        if (recipient && clients.has(recipient)) {
          const recSockets = clients.get(recipient);
          const payload = JSON.stringify({
            ...msg,
            sender,
            recipient,
            serverTimestamp: new Date().toISOString()
          });

          let delivered = 0;
          recSockets.forEach((clientWs) => {
            if (clientWs.readyState === WebSocket.OPEN) {
              clientWs.send(payload);
              delivered++;
            }
          });

          console.log(`[Pulse WS] Forwarded "${msg.type}" to ${delivered} active socket(s) for user "${recipient}"`);

          if (delivered === 0 && msg.type === 'call:initiate') {
            console.log(`[Pulse WS] No open sockets for user "${recipient}", sending call:unavailable`);
            ws.send(JSON.stringify({
              type: 'call:unavailable',
              recipient,
              reason: 'User is currently unreachable'
            }));
          }
        } else if (msg.type === 'call:initiate') {
          console.log(`[Pulse WS] Recipient "${recipient}" is OFFLINE (active users: ${Array.from(clients.keys()).join(', ')}), sending call:unavailable`);
          ws.send(JSON.stringify({
            type: 'call:unavailable',
            recipient,
            reason: 'User is currently offline'
          }));
        }
      }
    } catch (e) {
      console.warn('[Pulse WS] Failed to parse message:', e.message);
    }
  });

  ws.on('close', () => {
    if (authenticatedUser && clients.has(authenticatedUser)) {
      const userSockets = clients.get(authenticatedUser);
      userSockets.delete(ws);
      console.log(`[Pulse WS] Socket closed for user "${authenticatedUser}" (remaining sockets: ${userSockets.size})`);
      if (userSockets.size === 0) {
        clients.delete(authenticatedUser);
        console.log(`[Pulse WS] User "${authenticatedUser}" completely disconnected (total online users: ${clients.size})`);
      }
    }
  });

  ws.on('error', () => {
    if (authenticatedUser && clients.has(authenticatedUser)) {
      clients.get(authenticatedUser).delete(ws);
    }
  });
});

// Periodic heartbeat to terminate dead sockets every 30s
const heartbeatInterval = setInterval(() => {
  wss.clients.forEach((ws) => {
    if (ws.isAlive === false) {
      return ws.terminate();
    }
    ws.isAlive = false;
    ws.ping();
  });
}, 30000);

wss.on('close', () => {
  clearInterval(heartbeatInterval);
});

server.listen(PORT, () => {
  console.log(`[Pulse WebSocket Server] Running on port ${PORT}`);
});

module.exports = { server, wss, clients };
