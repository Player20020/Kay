/**
 * Логика подключения Mineflayer и Prismarine-Viewer
 * Путь: src/bot.js
 */
const mineflayer = require('mineflayer');
const { mineflayer: viewer } = require('prismarine-viewer');
const config = require('./config');
const ActivityManager = require('./activity');
const AuthManager = require('./auth');

class MinecraftBot {
  constructor(io = null) {
    this.io = io;
    this.bot = null;
    this.activity = null;
    this.auth = null;
    this.logs = [];
    this.isReconnecting = false;
    this.viewerStarted = false;
  }

  log(msg) {
    const time = new Date().toLocaleTimeString('ru-RU');
    const entry = `[${time}] ${msg}`;
    console.log(entry);
    this.logs.push(entry);
    if (this.logs.length > 100) this.logs.shift();
    if (this.io) this.io.emit('log', entry);
  }

  broadcastState() {
    if (!this.io) return;
    const isOnline = !!(this.bot && this.bot.entity);
    this.io.emit('bot_state', {
      status: isOnline ? 'online' : (this.isReconnecting ? 'reconnecting' : 'offline'),
      username: this.bot?.username || config.server.username,
      host: `${config.server.host}:${config.server.port}`,
      position: this.bot?.entity?.position ? {
        x: this.bot.entity.position.x.toFixed(1),
        y: this.bot.entity.position.y.toFixed(1),
        z: this.bot.entity.position.z.toFixed(1)
      } : null,
      health: this.bot?.health ?? 20,
      food: this.bot?.food ?? 20,
      gameMode: this.bot?.game?.gameMode || 'unknown'
    });
  }

  start() {
    if (this.bot) {
      try { this.bot.quit(); } catch (_) {}
      this.bot = null;
    }

    this.log(`Подключение к ${config.server.host}:${config.server.port} (ник: ${config.server.username})...`);
    this.isReconnecting = false;

    const botOptions = {
      host: config.server.host,
      port: config.server.port,
      username: config.server.username,
      auth: config.server.auth,
      checkTimeoutInterval: 60000
    };

    if (config.server.version) {
      botOptions.version = config.server.version;
    }

    try {
      this.bot = mineflayer.createBot(botOptions);
    } catch (err) {
      this.log(`❌ Ошибка создания бота: ${err.message}`);
      this.scheduleReconnect();
      return;
    }

    this.activity = new ActivityManager(this.bot);
    this.auth = new AuthManager(this.bot, config);

    // Безопасный перехват внутренних ошибок сокета
    if (this.bot._client) {
      this.bot._client.on('error', (err) => {
        this.log(`❌ Ошибка сокета: ${err.message}`);
      });
    }

    this.bot.once('spawn', () => {
      this.log(`✅ ${this.bot.username} успешно появился в мире!`);
      this.auth.handleSpawn();
      this.activity.start(config.activity.intervalMs);
      this.broadcastState();

      // Запуск локального 3D Prismarine-Viewer на порту 3000
      if (!this.viewerStarted) {
        try {
          viewer(this.bot, { port: 3000, firstPerson: true });
          this.viewerStarted = true;
          this.log('[Viewer] 3D-рендер запущен на локальном порту 3000');
        } catch (vErr) {
          this.log(`[Viewer Error] ${vErr.message}`);
        }
      }
    });

    this.bot.on('chat', (username, message) => {
      if (username === this.bot.username) return;
      this.log(`[Чат] <${username}> ${message}`);
    });

    this.bot.on('messagestr', (message) => {
      this.log(`[Сервер] ${message}`);
      if (this.auth) this.auth.handleChatMessage(message);
    });

    this.bot.on('health', () => this.broadcastState());

    this.bot.on('error', (err) => {
      this.log(`❌ Ошибка протокола: ${err.message}`);
    });

    this.bot.on('end', (reason) => {
      this.log(`🔌 Соединение закрыто (${reason || 'неизвестно'}). Реконнект...`);
      if (this.activity) this.activity.stop();
      this.broadcastState();
      this.scheduleReconnect();
    });

    this.bot.on('kicked', (reason) => {
      this.log(`⚠️ Кикнут с сервера: ${JSON.stringify(reason)}`);
    });
  }

  scheduleReconnect() {
    if (this.isReconnecting) return;
    this.isReconnecting = true;
    const delay = config.activity.reconnectDelayMs || 12000;
    this.log(`Повторный вход через ${delay / 1000} сек...`);
    setTimeout(() => {
      this.start();
    }, delay);
  }

  handleControlState(control, state) {
    if (!this.bot) return;
    try {
      this.bot.setControlState(control, state);
      if (this.activity) this.activity.pauseManual();
    } catch (_) {}
  }

  sendChat(text) {
    if (!this.bot) return;
    this.bot.chat(text);
  }

  executeCommand(command) {
    if (!this.bot) return;
    this.bot.chat(command.startsWith('/') ? command : `/${command}`);
  }
}

module.exports = MinecraftBot;