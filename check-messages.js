import dotenv from 'dotenv';
import axios from 'axios';

dotenv.config();

const ID_INSTANCE = process.env.ID_INSTANCE;
const API_TOKEN_INSTANCE = process.env.API_TOKEN_INSTANCE;
const BASE_URL = `https://api.green-api.com/waInstance${ID_INSTANCE}`;

async function checkIncomingMessages() {
  console.log('📨 Проверка последних входящих сообщений...\n');
  console.log(`ID_INSTANCE: ${ID_INSTANCE}`);
  console.log(`API_TOKEN_INSTANCE: ${API_TOKEN_INSTANCE?.substring(0, 10)}...\n`);

  try {
    // Получаем последние входящие сообщения (за последние 24 часа)
    console.log('1️⃣ Получение последних входящих сообщений (за 24 часа)...');
    const response = await axios.get(
      `${BASE_URL}/lastIncomingMessages/${API_TOKEN_INSTANCE}`
    );
    
    console.log('✅ Ответ получен:');
    console.log(JSON.stringify(response.data, null, 2));
    console.log();

    if (response.data && Array.isArray(response.data) && response.data.length > 0) {
      console.log(`✅ Найдено ${response.data.length} входящих сообщений!`);
      console.log('📋 Список сообщений:');
      response.data.forEach((msg, index) => {
        console.log(`\n${index + 1}. Сообщение:`);
        console.log(`   От: ${msg.senderData?.chatId || 'Неизвестно'}`);
        console.log(`   Текст: ${msg.messageData?.textMessageData?.textMessage || msg.messageData?.extendedTextMessageData?.text || 'Нет текста'}`);
        console.log(`   Тип: ${msg.messageData?.typeMessage || 'Неизвестно'}`);
        console.log(`   Время: ${msg.timestamp || 'Неизвестно'}`);
      });
    } else {
      console.log('⚠️ Входящих сообщений не найдено за последние 24 часа');
      console.log('💡 Это означает, что Green-API не получает сообщения на ваш номер');
      console.log('💡 Возможные причины:');
      console.log('   - Сообщения отправляются не на правильный номер');
      console.log('   - Проблемы с авторизацией WhatsApp аккаунта');
      console.log('   - Настройки уведомлений в Green-API');
    }
  } catch (error) {
    console.error('❌ Ошибка проверки сообщений:', error.message);
    if (error.response) {
      console.error('Статус:', error.response.status);
      console.error('Данные:', error.response.data);
    }
  }
}

checkIncomingMessages();
