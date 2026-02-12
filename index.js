const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const axios = require('axios');
const express = require('express');
const cors = require('cors');
const fs = require('fs');
const { getLanguageFromPhone, getTranslation, getCountryFromPhone } = require('./phone-utils');
const { askAI } = require('./ai-service');
const { detectLanguageFromText, getLanguageName } = require('./language-detector');
const { translateText } = require('./translate-service');

// URL сервера для сохранения WhatsApp пользователей
const SERVER_URL = process.env.SERVER_URL || 'http://localhost:3000';

// Создаем Express сервер для API
const app = express();
// Railway автоматически устанавливает переменную PORT
const BOT_PORT = process.env.PORT || process.env.BOT_PORT || 3001;

app.use(cors());
app.use(express.json());

// Флаг готовности бота
let botReady = false;

// Безопасная отправка сообщений с обработкой ошибок markedUnread
async function sendMessageSafely(msg, text, client) {
  const chatId = msg.from;
  
  // Функция для проверки, является ли ошибка связанной с markedUnread
  const isMarkedUnreadError = (error) => {
    const errorStr = error.message || error.toString() || '';
    return errorStr.includes('markedUnread') || 
           errorStr.includes('sendSeen') ||
           errorStr.includes('Cannot read properties of undefined');
  };
  
  // Метод 1: Пробуем отправить через chat.sendMessage (не вызывает sendSeen автоматически)
  try {
    const chat = await msg.getChat();
    await chat.sendMessage(text);
    return; // Успешно отправлено
  } catch (chatError) {
    if (!isMarkedUnreadError(chatError)) {
      console.error('❌ Ошибка отправки через chat.sendMessage:', chatError.message);
    }
  }
  
  // Метод 2: Пробуем прямой sendMessage с отключенной отметкой как прочитанное
  try {
    await client.sendMessage(chatId, text, { sendSeen: false });
    return; // Успешно отправлено
  } catch (sendError) {
    if (isMarkedUnreadError(sendError)) {
      console.log('⚠️ Обнаружена ошибка markedUnread при sendMessage, пробую альтернативный метод...');
    } else {
      console.error('❌ Ошибка отправки через sendMessage:', sendError.message);
    }
  }
  
  // Метод 3: Пробуем reply (может работать, если markedUnread уже обработан)
  try {
    await msg.reply(text);
    return; // Успешно отправлено
  } catch (replyError) {
    if (isMarkedUnreadError(replyError)) {
      console.log('⚠️ Обнаружена ошибка markedUnread при reply, пробую последний метод...');
    } else {
      console.error('❌ Ошибка отправки через reply:', replyError.message);
    }
  }
  
  // Метод 4: Последняя попытка - отправка с задержкой (иногда помогает)
  try {
    console.log('⏳ Последняя попытка отправки с задержкой...');
    await new Promise(resolve => setTimeout(resolve, 2000)); // Ждем 2 секунды
    
    // Пробуем через chat.sendMessage еще раз
    const chat = await msg.getChat();
    await chat.sendMessage(text);
    console.log('✅ Сообщение отправлено после задержки');
    return;
  } catch (finalError) {
    // Если все методы не сработали, но ошибка связана с markedUnread - сообщение может быть отправлено
    if (isMarkedUnreadError(finalError)) {
      console.log('⚠️ Ошибка markedUnread, но сообщение может быть отправлено');
      console.log('💡 Это известный баг whatsapp-web.js, сообщение обычно доставляется');
      // Не бросаем ошибку, так как сообщение может быть отправлено
      return;
    } else {
      console.error('❌ Все методы отправки не сработали:', finalError.message);
      throw finalError;
    }
  }
}

// Создание клиента WhatsApp
const client = new Client({
  authStrategy: new LocalAuth({
    dataPath: './.wwebjs_auth',
    clientId: 'whatsapp-bot-client'
  }),
  puppeteer: {
    headless: true,
    args: (() => {
      // Базовые аргументы для всех окружений
      const baseArgs = [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--disable-gpu',
        '--disable-blink-features=AutomationControlled'
      ];
      
      // Дополнительные аргументы только для Docker/Railway (Linux окружение)
      // Проверяем, запущены ли мы в Docker или на Railway
      const isDocker = process.env.DOCKER === 'true' || 
                      process.env.RAILWAY_ENVIRONMENT === 'true' ||
                      (process.platform === 'linux' && fs.existsSync('/.dockerenv'));
      
      if (isDocker) {
        // Для Docker/Railway добавляем дополнительные флаги
        baseArgs.push('--no-zygote');
      }
      
      return baseArgs;
    })()
  },
  // Дополнительные настройки для стабильности
  restartOnAuthFail: true,
  takeoverOnConflict: false,
  takeoverTimeoutMs: 0
});

// Хранилище истории сообщений для каждого пользователя
// Формат: { chatId: [{ sender: 'user'|'assistant', text: string, timestamp: number }] }
const conversationHistory = new Map();

// Хранилище для отслеживания первого сообщения от каждого пользователя
const firstMessageUsers = new Set();

// Хранилище для отслеживания обработанных сообщений (для polling)
const processedMessageIds = new Set();

// Максимальное количество сообщений в истории (чтобы не перегружать контекст)
const MAX_HISTORY_LENGTH = 20;

// Функция для добавления сообщения в историю
function addToHistory(chatId, sender, text) {
  if (!conversationHistory.has(chatId)) {
    conversationHistory.set(chatId, []);
  }
  
  const history = conversationHistory.get(chatId);
  history.push({
    sender: sender,
    text: text,
    timestamp: Date.now()
  });
  
  // Ограничиваем размер истории
  if (history.length > MAX_HISTORY_LENGTH) {
    history.shift(); // Удаляем самое старое сообщение
  }
}

