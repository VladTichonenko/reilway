import dotenv from 'dotenv';
import axios from 'axios';

dotenv.config();

const ID_INSTANCE = process.env.ID_INSTANCE;
const API_TOKEN_INSTANCE = process.env.API_TOKEN_INSTANCE;
const BASE_URL = `https://api.green-api.com/waInstance${ID_INSTANCE}`;

async function testAPI() {
  console.log('🧪 Тестирование Green-API...\n');
  console.log(`ID_INSTANCE: ${ID_INSTANCE}`);
  console.log(`API_TOKEN_INSTANCE: ${API_TOKEN_INSTANCE?.substring(0, 10)}...\n`);

  try {
    // Тест 1: Проверка состояния
    console.log('1️⃣ Проверка состояния инстанса...');
    const stateResponse = await axios.get(`${BASE_URL}/getStateInstance/${API_TOKEN_INSTANCE}`);
    console.log('✅ Состояние:', stateResponse.data);
    console.log();

    // Тест 2: Проверка настроек
    console.log('2️⃣ Проверка настроек инстанса...');
    const settingsResponse = await axios.get(`${BASE_URL}/getSettings/${API_TOKEN_INSTANCE}`);
    console.log('✅ Настройки:', JSON.stringify(settingsResponse.data, null, 2));
    console.log();

    // Тест 3: Попытка получить уведомление
    console.log('3️⃣ Попытка получить уведомление...');
    try {
      const notificationResponse = await axios.get(`${BASE_URL}/receiveNotification/${API_TOKEN_INSTANCE}`, {
        timeout: 5000
      });
      console.log('✅ Уведомление получено:', JSON.stringify(notificationResponse.data, null, 2));
    } catch (error) {
      if (error.response?.status === 404) {
        console.log('ℹ️ Нет новых уведомлений (это нормально)');
      } else {
        console.log('❌ Ошибка получения уведомления:', error.message);
        if (error.response) {
          console.log('Статус:', error.response.status);
          console.log('Данные:', error.response.data);
        }
      }
    }
    console.log();

    console.log('✅ Все тесты выполнены!');
  } catch (error) {
    console.error('❌ Ошибка тестирования:', error.message);
    if (error.response) {
      console.error('Статус:', error.response.status);
      console.error('Данные:', error.response.data);
    }
  }
}

testAPI();
