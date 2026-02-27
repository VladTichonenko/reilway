const { parsePhoneNumber } = require('libphonenumber-js');

// Маппинг кодов стран на языки
const countryToLanguage = {
  'RU': 'ru', // Россия - русский
  'KZ': 'ru', // Казахстан - русский
  'BY': 'ru', // Беларусь - русский
  'UA': 'uk', // Украина - украинский
  'ES': 'es', // Испания - испанский
  'MX': 'es', // Мексика - испанский
  'AR': 'es', // Аргентина - испанский
  'CO': 'es', // Колумбия - испанский
  'PE': 'es', // Перу - испанский
  'CL': 'es', // Чили - испанский
  'US': 'en', // США - английский
  'GB': 'en', // Великобритания - английский
  'CA': 'en', // Канада - английский
  'AU': 'en', // Австралия - английский
  'DE': 'de', // Германия - немецкий
  'AT': 'de', // Австрия - немецкий
  'CH': 'de', // Швейцария - немецкий
  'FR': 'fr', // Франция - французский
  'BE': 'fr', // Бельгия - французский
  'IT': 'it', // Италия - итальянский
  'PT': 'pt', // Португалия - португальский
  'BR': 'pt', // Бразилия - португальский
  'PL': 'pl', // Польша - польский
  'TR': 'tr', // Турция - турецкий
  'CN': 'zh', // Китай - китайский
  'JP': 'ja', // Япония - японский
  'KR': 'ko', // Южная Корея - корейский
  'IN': 'hi', // Индия - хинди
  'SA': 'ar', // Саудовская Аравия - арабский
  'AE': 'ar', // ОАЭ - арабский
  // Добавьте больше стран по необходимости
};