// Функция для получения истории разговора
function getHistory(chatId) {
  return conversationHistory.get(chatId) || [];
}

// Функция для сохранения WhatsApp пользователя в базу данных
async function saveWhatsAppUser(chatId, contact, country, language) {
  try {
    // Очищаем номер телефона от @c.us
    const phoneNumberClean = chatId.replace('@c.us', '').replace('@g.us', '');
    
    // Получаем имя из контакта
    let firstName = '';
    let lastName = '';
    
    if (contact) {
      const pushName = contact.pushname || contact.name || '';
      const nameParts = pushName.split(' ');
      firstName = nameParts[0] || '';
      lastName = nameParts.slice(1).join(' ') || '';
    }

    const languageName = getLanguageName(language);
    const countryInfo = country ? `, страна: ${country}` : '';

    // Отправляем данные на сервер
    await axios.post(`${SERVER_URL}/api/whatsapp/users`, {
      phone_number: chatId,
      phone_number_clean: phoneNumberClean,
      first_name: firstName,
      last_name: lastName,
      country: country || null,
      language: language || 'ru'
    }, {
      timeout: 5000 // 5 секунд таймаут
    });

    console.log(`✅ WhatsApp пользователь сохранен: ${chatId} | Имя: ${firstName} ${lastName} | Язык: ${languageName} (${language})${countryInfo}`);
  } catch (error) {
    // Не критичная ошибка, просто логируем
    console.warn(`⚠️ Не удалось сохранить WhatsApp пользователя ${chatId}:`, error.message);
  }
}

// Хранилище для обработки команд (теперь с поддержкой языков)
const commandHandlers = {
  '/start': async (msg, language, client) => {
    const text = getTranslation(language, 'start');
    await sendMessageSafely(msg, text, client);
  },
  
  '/help': async (msg, language, client) => {
    const text = getTranslation(language, 'help');
    await sendMessageSafely(msg, text, client);
  },
  
  '/status': async (msg, language, client) => {
    try {
      const info = await msg.getChat();
      const statusText = getTranslation(language, 'status');
      await sendMessageSafely(msg, `${statusText}\n\nЧат: ${info.name || info.id.user || msg.from}`, client);
    } catch (error) {
      console.error('Ошибка проверки статуса:', error);
      const statusText = getTranslation(language, 'status');
      await sendMessageSafely(msg, statusText, client);
    }
  },
  
  '/time': async (msg, language, client) => {
    try {
      const now = new Date();
      // Определяем часовой пояс по стране
      const country = getCountryFromPhone(msg.from);
      const timeZone = getTimeZoneByCountry(country);
      
      const timeString = now.toLocaleString(language === 'ru' ? 'ru-RU' : language === 'es' ? 'es-ES' : 'en-US', { 
        timeZone: timeZone,
        dateStyle: 'full',
        timeStyle: 'long'
      });
      
      const timeText = getTranslation(language, 'time');
      const response = `${timeText} ${timeString}`;
      
      // Используем безопасный метод отправки
      await sendMessageSafely(msg, response, client);
    } catch (error) {
      console.error('Ошибка в команде /time:', error);
      throw error;
    }
  },
  
  '/site': async (msg, language, client) => {
    const siteText = getTranslation(language, 'site');
    const siteUrl = 'https://sellyourbrickai.netlify.app/';
    const response = `${siteText}\n\n${siteUrl}`;
    await sendMessageSafely(msg, response, client);
  },
};

// Функция для определения часового пояса по стране
function getTimeZoneByCountry(countryCode) {
  const timeZones = {
    'RU': 'Europe/Moscow',
    'KZ': 'Asia/Almaty',
    'BY': 'Europe/Minsk',
    'UA': 'Europe/Kyiv',
    'ES': 'Europe/Madrid',
    'MX': 'America/Mexico_City',
    'AR': 'America/Argentina/Buenos_Aires',
    'US': 'America/New_York',
    'GB': 'Europe/London',
    'DE': 'Europe/Berlin',
    'FR': 'Europe/Paris',
    'IT': 'Europe/Rome',
    // Добавьте больше по необходимости
  };
  
  return timeZones[countryCode] || 'UTC';
}

// Обработка QR-кода для авторизации
client.on('qr', (qr) => {
  console.log('📱 Отсканируйте QR-код ниже для авторизации:');
  qrcode.generate(qr, { small: true });
});

