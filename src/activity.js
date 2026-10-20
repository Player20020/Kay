/**
 * Модуль имитации активности игрока Kay
 * Путь: src/activity.js
 */
class ActivityManager {
  constructor(bot) {
    this.bot = bot;
    this.intervalId = null;
    this.isActive = false;
    this.manualOverrideUntil = 0;
  }

  /**
   * Запуск симуляции с безопасной задержкой
   */
  start(intervalMs = 12000) {
    this.stop();
    setTimeout(() => {
      this.isActive = true;
      this.intervalId = setInterval(() => {
        if (Date.now() < this.manualOverrideUntil) return;
        this.performRandomAction();
      }, intervalMs);
      console.log('[Activity] Цикл поддержания онлайна запущен.');
    }, 3500);
  }

  /**
   * Пауза авто-действий при ручном управлении через веб-панель
   */
  pauseManual(durationMs = 12000) {
    this.manualOverrideUntil = Date.now() + durationMs;
  }

  stop() {
    this.isActive = false;
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
      console.log('[Activity] Цикл активности остановлен.');
    }
  }

  performRandomAction() {
    if (!this.isActive || !this.bot || !this.bot.entity) return;

    if (
      !Number.isFinite(this.bot.entity.position?.x) ||
      !Number.isFinite(this.bot.entity.yaw) ||
      !Number.isFinite(this.bot.entity.pitch)
    ) {
      return;
    }

    const actions = [
      this.safeLook.bind(this),
      this.safeJump.bind(this),
      this.safeSwing.bind(this),
      this.safeSneak.bind(this),
      this.safeStep.bind(this)
    ];

    const chosenAction = actions[Math.floor(Math.random() * actions.length)];
    try {
      chosenAction();
    } catch (err) {
      console.warn('[Activity] Ошибка выполнения действия:', err.message);
    }
  }

  safeLook() {
    if (!this.bot?.entity) return;
    const currentYaw = this.bot.entity.yaw;
    const deltaYaw = (Math.random() - 0.5) * 0.6;
    const newYaw = currentYaw + deltaYaw;
    const newPitch = (Math.random() - 0.5) * 0.4;

    this.bot.look(newYaw, newPitch, true);
    console.log('[Activity] Kay посмотрел по сторонам.');
  }

  safeJump() {
    if (!this.bot?.entity) return;
    this.bot.setControlState('jump', true);
    setTimeout(() => {
      if (this.bot) this.bot.setControlState('jump', false);
    }, 350);
    console.log('[Activity] Kay подпрыгнул.');
  }

  safeSwing() {
    if (!this.bot) return;
    this.bot.swingArm('right');
    console.log('[Activity] Kay взмахнул рукой.');
  }

  safeSneak() {
    if (!this.bot) return;
    this.bot.setControlState('sneak', true);
    setTimeout(() => {
      if (this.bot) this.bot.setControlState('sneak', false);
    }, 900);
    console.log('[Activity] Kay присел.');
  }

  safeStep() {
    if (!this.bot?.entity) return;
    const directions = ['forward', 'back', 'left', 'right'];
    const dir = directions[Math.floor(Math.random() * directions.length)];
    this.bot.setControlState(dir, true);
    setTimeout(() => {
      if (this.bot) this.bot.setControlState(dir, false);
    }, 300);
    console.log(`[Activity] Kay сделал микро-шаг (${dir}).`);
  }
}

module.exports = ActivityManager;