// Языковые тексты для бота
const translations = {
  ru: {
    start: '👋 Привет! Я ваш WhatsApp бот. Введите /help для списка команд.',
    help: `📋 Доступные команды:
/start - Начать работу с ботом
/help - Показать справку
/status - Проверить состояние бота
/time - Текущее время
/site - Перейти на сайт SellYourBrick
/ping - Проверить, видит ли бот вас

Просто напишите мне любое сообщение, и я отвечу!`,
    status: '✅ Бот работает! Статус: готов к работе',
    time: '🕐 Текущее время:',
    site: '🌐 Наш официальный сайт SellYourBrick, где вы можете посмотреть все объявления недвижимости:',
    echo: 'Вы написали:',
    useHelp: 'Используйте /help для списка команд.',
    error: '❌ Произошла ошибка при обработке сообщения. Попробуйте еще раз.',
    ciphertext_reply: '📩 Сообщение получено, но это зашифрованное или одноразовое сообщение — я не вижу текст. Напишите, пожалуйста, обычным текстом.'
  },
  es: {
    start: '👋 ¡Hola! Soy tu bot de WhatsApp. Escribe /help para ver la lista de comandos.',
    help: `📋 Comandos disponibles:
/start - Comenzar a trabajar con el bot
/help - Mostrar ayuda
/status - Verificar el estado del bot
/time - Hora actual
/site - Ir al sitio web de SellYourBrick
/ping - Comprobar si el bot te ve

¡Simplemente escríbeme cualquier mensaje y responderé!`,
    status: '✅ ¡El bot está funcionando! Estado: listo para trabajar',
    time: '🕐 Hora actual:',
    site: '🌐 Nuestro sitio web oficial de SellYourBrick, donde puedes ver todos los anuncios de propiedades:',
    echo: 'Escribiste:',
    useHelp: 'Usa /help para ver la lista de comandos.',
    error: '❌ Ocurrió un error al procesar el mensaje. Inténtalo de nuevo.'
  },
  en: {
    start: '👋 Hello! I am your WhatsApp bot. Type /help for a list of commands.',
    help: `📋 Available commands:
/start - Start working with the bot
/help - Show help
/status - Check bot status
/time - Current time
/site - Go to SellYourBrick website
/ping - Check if the bot sees you

Just write me any message and I will reply!`,
    status: '✅ Bot is working! Status: ready to work',
    time: '🕐 Current time:',
    site: '🌐 Our official SellYourBrick website, where you can view all property listings:',
    echo: 'You wrote:',
    useHelp: 'Use /help for a list of commands.',
    error: '❌ An error occurred while processing the message. Please try again.',
    ciphertext_reply: '📩 I received your message but it\'s encrypted or view-once — I can\'t read the text. Please send a regular text message.'
  },
  de: {
    start: '👋 Hallo! Ich bin dein WhatsApp-Bot. Tippe /help für eine Liste der Befehle.',
    help: `📋 Verfügbare Befehle:
/start - Mit dem Bot arbeiten beginnen
/help - Hilfe anzeigen
/status - Bot-Status überprüfen
/time - Aktuelle Zeit
/site - Zur SellYourBrick-Website gehen

Schreibe mir einfach eine Nachricht und ich werde antworten!`,
    status: '✅ Bot funktioniert! Status: bereit zum Arbeiten',
    time: '🕐 Aktuelle Zeit:',
    site: '🌐 Unsere offizielle SellYourBrick-Website, auf der Sie alle Immobilienangebote ansehen können:',
    echo: 'Du hast geschrieben:',
    useHelp: 'Verwende /help für eine Liste der Befehle.',
    error: '❌ Beim Verarbeiten der Nachricht ist ein Fehler aufgetreten. Bitte versuche es erneut.'
  },
  fr: {
    start: '👋 Bonjour! Je suis votre bot WhatsApp. Tapez /help pour voir la liste des commandes.',
    help: `📋 Commandes disponibles:
/start - Commencer à travailler avec le bot
/help - Afficher l'aide
/status - Vérifier l'état du bot
/time - Heure actuelle
/site - Aller sur le site web SellYourBrick

Écrivez-moi simplement un message et je répondrai!`,
    status: '✅ Le bot fonctionne! Statut: prêt à travailler',
    time: '🕐 Heure actuelle:',
    site: '🌐 Notre site web officiel SellYourBrick, où vous pouvez voir toutes les annonces immobilières:',
    echo: 'Vous avez écrit:',
    useHelp: 'Utilisez /help pour voir la liste des commandes.',
    error: '❌ Une erreur s\'est produite lors du traitement du message. Veuillez réessayer.'
  },
  it: {
    start: '👋 Ciao! Sono il tuo bot WhatsApp. Digita /help per vedere l\'elenco dei comandi.',
    help: `📋 Comandi disponibili:
/start - Iniziare a lavorare con il bot
/help - Mostrare aiuto
/status - Verificare lo stato del bot
/time - Ora attuale
/site - Vai al sito web SellYourBrick

Scrivimi semplicemente un messaggio e risponderò!`,
    status: '✅ Il bot funziona! Stato: pronto per lavorare',
    time: '🕐 Ora attuale:',
    site: '🌐 Il nostro sito web ufficiale SellYourBrick, dove puoi vedere tutti gli annunci immobiliari:',
    echo: 'Hai scritto:',
    useHelp: 'Usa /help per vedere l\'elenco dei comandi.',
    error: '❌ Si è verificato un errore durante l\'elaborazione del messaggio. Riprova.'
  },
  pt: {
    start: '👋 Olá! Sou seu bot do WhatsApp. Digite /help para ver a lista de comandos.',
    help: `📋 Comandos disponíveis:
/start - Começar a trabalhar com o bot
/help - Mostrar ajuda
/status - Verificar o status do bot
/time - Hora atual
/site - Ir ao site SellYourBrick

Apenas me escreva uma mensagem e eu responderei!`,
    status: '✅ O bot está funcionando! Status: pronto para trabalhar',
    time: '🕐 Hora atual:',
    site: '🌐 Nosso site oficial SellYourBrick, onde você pode ver todos os anúncios de imóveis:',
    echo: 'Você escreveu:',
    useHelp: 'Use /help para ver a lista de comandos.',
    error: '❌ Ocorreu um erro ao processar a mensagem. Tente novamente.'
  },
  pl: {
    start: '👋 Cześć! Jestem twoim botem WhatsApp. Wpisz /help, aby zobaczyć listę poleceń.',
    help: `📋 Dostępne polecenia:
/start - Zacznij pracę z botem
/help - Pokaż pomoc
/status - Sprawdź status bota
/time - Aktualny czas
/site - Przejdź do strony SellYourBrick

Po prostu napisz mi wiadomość, a odpowiem!`,
    status: '✅ Bot działa! Status: gotowy do pracy',
    time: '🕐 Aktualny czas:',
    site: '🌐 Nasza oficjalna strona SellYourBrick, gdzie możesz zobaczyć wszystkie ogłoszenia nieruchomości:',
    echo: 'Napisałeś:',
    useHelp: 'Użyj /help, aby zobaczyć listę poleceń.',
    error: '❌ Wystąpił błąd podczas przetwarzania wiadomości. Spróbuj ponownie.'
  },
  tr: {
    start: '👋 Merhaba! Ben senin WhatsApp botunum. Komut listesini görmek için /help yazın.',
    help: `📋 Mevcut komutlar:
/start - Bot ile çalışmaya başla
/help - Yardım göster
/status - Bot durumunu kontrol et
/time - Mevcut saat
/site - SellYourBrick web sitesine git

Sadece bana bir mesaj yaz ve cevap vereceğim!`,
    status: '✅ Bot çalışıyor! Durum: çalışmaya hazır',
    time: '🕐 Mevcut saat:',
    site: '🌐 Tüm emlak ilanlarını görebileceğiniz resmi SellYourBrick web sitemiz:',
    echo: 'Yazdın:',
    useHelp: 'Komut listesini görmek için /help kullanın.',
    error: '❌ Mesaj işlenirken bir hata oluştu. Lütfen tekrar deneyin.'
  },
  uk: {
    start: '👋 Привіт! Я ваш WhatsApp бот. Введіть /help для списку команд.',
    help: `📋 Доступні команди:
/start - Почати роботу з ботом
/help - Показати довідку
/status - Перевірити стан бота
/time - Поточний час
/site - Перейти на сайт SellYourBrick

Просто напишіть мені будь-яке повідомлення, і я відповім!`,
    status: '✅ Бот працює! Стан: готовий до роботи',
    time: '🕐 Поточний час:',
    site: '🌐 Наш офіційний сайт SellYourBrick, де ви можете переглянути всі оголошення нерухомості:',
    echo: 'Ви написали:',
    useHelp: 'Використовуйте /help для списку команд.',
    error: '❌ Сталася помилка при обробці повідомлення. Спробуйте ще раз.'
  },
  // Для остальных языков (zh, ja, ko, hi, ar) будет использоваться английский как fallback
};