// Обработка готовности клиента
client.on('ready', async () => {
  console.log('✅ Бот готов к работе!');
  console.log('📱 WhatsApp бот запущен и готов получать сообщения');
  botReady = true;
  // Сбрасываем все счетчики при успешном подключении
  reconnectAttempts = 0;
  isReconnecting = false;
  disconnectCount = 0;
  lastReconnectTime = 0;
  lastDisconnectTime = 0;
  logoutHandled = false;
  if (logoutTimeout) {
    clearTimeout(logoutTimeout);
    logoutTimeout = null;
  }
  
  // Дополнительная проверка состояния
  try {
    const state = await client.getState();
    console.log(`📊 Состояние клиента подтверждено: ${state}`);
    
    // Проверяем, что обработчики сообщений зарегистрированы
    const messageListeners = client.listenerCount('message');
    const messageCreateListeners = client.listenerCount('message_create');
    const totalListeners = messageListeners + messageCreateListeners;
    console.log(`📝 Зарегистрировано обработчиков: message=${messageListeners}, message_create=${messageCreateListeners}, всего=${totalListeners}`);
    
    if (totalListeners === 0) {
      console.warn('⚠️ ВНИМАНИЕ: Обработчики сообщений не зарегистрированы!');
      // Регистрируем обработчики заново
      client.on('message', handleIncomingMessage);
      client.on('message_create', handleIncomingMessage);
      console.log('✅ Обработчики сообщений зарегистрированы заново');
    }
    
    // Тестовая проверка - получаем информацию о себе
    try {
      const info = await client.info;
      console.log(`👤 Информация о клиенте: ${info.wid?.user || 'неизвестно'}`);
    } catch (infoError) {
      console.warn('⚠️ Не удалось получить информацию о клиенте:', infoError.message);
    }
    
    // Тестовая проверка - получаем список чатов (первые 5)
    try {
      const chats = await client.getChats();
      console.log(`💬 Доступно чатов: ${chats.length}`);
      if (chats.length > 0) {
        console.log(`📋 Первые 3 чата: ${chats.slice(0, 3).map(c => c.name || c.id.user || 'без имени').join(', ')}`);
      }
    } catch (chatsError) {
      console.warn('⚠️ Не удалось получить список чатов:', chatsError.message);
    }
    
    console.log('🔍 Диагностика завершена. Бот готов получать сообщения.');
    
    // ВАЖНО: В версии 1.34.4 whatsapp-web.js события message не срабатывают!
    // Используем polling как ОСНОВНОЙ способ получения сообщений
    console.log('⚠️ ВНИМАНИЕ: События message не работают в версии 1.34.4 whatsapp-web.js!');
    console.log('💡 Рекомендация: обновите библиотеку до последней версии:');
    console.log('   npm install whatsapp-web.js@latest');
    console.log('   или откатитесь на стабильную версию:');
    console.log('   npm install whatsapp-web.js@1.23.0');
    console.log('🔄 Включен polling как основной способ получения сообщений (каждые 3 секунды)...');
    
    // Хранилище для последних проверенных сообщений по чатам
    const lastCheckedMessages = new Map();
    
    // Основной polling цикл
    let pollingCounter = 0;
    const pollingInterval = setInterval(async () => {
      if (!botReady) return;
      
      pollingCounter++;
      // Логируем каждые 20 циклов (примерно раз в минуту), что polling работает
      if (pollingCounter % 20 === 0) {
        console.log(`🔄 [POLLING] Проверка сообщений (цикл ${pollingCounter})...`);
      }
      
      try {
        const chats = await client.getChats();
        const personalChats = chats.filter(c => !c.isGroup && !c.isChannel);
        
        // Логируем каждые 20 циклов количество чатов
        if (pollingCounter % 20 === 0) {
          console.log(`📊 [POLLING] Проверяем ${personalChats.length} личных чатов...`);
        }
        
        // Проверяем ВСЕ личные чаты, а не только первые 5
        for (const chat of personalChats) {
          try {
            // Получаем последние 5 сообщений для более надежной проверки
            const messages = await chat.fetchMessages({ limit: 5 });
            
            if (messages.length > 0) {
              // Проверяем все сообщения, начиная с самого нового
              for (const msg of messages) {
                // Пропускаем сообщения от бота
                if (msg.fromMe) continue;
                
                // Получаем ID сообщения
                const msgId = msg.id._serialized || msg.id.id || JSON.stringify(msg.id);
                
                // Проверяем, не обработали ли мы уже это сообщение
                if (!processedMessageIds.has(msgId)) {
                  // Проверяем, не слишком ли старое сообщение (больше 5 минут)
                  // timestamp может быть в секундах или миллисекундах
                  let msgTime = msg.timestamp;
                  if (msgTime < 1000000000000) {
                    // Если timestamp меньше этого числа, значит это секунды, конвертируем в миллисекунды
                    msgTime = msgTime * 1000;
                  }
                  const now = Date.now();
                  const age = now - msgTime;
                  
                  // Обрабатываем только сообщения не старше 5 минут
                  if (age < 300000) { // 5 минут = 300000 мс
                    processedMessageIds.add(msgId);
                    console.log('📨 [POLLING] Найдено новое сообщение через polling:', {
                      from: msg.from,
                      body: msg.body ? (msg.body.length > 50 ? msg.body.substring(0, 50) + '...' : msg.body) : '(нет текста)',
                      age: Math.round(age / 1000) + ' сек назад',
                      id: msgId.substring(0, 20) + '...'
                    });
                    handleIncomingMessage(msg);
                  }
                }
              }
            }
          } catch (msgError) {
            // Игнорируем ошибки получения сообщений из отдельных чатов
          }
        }
      } catch (pollError) {
        console.warn('⚠️ Ошибка polling:', pollError.message);
      }
    }, 3000); // Проверяем каждые 3 секунды для более быстрой реакции
    
    // Сохраняем interval ID для возможной очистки
    if (typeof global.pollingInterval === 'undefined') {
      global.pollingInterval = pollingInterval;
    }
    
    // Дополнительная проверка через 5 секунд - возможно, нужно время на синхронизацию
    setTimeout(async () => {
      try {
        console.log('🔍 Повторная проверка через 5 секунд...');
        const state = await client.getState();
        console.log(`📊 Состояние клиента: ${state}`);
        
        // Пробуем получить последние сообщения
        try {
          const chats = await client.getChats();
          console.log(`💬 Всего чатов: ${chats.length}`);
          
          // Пробуем получить последние сообщения из первого личного чата
          const personalChats = chats.filter(c => !c.isGroup && !c.isChannel);
          if (personalChats.length > 0) {
            const testChat = personalChats[0];
            try {
              const messages = await testChat.fetchMessages({ limit: 1 });
              console.log(`📨 Тест: последнее сообщение в чате "${testChat.name || testChat.id.user}" получено успешно`);
            } catch (msgError) {
              console.warn(`⚠️ Не удалось получить сообщения из тестового чата:`, msgError.message);
            }
          }
        } catch (chatsError) {
          console.warn('⚠️ Ошибка при повторной проверке чатов:', chatsError.message);
        }
        
        console.log('✅ Повторная проверка завершена');
      } catch (checkError) {
        console.warn('⚠️ Ошибка при повторной проверке:', checkError.message);
      }
    }, 5000);
  } catch (error) {
    console.warn('⚠️ Не удалось подтвердить состояние клиента:', error.message);
  }
});

