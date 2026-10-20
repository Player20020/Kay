FROM node:20-bookworm-slim

# Системные зависимости для Xvfb, VNC, Chromium и компиляции node-canvas
RUN apt-get update && apt-get install -y --no-install-recommends \
    xvfb \
    x11vnc \
    novnc \
    websockify \
    chromium \
    net-tools \
    procps \
    ca-certificates \
    build-essential \
    python3 \
    libcairo2-dev \
    libpango1.0-dev \
    libjpeg-dev \
    libgif-dev \
    librsvg2-dev \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Копируем манифест зависимостей
COPY package.json ./

# Устанавливаем Node.js библиотеки и компилируем нативные модули
RUN npm install --production

# Копируем исходный код проекта
COPY . .

# Порт веб-приложения Hugging Face
ENV PORT=7860
EXPOSE 7860

# Запуск единой точки входа
CMD ["node", "index.js"]