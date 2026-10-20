# STREAMING_CHUNK:Configuring system dependencies for Xvfb, noVNC, and Chromium...
FROM node:20-bookworm-slim

# Установка системных утилит и графических библиотек для Xvfb, noVNC и компиляции canvas
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

# Устанавливаем зависимости Node.js и компилируем canvas
RUN npm install --production

# Копируем исходный код
COPY . .

# Порт по умолчанию для Render Web Service (10000)
ENV PORT=10000
EXPOSE 10000

# Запуск единой точки входа
CMD ["node", "index.js"]