// Обработка изменения состояния клиента
client.on('change_state', async (state) => {
  console.log(`🔄 Изменение состояния клиента: ${state}`);
  
  if (state === 'CONNECTED' && !botReady) {
    console.log('✅ Бот готов к работе! (определено через change_state)');
    console.log('📱 WhatsApp бот запущен и готов получать сообщения');
    botReady = true;
    // Сбрасываем все счетчики при успешном подключении
    reconnectAttempts = 0;
    isReconnecting = false;
    disconnectCount = 0;
    lastReconnectTime = 0;
    lastDisconnectTime = 0;
    logoutHandled = false;
    if (logoutTimeout) {
      clearTimeout(logoutTimeout);
      logoutTimeout = null;
    }
  } else if (state === 'DISCONNECTED' || state === 'UNPAIRED' || state === 'UNLAUNCHED') {
    botReady = false;
    console.log('⚠️ Бот не готов к работе (состояние: ' + state + ')');
  }
});

// Обработка авторизации
client.on('authenticated', async () => {
  console.log('✅ Авторизация успешна!');
  
  // Проверяем состояние клиента после авторизации
  try {
    // Небольшая задержка для завершения инициализации
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    const state = await client.getState();
    console.log(`📊 Текущее состояние клиента: ${state}`);
    
    if (state === 'CONNECTED') {
      console.log('✅ Бот готов к работе!');
      console.log('📱 WhatsApp бот запущен и готов получать сообщения');
      botReady = true;
      // Сбрасываем все счетчики при успешном подключении
      reconnectAttempts = 0;
      isReconnecting = false;
      disconnectCount = 0;
      lastReconnectTime = 0;
      lastDisconnectTime = 0;
      logoutHandled = false;
      if (logoutTimeout) {
        clearTimeout(logoutTimeout);
        logoutTimeout = null;
      }
    }
  } catch (error) {
    console.warn('⚠️ Не удалось проверить состояние клиента:', error.message);
  }
});

// Обработка ошибок авторизации
client.on('auth_failure', (msg) => {
  console.error('❌ Ошибка авторизации:', msg);
  console.log('💡 Попробуйте:');
  console.log('   1. Удалить папку .wwebjs_auth');
  console.log('   2. Перезапустить бота');
  console.log('   3. Отсканировать QR-код заново');
});

// Флаги и счетчики для управления переподключениями
let isReconnecting = false;
let reconnectAttempts = 0;
const MAX_RECONNECT_ATTEMPTS = 5;
let lastReconnectTime = 0;
const MIN_RECONNECT_INTERVAL = 60000; // Минимум 60 секунд между переподключениями
let lastDisconnectTime = 0;
let disconnectCount = 0;
const MAX_DISCONNECTS_PER_MINUTE = 3; // Максимум 3 отключения в минуту
let logoutHandled = false; // Флаг для предотвращения множественной обработки LOGOUT
let logoutTimeout = null; // Таймер для обработки LOGOUT

// Функция переподключения
async function reconnectClient() {
  if (isReconnecting) {
    console.log('⚠️ Переподключение уже выполняется, пропускаем...');
    return;
  }

  // Проверяем минимальный интервал
  const now = Date.now();
  const timeSinceLastReconnect = now - lastReconnectTime;
  if (timeSinceLastReconnect < MIN_RECONNECT_INTERVAL) {
    const waitTime = Math.ceil((MIN_RECONNECT_INTERVAL - timeSinceLastReconnect) / 1000);
    console.log(`⏳ Слишком рано для переподключения. Ждем ${waitTime} секунд...`);
    setTimeout(() => {
      reconnectClient();
    }, MIN_RECONNECT_INTERVAL - timeSinceLastReconnect);
    return;
  }

  isReconnecting = true;
  reconnectAttempts++;
  lastReconnectTime = Date.now();

  if (reconnectAttempts > MAX_RECONNECT_ATTEMPTS) {
    console.error('❌ Превышено максимальное количество попыток переподключения');
    console.log('💡 Попробуйте перезапустить бота вручную');
    console.log('💡 Это поможет избежать частых переподключений, которые могут вызвать LOGOUT');
    isReconnecting = false;
    return;
  }

  // Экспоненциальная задержка: 10, 20, 40, 80, 160 секунд
  const delay = Math.min(10000 * Math.pow(2, reconnectAttempts - 1), 160000);
  console.log(`🔄 Попытка переподключения ${reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS}...`);
  console.log(`⏳ Задержка перед переподключением: ${delay / 1000} секунд`);
  
  await new Promise(resolve => setTimeout(resolve, delay));
  
  try {
    // Проверяем, не инициализирован ли уже клиент
    try {
      const state = await client.getState();
      if (state === 'CONNECTED' || state === 'OPENING') {
        console.log('✅ Клиент уже подключен или подключается, отменяем переподключение');
        isReconnecting = false;
        reconnectAttempts = 0;
        return;
      }
    } catch (stateError) {
      // Игнорируем ошибки проверки состояния
    }
    
    // Пытаемся безопасно закрыть клиент
    try {
      await client.destroy();
      console.log('✅ Клиент успешно закрыт');
      // Ждем освобождения ресурсов
      await new Promise(resolve => setTimeout(resolve, 5000));
    } catch (destroyError) {
      // Игнорируем ошибки при destroy (файлы могут быть заблокированы)
      console.log('⚠️ Предупреждение при закрытии клиента (можно игнорировать):', destroyError.message);
      // Все равно ждем немного
      await new Promise(resolve => setTimeout(resolve, 5000));
    }
    
    console.log('🔄 Инициализация клиента заново...');
    await client.initialize();
    
    isReconnecting = false;
    reconnectAttempts = 0; // Сбрасываем счетчик при успешном подключении
    disconnectCount = 0; // Сбрасываем счетчик отключений
  } catch (error) {
    console.error('❌ Ошибка переподключения:', error.message);
    isReconnecting = false;
    
    // Экспоненциальная задержка перед следующей попыткой
    const retryDelay = Math.min(15000 * Math.pow(2, reconnectAttempts - 1), 300000);
    console.log(`⏳ Повторная попытка через ${retryDelay / 1000} секунд...`);
    setTimeout(() => {
      reconnectClient();
    }, retryDelay);
  }
}

