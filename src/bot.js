/**
 * Движок бота Kay с защитой от сбоев подключения
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
    this.activityManager = null;
    this.authManager = null;
    this.reconnectTimer = null;
    this.isReconnecting = false;
    this.isStarting = false;
    this.status = 'offline';
    this.worldReady = false;
    this.logs = [];
    this.viewerStarted = false;
  }

  log(msg) {
    const time = new Date().toLocaleTimeString();
    const formatted = `[${time}] ${msg}`;
    console.log(formatted);
    this.logs.push(formatted);
    if (this.logs.length > 150) this.logs.shift();
    if (this.io) {
      this.io.emit('log', formatted);
    }
  }

  destroyCurrentBot() {
    if (this.activityManager) {
      this.activityManager.stop();
    }

    if (this.bot) {
      try {
        if (this.bot.viewer) {
          this.bot.viewer.close();
        }
        this.bot.removeAllListeners();
        if (this.bot._client) {
          this.bot._client.removeAllListeners();
        }
        this.bot.quit();
      } catch (e) {
        // Безопасная очистка
      }
      this.bot = null;
    }
    this.worldReady = false;
    this.viewerStarted = false;
  }

  start() {
    if (this.isStarting) return;
    this.isStarting = true;

    this.destroyCurrentBot();

    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    this.status = 'connecting';
    this.broadcastState();
    this.log(`Подключение к ${config.server.host}:${config.server.port} (ник: ${config.server.username})...`);

    try {
      this.bot = mineflayer.createBot({
        host: config.server.host,
        port: config.server.port,
        username: config.server.username,
        version: config.server.version || false,
        auth: config.server.auth,
        checkTimeoutInterval: 60000,
        physicsEnabled: false
      });

      // Перехватываем ошибки на уровне сырого сокета minecraft-protocol
      if (this.bot._client) {
        this.bot._client.on('error', (err) => {
          this.log(`❌ Ошибка протокола: ${err.message}`);
          this.scheduleReconnect(12000);
        });
      }
    } catch (e) {
      this.log(`Ошибка создания клиента: ${e.message}`);
      this.isStarting = false;
      this.scheduleReconnect(12000);
      return;
    }

    this.activityManager = new ActivityManager(this.bot);
    this.authManager = new AuthManager(this.bot, config);

    this.registerEvents();
    this.isStarting = false;
  }

  registerEvents() {
    if (!this.bot) return;

    this.bot.on('login', () => {
      this.log('Сетевое рукопожатие успешно. Ожидание пакетов мира...');
      if (this.bot) this.bot.physicsEnabled = false;
    });

    this.bot.on('spawn', () => {
      this.status = 'online';
      this.isReconnecting = false;
      this.log('Kay успешно материализовался на сервере!');

      setTimeout(() => {
        if (!this.bot) return;
        this.bot.physicsEnabled = true;
        this.worldReady = true;

        if (!this.viewerStarted) {
          try {
            viewer(this.bot, { port: 3000, firstPerson: true, viewDistance: 6 });
            this.viewerStarted = true;
            this.log('Prismarine-Viewer запущен на порту 3000.');
          } catch (err) {
            this.log(`Предупреждение Viewer: ${err.message}`);
          }
        }

        this.authManager.handleSpawn();
        this.activityManager.start(config.activity.intervalMs);
        this.broadcastState();
      }, 2500);
    });

    this.bot.on('chat', (username, message) => {
      if (username === this.bot.username) return;
      this.log(`💬 <${username}> ${message}`);
    });

    this.bot.on('message', (jsonMsg) => {
      const txt = jsonMsg.toString().trim();
      if (txt) {
        this.log(`📜 ${txt}`);
        this.authManager.handleChatMessage(txt);
      }
    });

    this.bot.on('death', () => {
      this.log('💀 Kay погиб! Возрождение...');
      setTimeout(() => {
        try {
          if (this.bot) this.bot.respawn();
        } catch (err) {
          this.log(`Ошибка возрождения: ${err.message}`);
        }
      }, 2000);
    });

    this.bot.on('kicked', (reason) => {
      this.log(`⚠️ Кикнут: ${typeof reason === 'object' ? JSON.stringify(reason) : reason}`);
    });

    this.bot.on('error', (err) => {
      this.log(`❌ Ошибка сокета: ${err.message}`);
      this.scheduleReconnect(12000);
    });

    this.bot.on('end', () => {
      this.status = 'offline';
      this.worldReady = false;
      this.log('🔌 Соединение закрыто. Подготовка к реконнекту...');
      this.destroyCurrentBot();
      this.broadcastState();
      this.scheduleReconnect(12000);
    });
  }

  scheduleReconnect(delayMs = 12000) {
    if (this.isReconnecting) return;
    this.isReconnecting = true;
    this.status = 'reconnecting';
    this.broadcastState();

    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);

    this.log(`Повторный вход через ${Math.round(delayMs / 1000)} сек...`);
    this.reconnectTimer = setTimeout(() => {
      this.isReconnecting = false;
      this.start();
    }, delayMs);
  }

  broadcastState() {
    if (!this.io) return;
    this.io.emit('bot_state', {
      status: this.status,
      username: config.server.username,
      host: `${config.server.host}:${config.server.port}`,
      health: this.bot?.health || 20,
      food: this.bot?.food || 20,
      gameMode: this.bot?.game?.gameMode || 'creative',
      position: this.bot?.entity?.position ? {
        x: +this.bot.entity.position.x.toFixed(1),
        y: +this.bot.entity.position.y.toFixed(1),
        z: +this.bot.entity.position.z.toFixed(1)
      } : { x: 0, y: 0, z: 0 }
    });
  }

  handleControlState(control, state) {
    if (!this.bot || !this.worldReady) return;
    if (this.activityManager) this.activityManager.pauseManual(10000);

    const allowed = ['forward', 'back', 'left', 'right', 'jump', 'sneak', 'sprint'];
    if (allowed.includes(control)) {
      this.bot.setControlState(control, !!state);
    }
  }

  executeCommand(cmd) {
    if (!this.bot) return;
    if (this.activityManager) this.activityManager.pauseManual(8000);
    const formatted = cmd.trim().startsWith('/') ? cmd.trim() : `/${cmd.trim()}`;
    this.log(`Команда: ${formatted}`);
    this.bot.chat(formatted);
  }

  sendChat(msg) {
    if (!this.bot) return;
    if (this.activityManager) this.activityManager.pauseManual(8000);
    this.log(`В чат: ${msg}`);
    this.bot.chat(msg);
  }
}

module.exports = MinecraftBot;