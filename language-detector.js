/**
 * Определяет язык текста на основе ключевых слов и паттернов
 * @param {string} text - Текст для анализа
 * @returns {string} - Код языка ('ru', 'en', 'es', 'de')
 */
function detectLanguageFromText(text) {
  if (!text || typeof text !== 'string') {
    return 'ru'; // По умолчанию русский
  }

  const lowerText = text.toLowerCase().trim();
  
  // Русский язык - кириллица
  const russianPattern = /[а-яё]/i;
  const russianKeywords = ['привет', 'здравствуй', 'да', 'нет', 'спасибо', 'пожалуйста', 'как', 'что', 'где', 'когда', 'почему', 'помощь', 'помоги', 'хочу', 'нужно', 'можно', 'недвижимость', 'квартира', 'дом', 'вилла'];
  
  // Английский язык
  const englishKeywords = ['hello', 'hi', 'hey', 'yes', 'no', 'thank', 'please', 'how', 'what', 'where', 'when', 'why', 'help', 'want', 'need', 'can', 'property', 'apartment', 'house', 'villa'];
  
  // Испанский язык
  const spanishKeywords = ['hola', 'si', 'no', 'gracias', 'por favor', 'como', 'que', 'donde', 'cuando', 'por que', 'ayuda', 'quiero', 'necesito', 'puedo', 'propiedad', 'apartamento', 'casa', 'villa'];
  
  // Немецкий язык
  const germanKeywords = ['hallo', 'guten tag', 'ja', 'nein', 'danke', 'bitte', 'wie', 'was', 'wo', 'wann', 'warum', 'hilfe', 'will', 'brauche', 'kann', 'immobilie', 'wohnung', 'haus', 'villa'];
  
  // Проверяем наличие кириллицы (русский)
  if (russianPattern.test(text)) {
    // Дополнительная проверка на русские ключевые слова
    const russianMatches = russianKeywords.filter(keyword => lowerText.includes(keyword)).length;
    if (russianMatches > 0) {
      return 'ru';
    }
    // Если есть кириллица, скорее всего русский
    return 'ru';
  }
  
  // СНАЧАЛА проверяем испанский по диакритике (это самый надежный признак)
  if (/[ñáéíóúüÑÁÉÍÓÚÜ]/i.test(text)) {
    // Если есть испанские диакритики, это точно испанский
    return 'es';
  }
  
  // Затем проверяем немецкий по диакритике
  if (/[äöüßÄÖÜ]/i.test(text)) {
    return 'de';
  }
  
  // Подсчитываем совпадения для каждого языка
  const englishMatches = englishKeywords.filter(keyword => lowerText.includes(keyword)).length;
  const spanishMatches = spanishKeywords.filter(keyword => lowerText.includes(keyword)).length;
  const germanMatches = germanKeywords.filter(keyword => lowerText.includes(keyword)).length;
  
  // Находим язык с наибольшим количеством совпадений
  const matches = [
    { lang: 'en', count: englishMatches },
    { lang: 'es', count: spanishMatches },
    { lang: 'de', count: germanMatches }
  ];
  
  matches.sort((a, b) => b.count - a.count);
  
  // Если есть явные совпадения, возвращаем язык с наибольшим количеством
  if (matches[0].count > 0) {
    // Если испанский имеет хотя бы одно совпадение, приоритет ему (часто испанский без диакритики)
    if (spanishMatches > 0 && matches[0].lang === 'en' && englishMatches === spanishMatches) {
      return 'es'; // При равном количестве приоритет испанскому
    }
    return matches[0].lang;
  }
  
  // Если совпадений нет, проверяем общие паттерны
  // Испанские слова часто заканчиваются на -ción, -sión, -mente, -dad, -ción
  if (/\b\w*(cion|sion|mente|dad|tad|ncia|ncia)\b/i.test(text)) {
    return 'es';
  }
  
  // Английский - латиница без диакритики (но только если нет испанских признаков)
  if (/^[a-z\s\d\.,!?\-]+$/i.test(text)) {
    // Дополнительная проверка: испанские артикли и предлоги
    const spanishCommonWords = ['el', 'la', 'los', 'las', 'un', 'una', 'de', 'del', 'en', 'con', 'por', 'para', 'es', 'son', 'está', 'están'];
    const hasSpanishCommonWords = spanishCommonWords.some(word => {
      const regex = new RegExp(`\\b${word}\\b`, 'i');
      return regex.test(text);
    });
    if (hasSpanishCommonWords) {
      return 'es';
    }
    return 'en';
  }
  
  // По умолчанию русский
  return 'ru';
}

/**
 * Получает название языка на русском
 * @param {string} langCode - Код языка
 * @returns {string} - Название языка
 */
function getLanguageName(langCode) {
  const names = {
    'ru': 'Русский',
    'en': 'Английский',
    'es': 'Испанский',
    'de': 'Немецкий',
    'fr': 'Французский',
    'it': 'Итальянский',
    'pt': 'Португальский',
    'pl': 'Польский',
    'tr': 'Турецкий',
    'uk': 'Украинский'
  };
  return names[langCode] || langCode;
}

module.exports = {
  detectLanguageFromText,
  getLanguageName
};