// Обработка отключения
client.on('disconnected', (reason) => {
  const now = Date.now();
  console.log('⚠️ Бот отключен:', reason);
  
  // Проверяем частоту отключений
  if (now - lastDisconnectTime < 60000) {
    disconnectCount++;
  } else {
    disconnectCount = 1;
  }
  lastDisconnectTime = now;
  
  // Если слишком много отключений за короткое время - не переподключаемся автоматически
  if (disconnectCount > MAX_DISCONNECTS_PER_MINUTE) {
    console.error('❌ Слишком много отключений за короткое время!');
    console.log('💡 Автоматическое переподключение отключено для предотвращения LOGOUT');
    console.log('💡 Рекомендуется:');
    console.log('   1. Подождать несколько минут');
    console.log('   2. Проверить интернет-соединение');
    console.log('   3. Перезапустить бота вручную');
    return;
  }
  
  // Проверяем минимальный интервал между переподключениями
  const timeSinceLastReconnect = now - lastReconnectTime;
  if (timeSinceLastReconnect < MIN_RECONNECT_INTERVAL) {
    const waitTime = Math.ceil((MIN_RECONNECT_INTERVAL - timeSinceLastReconnect) / 1000);
    console.log(`⏳ Слишком рано для переподключения. Ждем ${waitTime} секунд...`);
    setTimeout(() => {
      handleDisconnect(reason);
    }, MIN_RECONNECT_INTERVAL - timeSinceLastReconnect);
    return;
  }
  
  handleDisconnect(reason);
});

// Функция обработки отключения
function handleDisconnect(reason) {
  if (reason === 'LOGOUT') {
    // Предотвращаем множественную обработку LOGOUT
    if (logoutHandled) {
      console.log('⚠️ LOGOUT уже обрабатывается, пропускаем...');
      return;
    }
    
    logoutHandled = true;
    console.log('⚠️ Обнаружен LOGOUT - требуется повторная авторизация');
    console.log('💡 Если это происходит часто, возможно:');
    console.log('   - WhatsApp разлогинивает из-за подозрительной активности');
    console.log('   - Проблемы с сохранением сессии');
    console.log('   - Нужно удалить папку .wwebjs_auth и авторизоваться заново');
    
    // При LOGOUT не пытаемся автоматически переподключаться
    console.log('⏳ При LOGOUT автоматическое переподключение отключено');
    console.log('💡 Рекомендуется:');
    console.log('   1. Подождать 1-2 минуты');
    console.log('   2. Перезапустить бота вручную (Ctrl+C, затем npm start)');
    console.log('   3. Или удалить папку .wwebjs_auth и авторизоваться заново');
    
    // Очищаем таймеры переподключения
    if (logoutTimeout) {
      clearTimeout(logoutTimeout);
    }
    
    // Пробуем переинициализировать через 2 минуты (только один раз)
    logoutTimeout = setTimeout(() => {
      console.log('🔄 Попытка переинициализации после LOGOUT...');
      reconnectClientAfterLogout();
    }, 120000); // Ждем 2 минуты
  } else {
    // Для других причин отключения пытаемся переподключиться с задержкой
    console.log('🔄 Пытаемся переподключиться через 15 секунд...');
    setTimeout(() => {
      reconnectClient();
    }, 15000);
  }
}

// Специальная функция для переподключения после LOGOUT
async function reconnectClientAfterLogout() {
  if (isReconnecting) {
    console.log('⚠️ Переподключение уже выполняется, пропускаем...');
    return;
  }

  isReconnecting = true;
  reconnectAttempts++;
  lastReconnectTime = Date.now();

  if (reconnectAttempts > 2) {
    // После LOGOUT делаем максимум 2 попытки
    console.error('❌ Превышено максимальное количество попыток переподключения после LOGOUT');
    console.log('💡 Рекомендуется:');
    console.log('   1. Остановить бота (Ctrl+C)');
    console.log('   2. Подождать 5-10 минут');
    console.log('   3. Удалить папку .wwebjs_auth');
    console.log('   4. Запустить бота заново: npm start');
    isReconnecting = false;
    logoutHandled = false; // Разблокируем для следующего LOGOUT
    return;
  }

  console.log(`🔄 Попытка переподключения после LOGOUT ${reconnectAttempts}/2...`);
  console.log('⏳ Ожидание освобождения ресурсов (30 секунд)...');
  
  // Ждем достаточно долго, чтобы файлы освободились
  await new Promise(resolve => setTimeout(resolve, 30000));
  
  try {
    // Проверяем состояние клиента
    try {
      const state = await client.getState();
      if (state === 'CONNECTED' || state === 'OPENING') {
        console.log('✅ Клиент уже подключен или подключается');
        isReconnecting = false;
        reconnectAttempts = 0;
        logoutHandled = false;
        return;
      }
    } catch (stateError) {
      // Игнорируем ошибки проверки состояния
    }
    
    // Пытаемся безопасно закрыть клиент, но игнорируем ошибки
    try {
      await client.destroy();
      console.log('✅ Клиент закрыт');
      await new Promise(resolve => setTimeout(resolve, 10000)); // Ждем еще 10 секунд
    } catch (destroyError) {
      // Игнорируем ошибки при destroy
      console.log('⚠️ Предупреждение при закрытии (можно игнорировать)');
      await new Promise(resolve => setTimeout(resolve, 10000));
    }
    
    console.log('🔄 Переинициализация клиента...');
    // При LOGOUT просто переинициализируем - библиотека сама обработает сессию
    await client.initialize();
    
    isReconnecting = false;
    reconnectAttempts = 0;
    disconnectCount = 0;
    logoutHandled = false; // Разблокируем для следующего LOGOUT
  } catch (error) {
    console.error('❌ Ошибка переподключения:', error.message);
    
    // Если ошибка связана с заблокированными файлами - прекращаем попытки
    if (error.message.includes('EBUSY') || error.message.includes('locked') || 
        error.message.includes('ENOENT') || error.stack?.includes('LocalAuth')) {
      console.log('💡 Обнаружена проблема с файлами сессии');
      console.log('💡 Рекомендуется:');
      console.log('   1. Остановить бота (Ctrl+C)');
      console.log('   2. Подождать 1-2 минуты');
      console.log('   3. Удалить папку .wwebjs_auth');
      console.log('   4. Запустить бота заново: npm start');
      isReconnecting = false;
      logoutHandled = false;
      return;
    }
    
    isReconnecting = false;
    logoutHandled = false;
    
    // Больше не пытаемся автоматически - просим пользователя перезапустить
    console.log('💡 Автоматическое переподключение после LOGOUT не удалось');
    console.log('💡 Пожалуйста, перезапустите бота вручную');
  }
}

