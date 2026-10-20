# Minecraft Kay Bot (Render Web Service)

AFK-бот для сервера Minecraft с веб-панелью управления, видеопотоком через noVNC (Xvfb) и 3D Prismarine-Viewer.

### Структура проекта
* `Dockerfile` — окружение Debian с Xvfb, x11vnc, noVNC и Chromium.
* `index.js` — точка входа, веб-сервер Express, прокси для стримов и супервизор процессов.
* `src/config.js` — конфигурация и автопарсинг `MC_HOST` (IP:PORT).
* `src/bot.js` — движок Mineflayer и Prismarine-Viewer.
* `src/auth.js` — автоматическая авторизация и креатив.
* `src/activity.js` — цикл поддержания онлайна и действий.
* `public/index.html` — гибридный веб-интерфейс стрима и управления.