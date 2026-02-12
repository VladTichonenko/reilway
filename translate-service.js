const axios = require('axios');
const { detectLanguageFromText: detectLanguage } = require('./language-detector');

const AI_API_URL = "https://api.intelligence.io.solutions/api/v1/chat/completions";
const AI_MODEL = "deepseek-ai/DeepSeek-V3.2";
const AI_API_KEY = "io-v2-eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJvd25lciI6ImE5YzAwNjc4LTFjNzEtNDY5Ny1hY2NiLTliYTU0NTdhMWU4NSIsImV4cCI6NDkyMTI0NDg2NX0.E92VNc-ri_VH1bRLZfJ4seHnvr_hdL0vzgBbRC97WYDaENrvqU-jV1gYxqG128Tvyf8yfEczZ9hfpdKeZ2E0UA";

/**
 * Переводит текст на указанный язык
 * @param {string} text - Текст для перевода
 * @param {string} targetLanguage - Целевой язык ('ru', 'en', 'es', 'de')
 * @returns {Promise<string>} - Переведенный текст
 */
async function translateText(text, targetLanguage) {
  // Если язык совпадает, возвращаем оригинал
  const sourceLanguage = detectLanguage(text);
  if (sourceLanguage === targetLanguage) {
    return text;
  }

  const languageNames = {
    'ru': 'русский',
    'en': 'английский',
    'es': 'испанский',
    'de': 'немецкий',
    'fr': 'французский',
    'it': 'итальянский',
    'pt': 'португальский',
    'pl': 'польский',
    'tr': 'турецкий',
    'uk': 'украинский'
  };

  const targetLanguageName = languageNames[targetLanguage] || targetLanguage;

  const systemPrompt = `Ты профессиональный переводчик. Твоя задача - перевести текст на ${targetLanguageName} язык, сохраняя смысл, стиль и тон оригинала.

**ПРАВИЛА ПЕРЕВОДА:**
1. Переведи текст точно и естественно на ${targetLanguageName} язык
2. Сохрани все форматирование (переносы строк, пунктуацию)
3. Сохрани стиль и тон сообщения
4. Если текст содержит специальные термины или названия, переведи их, если это уместно
5. Не добавляй дополнительных комментариев или объяснений
6. Верни ТОЛЬКО переведенный текст, без дополнительных пояснений

**ВАЖНО:** Отвечай ТОЛЬКО переведенным текстом, без предисловий, без объяснений, без меток типа "Перевод:" или "[${targetLanguageName}]".`;

  const messages = [
    { role: "system", content: systemPrompt },
    { role: "user", content: `Переведи следующий текст на ${targetLanguageName} язык:\n\n${text}` }
  ];

  try {
    const headers = {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${AI_API_KEY}`
    };

    const payload = {
      "model": AI_MODEL,
      "messages": messages,
      "temperature": 0.3 // Низкая температура для более точного перевода
    };

    const response = await axios.post(AI_API_URL, payload, {
      headers: headers,
      timeout: 30000 // 30 секунд таймаут
    });

    if (response.status < 200 || response.status >= 300) {
      console.error(`❌ Ошибка перевода: ${response.status}`);
      return text; // Возвращаем оригинал при ошибке
    }

    const data = response.data;

    if (data.choices && data.choices.length > 0) {
      let translatedText = data.choices[0].message?.content || "";
      
      // Удаляем возможные служебные метки
      translatedText = translatedText.replace(/<\/?think>/g, "").trim();
      translatedText = translatedText.replace(/<\/?redacted_reasoning>/g, "").trim();
      
      // Удаляем возможные префиксы типа "Перевод:" или "[язык]"
      translatedText = translatedText.replace(/^(перевод|translation|traducción|übersetzung):\s*/i, "");
      translatedText = translatedText.replace(/^\[(ru|en|es|de|русский|английский|испанский|немецкий)\]\s*/i, "");
      
      if (!translatedText || !translatedText.trim()) {
        console.warn('⚠️ Пустой перевод, возвращаем оригинал');
        return text;
      }

      return translatedText.trim();
    } else {
      console.error("Unexpected API response format:", data);
      return text;
    }
  } catch (error) {
    console.error("❌ Ошибка перевода:", error.message);
    // При ошибке возвращаем оригинальный текст
    return text;
  }
}

module.exports = {
  translateText
};