// Функция обработки сообщения (вынесена для переиспользования)
async function handleIncomingMessage(msg) {
  // Логируем ВСЕ входящие сообщения для отладки
  console.log('📨 [DEBUG] Получено событие message:', {
    from: msg.from,
    fromMe: msg.fromMe,
    body: msg.body ? (msg.body.length > 50 ? msg.body.substring(0, 50) + '...' : msg.body) : '(нет текста)',
    type: msg.type,
    hasMedia: !!msg.hasMedia,
    timestamp: new Date().toISOString()
  });
  
  try {
    // Проверяем, готов ли бот к работе
    if (!botReady) {
      console.log('⚠️ [DEBUG] botReady = false, проверяем состояние клиента...');
      try {
        const state = await client.getState();
        console.log(`📊 [DEBUG] Состояние клиента: ${state}`);
        if (state === 'CONNECTED') {
          console.log('✅ Бот готов к работе! (определено при получении сообщения)');
          botReady = true;
        } else {
          console.warn(`⚠️ Бот не готов к работе (состояние: ${state}), пропускаем сообщение`);
          return;
        }
      } catch (stateError) {
        console.warn('⚠️ Не удалось проверить состояние клиента:', stateError.message);
        // Продолжаем обработку, так как это может быть временная проблема
      }
    }
    
    // Пропускаем сообщения от самого бота
    if (msg.fromMe) {
      console.log('⏭️ [DEBUG] Пропущено сообщение от самого бота');
      return;
    }

    // Пропускаем статусы и broadcast сообщения
    if (msg.from === 'status@broadcast' || msg.from.includes('@broadcast')) {
      console.log('⏭️ [DEBUG] Пропущено broadcast сообщение');
      return;
    }

    // Получаем информацию о чате для проверки типа
    let chat;
    try {
      chat = await msg.getChat();
      console.log('💬 [DEBUG] Информация о чате:', {
        id: chat.id._serialized || chat.id,
        isGroup: chat.isGroup,
        isChannel: chat.isChannel,
        name: chat.name || '(без имени)'
      });
    } catch (chatError) {
      console.error('❌ Ошибка получения информации о чате:', chatError);
      console.error('❌ [DEBUG] Детали ошибки:', {
        message: chatError.message,
        stack: chatError.stack
      });
      return;
    }

    // Пропускаем сообщения из групп
    if (chat.isGroup) {
      console.log(`⚠️ Пропущено сообщение из группы: ${chat.name || chat.id.user}`);
      return;
    }

    // Пропускаем сообщения из каналов
    if (chat.isChannel) {
      console.log(`⚠️ Пропущено сообщение из канала: ${chat.name || chat.id.user}`);
      return;
    }

    // Пропускаем сообщения без текста или с пустым телом
    if (!msg.body || !msg.body.trim()) {
      console.log('⏭️ [DEBUG] Пропущено сообщение без текста');
      return;
    }
    
    console.log('✅ [DEBUG] Сообщение прошло все проверки, начинаем обработку...');

    const messageText = msg.body.trim();
    const chatId = msg.from;
    
    // Проверяем, это первое сообщение от пользователя?
    const isFirstMessage = !firstMessageUsers.has(chatId);
    
    // Определяем язык пользователя
    let userLanguage;
    if (isFirstMessage) {
      // Для первого сообщения определяем язык из текста
      userLanguage = detectLanguageFromText(messageText);
      const languageName = getLanguageName(userLanguage);
      console.log(`🌍 Первое сообщение от ${chatId} - определен язык из текста: ${languageName} (${userLanguage})`);
      firstMessageUsers.add(chatId);
    } else {
      // Для последующих сообщений используем язык по номеру телефона
      userLanguage = getLanguageFromPhone(chatId);
    }
    
    const userCountry = getCountryFromPhone(chatId);
    
    // Получаем информацию о контакте для сохранения имени
    let contact = null;
    try {
      contact = await msg.getContact();
    } catch (contactError) {
      console.warn('⚠️ Не удалось получить информацию о контакте:', contactError.message);
    }
    
    // Сохраняем пользователя в базу данных (асинхронно, не блокируем обработку сообщения)
    // Для первого сообщения сохраняем язык, определенный из текста
    // Важно: сохраняем язык сразу, чтобы он не потерялся
    if (isFirstMessage) {
      saveWhatsAppUser(chatId, contact, userCountry, userLanguage).catch(err => {
        // Ошибка уже обработана в функции
      });
    }
    
    const languageName = getLanguageName(userLanguage);
    console.log(`📨 Получено сообщение от ${chatId} (${userCountry || 'неизвестно'}, язык: ${languageName} [${userLanguage}]): ${messageText}`);

    // Проверяем, является ли сообщение командой
    const trimmedMessage = messageText.toLowerCase();
    
    if (commandHandlers[trimmedMessage]) {
      // Выполняем команду с учетом языка пользователя
      console.log(`⚡ Выполнение команды: ${trimmedMessage} (язык: ${userLanguage})`);
      await commandHandlers[trimmedMessage](msg, userLanguage, client);
      console.log(`✅ Команда ${trimmedMessage} выполнена успешно`);
    } else {
      // Добавляем сообщение пользователя в историю
      addToHistory(chatId, 'user', messageText);
      
      // Получаем ответ от AI
      console.log(`🤖 Запрос к AI помощнику для ${chatId} (язык: ${userLanguage})`);
      try {
        const history = getHistory(chatId);
        const aiResponse = await askAI(history, userLanguage);
        
        // Добавляем ответ AI в историю
        addToHistory(chatId, 'assistant', aiResponse);
        
        // Отправляем ответ пользователю
        console.log(`📤 Отправка ответа от AI на ${chatId}`);
        await sendMessageSafely(msg, aiResponse, client);
        console.log(`✅ Ответ от AI отправлен успешно`);
      } catch (aiError) {
        console.error('❌ Ошибка при запросе к AI:', aiError);
        // В случае ошибки отправляем сообщение об ошибке
        const errorText = getTranslation(userLanguage, 'error');
        await sendMessageSafely(msg, errorText, client);
      }
    }
  } catch (error) {
    console.error('❌ Ошибка обработки сообщения:', error);
    console.error('Детали ошибки:', error.message);
    console.error('Стек ошибки:', error.stack);
    
    // Не пытаемся отправлять ответ об ошибке, чтобы избежать зацикливания
  }
}

