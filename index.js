/**
 * Единая точка входа: запуск Xvfb, noVNC, проксирование потоков и интерфейс управления
 * Путь: index.js
 */
const http = require('http');
const express = require('express');
const { Server } = require('socket.io');
const { createProxyMiddleware } = require('http-proxy-middleware');
const { spawn } = require('child_process');
const config = require('./src/config');
const MinecraftBot = require('./src/bot');

// Защита от аварийного падения контейнера при ECONNREFUSED и сетевых сбоях
process.on('uncaughtException', (err) => {
  console.error('[Process UncaughtException]', err.message);
});

process.on('unhandledRejection', (reason) => {
  console.error('[Process UnhandledRejection]', reason?.message || reason);
});

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });

function startVirtualDisplayAndVNC() {
  console.log('[System] Запуск виртуального дисплея Xvfb :99...');
  const xvfb = spawn('Xvfb', [':99', '-screen', '0', '1024x768x16', '-nolisten', 'tcp']);
  xvfb.on('error', (e) => console.error('[Xvfb Error]', e.message));

  setTimeout(() => {
    console.log('[System] Запуск X11VNC сервера на порту 5900...');
    const x11vnc = spawn('x11vnc', [
      '-display', ':99',
      '-nopw',
      '-listen', '127.0.0.1',
      '-port', '5900',
      '-forever',
      '-shared',
      '-quiet'
    ]);
    x11vnc.on('error', (e) => console.error('[x11vnc Error]', e.message));

    console.log('[System] Запуск WebSockets noVNC прокси (порт 6080)...');
    const websockify = spawn('websockify', [
      '--web', '/usr/share/novnc',
      '6080',
      '127.0.0.1:5900'
    ]);
    websockify.on('error', (e) => console.error('[websockify Error]', e.message));

    setTimeout(() => {
      console.log('[System] Запуск Chromium на виртуальном экране...');
      const chromium = spawn('chromium', [
        '--no-sandbox',
        '--disable-gpu',
        '--disable-dev-shm-usage',
        '--window-size=1024,768',
        '--start-fullscreen',
        '--app=http://127.0.0.1:3000'
      ], {
        env: { ...process.env, DISPLAY: ':99' }
      });
      chromium.on('error', (e) => console.error('[Chromium Error]', e.message));
    }, 4000);
  }, 1500);
}

startVirtualDisplayAndVNC();

// Проксируем noVNC
app.use('/novnc', createProxyMiddleware({
  target: 'http://127.0.0.1:6080',
  ws: true,
  changeOrigin: true,
  pathRewrite: { '^/novnc': '' }
}));

// Проксируем 3D Prismarine-Viewer
app.use('/viewer', createProxyMiddleware({
  target: 'http://127.0.0.1:3000',
  ws: true,
  changeOrigin: true,
  pathRewrite: { '^/viewer': '' }
}));

// Раздача статики веб-панели
app.use(express.static(__dirname + '/public'));
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/public/index.html');
});

const botInstance = new MinecraftBot(io);

io.on('connection', (socket) => {
  botInstance.logs.forEach(l => socket.emit('log', l));
  botInstance.broadcastState();

  socket.on('control_move', ({ key, active }) => {
    botInstance.handleControlState(key, active);
  });

  socket.on('send_command', ({ text }) => {
    if (!text) return;
    if (text.startsWith('/')) {
      botInstance.executeCommand(text);
    } else {
      botInstance.sendChat(text);
    }
  });

  socket.on('set_creative', () => {
    botInstance.executeCommand('/gamemode creative');
  });

  socket.on('reconnect_bot', () => {
    botInstance.start();
  });
});

server.listen(config.web.port, '0.0.0.0', () => {
  console.log(`[Web] Панель управления доступна на порту ${config.web.port}`);
});

botInstance.start();