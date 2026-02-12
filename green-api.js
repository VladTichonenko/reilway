import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

const BASE_URL = 'https://api.green-api.com';

class GreenAPI {
  constructor(idInstance, apiTokenInstance) {
    this.idInstance = idInstance || process.env.ID_INSTANCE;
    this.apiTokenInstance = apiTokenInstance || process.env.API_TOKEN_INSTANCE;
    
    if (!this.idInstance || !this.apiTokenInstance) {
      throw new Error('ID_INSTANCE и API_TOKEN_INSTANCE должны быть указаны');
    }

    this.baseURL = `${BASE_URL}/waInstance${this.idInstance}`;
    
    // Создаем axios instance с базовыми заголовками
    this.api = axios.create({
      baseURL: this.baseURL,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }

  /**
   * Отправка текстового сообщения
   * @param {string} chatId - ID чата (номер телефона в формате 79991234567@c.us)
   * @param {string} message - Текст сообщения
   * @returns {Promise}
   */
  async sendMessage(chatId, message) {
    try {
      const response = await this.api.post(
        `/sendMessage/${this.apiTokenInstance}`,
        {
          chatId: chatId,
          message: message,
        }
      );
      return response.data;
    } catch (error) {
      console.error('Ошибка отправки сообщения:', error.response?.data || error.message);
      throw error;
    }
  }

  /**
   * Получение входящих уведомлений (webhook)
   * Метод для получения входящих уведомлений из очереди
   * @returns {Promise}
   */
  async receiveNotification() {
    try {
      const url = `/receiveNotification/${this.apiTokenInstance}`;
      const response = await this.api.get(url, {
        timeout: 20000, // 20 секунд таймаут для long polling
      });
      return response.data;
    } catch (error) {
      if (error.response?.status === 404) {
        // Нет новых уведомлений - это нормально
        return null;
      }
      // Логируем только реальные ошибки, не 404
      if (error.response?.status !== 404) {
        console.error('❌ Ошибка получения уведомления:', error.response?.data || error.message);
        if (error.response) {
          console.error('Статус:', error.response.status);
          console.error('URL:', error.config?.url);
        }
      }
      throw error;
    }
  }

  /**
   * Удаление уведомления из очереди после обработки
   * @param {number} receiptId - ID уведомления
   * @returns {Promise}
   */
  async deleteNotification(receiptId) {
    try {
      const response = await this.api.delete(
        `/deleteNotification/${this.apiTokenInstance}/${receiptId}`
      );
      return response.data;
    } catch (error) {
      console.error('Ошибка удаления уведомления:', error.response?.data || error.message);
      throw error;
    }
  }

  /**
   * Проверка состояния аккаунта WhatsApp
   * @returns {Promise}
   */
  async getStateInstance() {
    try {
      const response = await this.api.get(
        `/getStateInstance/${this.apiTokenInstance}`
      );
      return response.data;
    } catch (error) {
      console.error('Ошибка проверки состояния:', error.response?.data || error.message);
      throw error;
    }
  }

  /**
   * Получение настроек аккаунта
   * @returns {Promise}
   */
  async getSettings() {
    try {
      const response = await this.api.get(
        `/getSettings/${this.apiTokenInstance}`
      );
      return response.data;
    } catch (error) {
      console.error('Ошибка получения настроек:', error.response?.data || error.message);
      throw error;
    }
  }

  /**
   * Отправка файла по URL
   * @param {string} chatId - ID чата
   * @param {string} urlFile - URL файла
   * @param {string} fileName - Имя файла
   * @param {string} caption - Подпись к файлу
   * @returns {Promise}
   */
  async sendFileByUrl(chatId, urlFile, fileName, caption = '') {
    try {
      const response = await this.api.post(
        `/sendFileByUrl/${this.apiTokenInstance}`,
        {
          chatId: chatId,
          urlFile: urlFile,
          fileName: fileName,
          caption: caption,
        }
      );
      return response.data;
    } catch (error) {
      console.error('Ошибка отправки файла:', error.response?.data || error.message);
      throw error;
    }
  }

  /**
   * Проверка номера WhatsApp
   * Проверяет, есть ли номер в WhatsApp
   * @param {string} phoneNumber - Номер телефона (79991234567)
   * @returns {Promise}
   */
  async checkWhatsapp(phoneNumber) {
    try {
      const response = await this.api.post(
        `/checkWhatsapp/${this.apiTokenInstance}`,
        {
          phoneNumber: phoneNumber,
        }
      );
      return response.data;
    } catch (error) {
      console.error('Ошибка проверки номера:', error.response?.data || error.message);
      throw error;
    }
  }

  /**
   * Отправка шаблонного сообщения (для бизнес-аккаунтов)
   * @param {string} chatId - ID чата
   * @param {string} message - Текст шаблона
   * @returns {Promise}
   */
  async sendTemplate(chatId, message) {
    // Шаблонные сообщения требуют специальной структуры
    // Подробнее в документации Green-API
    try {
      const response = await this.api.post(
        `/sendMessage/${this.apiTokenInstance}`,
        {
          chatId: chatId,
          message: message,
        }
      );
      return response.data;
    } catch (error) {
      console.error('Ошибка отправки шаблона:', error.response?.data || error.message);
      throw error;
    }
  }

  /**
   * Преобразование номера телефона в формат chatId
   * @param {string} phoneNumber - Номер в любом формате
   * @returns {string} - Формат 79991234567@c.us
   */
  static formatChatId(phoneNumber) {
    // Убираем все нецифровые символы
    let cleaned = phoneNumber.replace(/\D/g, '');
    
    // Если номер начинается с 8, заменяем на 7
    if (cleaned.startsWith('8')) {
      cleaned = '7' + cleaned.substring(1);
    }
    
    // Если номер не начинается с кода страны, добавляем 7
    if (cleaned.length === 10) {
      cleaned = '7' + cleaned;
    }
    
    return `${cleaned}@c.us`;
  }
}

export default GreenAPI;