// Обработка входящих сообщений - регистрируем на случай, если события заработают
// НО: основная обработка идет через polling, так как события не работают в версии 1.34.4
console.log('📝 Регистрация обработчиков сообщений (на случай, если события заработают)...');
client.on('message', (msg) => {
  console.log('🔔 [EVENT] Событие "message" получено! (это редкость в версии 1.34.4)');
  const msgId = msg.id._serialized || msg.id.id || JSON.stringify(msg.id);
  if (!processedMessageIds.has(msgId)) {
    processedMessageIds.add(msgId);
    handleIncomingMessage(msg);
  }
});
client.on('message_create', (msg) => {
  console.log('🔔 [EVENT] Событие "message_create" получено! (это редкость в версии 1.34.4)');
  const msgId = msg.id._serialized || msg.id.id || JSON.stringify(msg.id);
  if (!processedMessageIds.has(msgId)) {
    processedMessageIds.add(msgId);
    handleIncomingMessage(msg);
  }
});
console.log('✅ Обработчики сообщений зарегистрированы (но основная работа через polling)');

// Обработка ошибок
client.on('error', (error) => {
  console.error('❌ Ошибка клиента:', error);
});

// Диагностика: логируем все события клиента для отладки
const debugEvents = ['loading_screen', 'qr', 'authenticated', 'auth_failure', 'ready', 'disconnected', 'change_state', 'message', 'message_create', 'message_ack', 'message_revoke_everyone', 'message_revoke_me'];
debugEvents.forEach(eventName => {
  client.on(eventName, (...args) => {
    if (eventName !== 'message' && eventName !== 'message_create') {
      console.log(`🔔 [EVENT DEBUG] Событие "${eventName}" вызвано`, args.length > 0 ? (typeof args[0] === 'object' ? JSON.stringify(args[0]).substring(0, 100) : args[0]) : '');
    }
  });
});

// ========== API ENDPOINTS ==========

/**
 * GET / - Healthcheck endpoint для Railway
 */
app.get('/', (req, res) => {
  res.json({
    success: true,
    service: 'WhatsApp Bot',
    ready: botReady,
    message: botReady 
      ? 'Бот готов к работе' 
      : 'Бот еще не готов. Дождитесь авторизации.'
  });
});

/**
 * GET /api/status - Проверка статуса бота
 */
app.get('/api/status', (req, res) => {
  res.json({
    success: true,
    ready: botReady,
    message: botReady 
      ? 'Бот готов к работе' 
      : 'Бот еще не готов. Дождитесь авторизации.'
  });
});

/**
 * POST /api/broadcast - Рассылка сообщений
 */
