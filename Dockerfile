# Используем официальный Node.js образ
FROM node:18-slim

# Устанавливаем необходимые системные зависимости для Puppeteer/Chrome
RUN apt-get update && apt-get install -y \
    wget \
    gnupg \
    ca-certificates \
    fonts-liberation \
    libasound2 \
    libatk-bridge2.0-0 \
    libatk1.0-0 \
    libatspi2.0-0 \
    libcups2 \
    libdbus-1-3 \
    libdrm2 \
    libgbm1 \
    libglib2.0-0 \
    libnspr4 \
    libnss3 \
    libpango-1.0-0 \
    libx11-6 \
    libx11-xcb1 \
    libxcb1 \
    libxcomposite1 \
    libxdamage1 \
    libxext6 \
    libxfixes3 \
    libxkbcommon0 \
    libxrandr2 \
    libxshmfence1 \
    libxss1 \
    libxtst6 \
    xdg-utils \
    && rm -rf /var/lib/apt/lists/*

# Создаем рабочую директорию
WORKDIR /app

# Копируем package.json и package-lock.json
COPY package*.json ./

# Устанавливаем зависимости (включая dev для сборки)
RUN npm ci

# Копируем остальные файлы проекта
COPY . .

# Устанавливаем переменные окружения для Puppeteer
# Puppeteer будет использовать свой встроенный Chrome
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=false
ENV DISPLAY=:99

# Открываем порт (Railway будет использовать переменную PORT)
EXPOSE 3001
# Railway автоматически устанавливает PORT, но на случай если не установлен - используем 3001

# Запускаем приложение
CMD ["npm", "start"]

