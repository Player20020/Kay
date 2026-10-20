/**
 * Модуль авторизации и переключения режима игры
 * Путь: src/auth.js
 */
class AuthManager {
  constructor(bot, config) {
    this.bot = bot;
    this.config = config;
    this.isAuthenticated = false;
  }

  handleSpawn() {
    this.isAuthenticated = false;
    setTimeout(() => {
      this.attemptLogin();
    }, 1500);

    if (this.config.authPlugin && this.config.authPlugin.autoCreative) {
      setTimeout(() => {
        this.enableCreative();
      }, 3500);
    }
  }

  enableCreative() {
    console.log('[Auth] Запрос креатива: /gamemode creative');
    if (this.bot) this.bot.chat('/gamemode creative');
  }

  attemptLogin() {
    const password = this.config.authPlugin?.password;
    if (!password) {
      console.warn('[Auth] ПРЕДУПРЕЖДЕНИЕ: Пароль AUTH_PASSWORD не задан!');
      return;
    }
    console.log('[Auth] Отправка /login...');
    if (this.bot) this.bot.chat(`/login ${password}`);
  }

  attemptRegister() {
    const password = this.config.authPlugin?.password;
    if (!password) {
      console.warn('[Auth] ПРЕДУПРЕЖДЕНИЕ: Пароль AUTH_PASSWORD не задан!');
      return;
    }
    console.log('[Auth] Отправка /register...');
    if (this.bot) this.bot.chat(`/register ${password} ${password}`);
  }

  handleChatMessage(messageText) {
    const text = messageText.toLowerCase();

    if (
      text.includes('/register') ||
      text.includes('зарегистрируйтесь') ||
      text.includes('register with')
    ) {
      this.attemptRegister();
      return;
    }

    if (
      text.includes('/login') ||
      text.includes('авторизуйтесь') ||
      text.includes('login with')
    ) {
      this.attemptLogin();
      return;
    }

    if (
      text.includes('успешно') ||
      text.includes('success') ||
      text.includes('logged in')
    ) {
      this.isAuthenticated = true;
      if (this.config.authPlugin?.autoCreative) {
        setTimeout(() => this.enableCreative(), 1000);
      }
    }
  }
}

module.exports = AuthManager;