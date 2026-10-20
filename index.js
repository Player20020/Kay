/**
 * Единая точка входа, супервизор X11/noVNC и веб-сервер
 * Путь: index.js
 */
const { spawn } = require('child_process');
const http = require('http');
const express = require('express');
const { Server } = require('socket.io');
const { createProxyMiddleware } = require('http-proxy-middleware');
const config = require('./src/config');
const MinecraftBot = require('./src/bot');

// Защита от аварийных вылетов при сбоях сокетов или протокола
process.on('uncaughtException', (err) => {
  console.error('[Process UncaughtException]', err.message);
});

process.on('unhandledRejection', (reason) => {
  console.error('[Process UnhandledRejection]', reason?.message || reason);
});

// Запуск виртуального экрана Xvfb
console.log('[System] Запуск виртуального дисплея Xvfb :99...');
const xvfb = spawn('Xvfb', [':99', '-screen', '0', '1280x720x24', '-ac']);
xvfb.on('error', (err) => console.error('[Xvfb Error]', err.message));
process.env.DISPLAY = ':99';

// Задержка перед подъёмом VNC и браузера для стабилизации дисплея
setTimeout(() => {
  console.log('[System] Запуск X11VNC сервера на порту 5900...');
  spawn('x11vnc', ['-display', ':99', '-forever', '-shared', '-nopw', '-rfbport', '5900']);

  console.log('[System] Запуск WebSockets noVNC прокси (порт 6080)...');
  spawn('websockify', ['--web', '/usr/share/novnc', '6080', '127.0.0.1:5900']);

  console.log('[System] Запуск Chromium на виртуальном экране...');
  spawn('chromium', [
    '--no-sandbox',
    '--disable-gpu',
    '--disable-dev-shm-usage',
    '--window-size=1280,720',
    '--start-fullscreen',
    '--autoplay-policy=no-user-gesture-required',
    'http://127.0.0.1:3000'
  ]);
}, 3000);

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });

// Легковесный эндпоинт для cron-job.org
app.get('/ping', (req, res) => {
  res.status(200).send('pong');
});

// Прокси для noVNC видеопотока
app.use('/novnc', createProxyMiddleware({
  target: 'http://127.0.0.1:6080',
  ws: true,
  changeOrigin: true,
  pathRewrite: { '^/novnc': '' }
}));

// Прокси для 3D Prismarine-Viewer
app.use('/viewer', createProxyMiddleware({
  target: 'http://127.0.0.1:3000',
  ws: true,
  changeOrigin: true,
  pathRewrite: { '^/viewer': '' }
}));

// Раздача статики веб-интерфейса
app.use(express.static(__dirname + '/public'));

app.get('/', (req, res) => {
  res.sendFile(__dirname + '/public/index.html');
});

// Инициализация и запуск бота
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

const port = process.env.PORT || config.web.port || 10000;
server.listen(port, '0.0.0.0', () => {
  console.log(`[Web] Панель управления доступна на порту ${port}`);
});

botInstance.start();
