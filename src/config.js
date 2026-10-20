/**
 * Конфигурация бота Kay
 * Путь: src/config.js
 */
module.exports = {
  // Настройки подключения к серверу Minecraft
  server: {
    host: process.env.MC_HOST || '141.95.47.55',
    port: parseInt(process.env.MC_PORT, 10) || 10140,
    username: process.env.MC_USERNAME || 'Kay',
    version: process.env.MC_VERSION || false, // false включает автоопределение версии сервером, либо явная строка '1.21.11'
    auth: 'offline'
  },

  // Данные авторизации (пароль берется из Secret окружения AUTH_PASSWORD)
  authPlugin: {
    password: process.env.AUTH_PASSWORD || 'DoubleAI',
    autoCreative: true // Автоматически включать режим креатива (/gamemode creative)
  },

  // Настройки веб-интерфейса Hugging Face Spaces
  web: {
    port: parseInt(process.env.PORT, 10) || 7860
  },

  // Интервалы активности в AFK режиме
  activity: {
    intervalMs: 12000,
    reconnectDelayMs: 12000
  }
};