/**
 * Определяет страну по номеру телефона
 * @param {string} phoneNumber - Номер телефона (может быть в формате 79991234567@c.us или +79991234567)
 * @returns {string|null} - Код страны (например, 'RU', 'ES') или null если не удалось определить
 */
function getCountryFromPhone(phoneNumber) {
  try {
    // Пропускаем специальные форматы (@lid, @g.us для групп, и т.д.)
    if (phoneNumber.includes('@lid') || phoneNumber.includes('@g.us') || phoneNumber.includes('@broadcast')) {
      return null;
    }
    
    // Убираем @c.us или @g.us из конца (формат WhatsApp)
    let cleanNumber = phoneNumber.replace(/@[cg]\.us$/, '');
    
    // Если номер не содержит цифр или слишком короткий, пропускаем
    if (!/\d/.test(cleanNumber) || cleanNumber.length < 5) {
      return null;
    }
    
    // Если номер начинается с +, используем его как есть
    // Если нет, добавляем + (предполагаем, что это международный формат)
    if (!cleanNumber.startsWith('+')) {
      cleanNumber = '+' + cleanNumber;
    }
    
    // Парсим номер телефона
    const phoneNumberObj = parsePhoneNumber(cleanNumber);
    
    if (phoneNumberObj && phoneNumberObj.isValid()) {
      const countryCode = phoneNumberObj.country;
      console.log(`🌍 Определена страна для номера ${phoneNumber}: ${countryCode}`);
      return countryCode;
    }
    
    return null;
  } catch (error) {
    // Не логируем ошибку для специальных форматов (@lid и т.д.)
    if (!phoneNumber.includes('@lid') && !phoneNumber.includes('@g.us')) {
      console.error('❌ Ошибка определения страны по номеру:', error);
    }
    return null;
  }
}

/**
 * Определяет язык пользователя по номеру телефона
 * @param {string} phoneNumber - Номер телефона
 * @returns {string} - Код языка (например, 'ru', 'es', 'en'), по умолчанию 'en'
 */
function getLanguageFromPhone(phoneNumber) {
  const countryCode = getCountryFromPhone(phoneNumber);
  
  if (countryCode && countryToLanguage[countryCode]) {
    const language = countryToLanguage[countryCode];
    console.log(`🗣️ Определен язык для страны ${countryCode}: ${language}`);
    return language;
  }
  
  // Язык по умолчанию
  console.log(`⚠️ Не удалось определить язык, используется английский по умолчанию`);
  return 'en';
}

/**
 * Получает перевод текста на нужном языке
 * @param {string} language - Код языка
 * @param {string} key - Ключ перевода
 * @returns {string} - Переведенный текст
 */
function getTranslation(language, key) {
  const lang = translations[language] || translations.en;
  return lang[key] || translations.en[key] || key;
}

/**
 * Форматирует номер телефона для WhatsApp
 * @param {string} phoneNumber - Номер телефона в любом формате
 * @returns {string} - Номер в формате 79991234567@c.us
 */
function formatPhoneNumber(phoneNumber) {
  // Убираем все нецифровые символы, кроме +
  let cleaned = phoneNumber.replace(/[^\d+]/g, '');
  
  // Если номер начинается с +, убираем его
  if (cleaned.startsWith('+')) {
    cleaned = cleaned.substring(1);
  }
  
  // Если номер начинается с 8, заменяем на 7
  if (cleaned.startsWith('8')) {
    cleaned = '7' + cleaned.substring(1);
  }
  
  // Если номер не начинается с кода страны, добавляем 7 (для России)
  if (cleaned.length === 10) {
    cleaned = '7' + cleaned;
  }
  
  return `${cleaned}@c.us`;
}

module.exports = {
  getCountryFromPhone,
  getLanguageFromPhone,
  getTranslation,
  formatPhoneNumber,
  countryToLanguage,
  translations
};
