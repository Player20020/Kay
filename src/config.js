/**
 * Конфигурация подключения бота Kay к серверу
 * Путь: src/config.js
 */

// Автоматический парсинг строки MC_HOST (поддерживает "141.95.47.55:10140" или просто "141.95.47.55")
const rawHost = (process.env.MC_HOST || '141.95.47.55:10140').trim();
let parsedHost = rawHost;
let parsedPort = process.env.MC_PORT ? parseInt(process.env.MC_PORT, 10) : null;

if (rawHost.includes(':')) {
  const [hostPart, portPart] = rawHost.split(':');
  parsedHost = hostPart.trim();
  const extractedPort = parseInt(portPart, 10);
  if (!isNaN(extractedPort)) {
    parsedPort = extractedPort;
  }
}

module.exports = {
  server: {
    host: parsedHost,
    port: parsedPort || 25565,
    username: process.env.MC_USERNAME || 'Kay',
    version: process.env.MC_VERSION || false, // false для автоопределения протокола сервером
    auth: 'offline'
  },

  authPlugin: {
    password: process.env.AUTH_PASSWORD || 'DoubleAI',
    autoCreative: true
  },

  web: {
    port: parseInt(process.env.PORT, 10) || 10000
  },

  activity: {
    intervalMs: 12000,
    reconnectDelayMs: 12000
  }
};