app.post('/api/broadcast', async (req, res) => {
  try {
    const { message, phoneNumbers } = req.body;

    if (!message || !message.trim()) {
      return res.status(400).json({
        success: false,
        error: 'Сообщение не может быть пустым'
      });
    }

    if (!phoneNumbers || !Array.isArray(phoneNumbers) || phoneNumbers.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Необходимо выбрать хотя бы одного получателя'
      });
    }

    if (!botReady) {
      return res.status(503).json({
        success: false,
        error: 'Бот еще не готов. Дождитесь авторизации.'
      });
    }

    const results = {
      total: phoneNumbers.length,
      sent: 0,
      failed: 0,
      errors: []
    };

    // Отправляем сообщения с задержкой между отправками
    const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));
    const DELAY_BETWEEN_MESSAGES = 2000; // 2 секунды между сообщениями

    for (let i = 0; i < phoneNumbers.length; i++) {
      const phoneNumber = phoneNumbers[i];
      
      try {
        // Форматируем номер телефона
        let chatId = phoneNumber;
        
        // Если номер не содержит @c.us, добавляем его
        if (!chatId.includes('@')) {
          const digits = String(phoneNumber).replace(/\D/g, '');
          if (!digits) {
            results.failed++;
            results.errors.push({
              phone: phoneNumber,
              error: 'Неверный формат номера телефона'
            });
            continue;
          }
          chatId = `${digits}@c.us`;
        }

        // Получаем язык пользователя из базы данных
        let userLanguage = 'ru'; // По умолчанию русский
        try {
          // Пытаемся найти пользователя по номеру телефона
          const cleanPhone = chatId.replace('@c.us', '').replace('@g.us', '');
          
          // Пробуем найти пользователя через поиск
          const userResponse = await axios.get(`${SERVER_URL}/api/whatsapp/users?search=${encodeURIComponent(cleanPhone)}`, {
            timeout: 5000
          });
          
          if (userResponse.data && userResponse.data.success && userResponse.data.data && userResponse.data.data.length > 0) {
            // Ищем пользователя по полному номеру или чистому номеру
            const user = userResponse.data.data.find(u => {
              const userPhoneFull = u.phoneFull || '';
              const userPhone = u.phone || '';
              return userPhoneFull === chatId || 
                     userPhone === cleanPhone || 
                     userPhoneFull.includes(cleanPhone) ||
                     userPhone.includes(cleanPhone) ||
                     userPhoneFull.replace(/\D/g, '') === cleanPhone.replace(/\D/g, '') ||
                     userPhone.replace(/\D/g, '') === cleanPhone.replace(/\D/g, '');
            });
            
            if (user && user.language) {
              userLanguage = user.language;
              console.log(`🌍 Язык пользователя ${chatId}: ${getLanguageName(userLanguage)} (${userLanguage})`);
            } else {
              console.log(`ℹ️ Пользователь ${chatId} найден, но язык не указан, используем по умолчанию: ru`);
            }
          } else {
            console.log(`ℹ️ Пользователь ${chatId} не найден в БД, используем язык по умолчанию: ru`);
          }
        } catch (langError) {
          console.warn(`⚠️ Не удалось получить язык пользователя ${chatId}, используем по умолчанию:`, langError.message);
        }

        // Переводим сообщение на язык пользователя
        let messageToSend = message;
        try {
          messageToSend = await translateText(message, userLanguage);
          if (messageToSend !== message) {
            console.log(`🔄 Сообщение переведено на ${getLanguageName(userLanguage)} для ${chatId}`);
          }
        } catch (translateError) {
          console.warn(`⚠️ Ошибка перевода для ${chatId}, отправляем оригинал:`, translateError.message);
          // При ошибке перевода отправляем оригинальное сообщение
        }

        // Отправляем сообщение через безопасный метод
        try {
          // Создаем объект, имитирующий сообщение для sendMessageSafely
          const mockMsg = {
            from: chatId,
            getChat: async () => await client.getChatById(chatId)
          };
          await sendMessageSafely(mockMsg, messageToSend, client);
          results.sent++;
          console.log(`✅ Сообщение отправлено на ${getLanguageName(userLanguage)}: ${chatId}`);
        } catch (sendError) {
          results.failed++;
          results.errors.push({
            phone: phoneNumber,
            error: sendError.message || 'Ошибка отправки сообщения'
          });
          console.error(`❌ Ошибка отправки сообщения ${chatId}:`, sendError.message);
        }

        // Задержка между сообщениями (кроме последнего)
        if (i < phoneNumbers.length - 1) {
          await delay(DELAY_BETWEEN_MESSAGES);
        }
      } catch (error) {
        results.failed++;
        results.errors.push({
          phone: phoneNumber,
          error: error.message || 'Неизвестная ошибка'
        });
        console.error(`❌ Ошибка обработки номера ${phoneNumber}:`, error.message);
      }
    }

    return res.json({
      success: true,
      message: `Рассылка завершена. Отправлено: ${results.sent}, Ошибок: ${results.failed}`,
      results
    });
  } catch (error) {
    console.error('Ошибка рассылки сообщений:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Не удалось выполнить рассылку'
    });
  }
});

// Запускаем HTTP сервер СНАЧАЛА (чтобы Railway не убил процесс)
const server = app.listen(BOT_PORT, '0.0.0.0', () => {
  console.log(`🌐 API сервер бота запущен на порту ${BOT_PORT}`);
  console.log(`📡 Endpoints: GET /, GET /api/status, POST /api/broadcast`);
  console.log(`✅ HTTP сервер готов, Railway может проверить healthcheck`);
  
  // Инициализация клиента после запуска HTTP сервера
  // Для Railway используем небольшую задержку, для локального - сразу
  const initDelay = process.env.PORT ? 1000 : 0; // Если есть PORT (Railway), добавляем задержку
  
  setTimeout(() => {
    console.log('🔄 Инициализация WhatsApp бота...');
    client.initialize().catch(error => {
      console.error('❌ Ошибка инициализации клиента:', error);
      console.error('⚠️ HTTP сервер продолжает работать, но WhatsApp бот недоступен');
      console.error('💡 Проверьте логи выше для деталей ошибки');
      // Не завершаем процесс, чтобы HTTP сервер продолжал работать
      // Railway сможет проверить healthcheck и увидит, что сервер работает
    });
  }, initDelay);
});

// Обработка ошибок сервера
server.on('error', (error) => {
  console.error('❌ Ошибка HTTP сервера:', error);
});

// Убеждаемся, что сервер слушает
server.on('listening', () => {
  const addr = server.address();
  console.log(`✅ Сервер успешно слушает на ${addr.address}:${addr.port}`);
});

// Обработка завершения процесса
process.on('SIGINT', async () => {
  console.log('\n👋 Остановка бота...');
  await client.destroy();
  process.exit(0);
});
