/**
 * База знаний по недвижимости в Испании и Дубае
 * Структурированные данные для быстрого поиска информации
 */

const knowledgeBase = {
  // Авторитетные источники информации
  sources: {
    spain: {
      official: [
        {
          name: "Министерство транспорта, мобильности и городского агентства",
          url: "www.mitma.es",
          description: "Официальные данные по регистрации недвижимости, статистике цен"
        },
        {
          name: "Генеральная дирекция кадастра",
          url: "www.sedecatastro.gob.es",
          description: "Точные кадастровые данные, онлайн-выписки"
        },
        {
          name: "Налоговая служба (Agencia Tributaria)",
          url: "www.agenciatributaria.es",
          description: "Информация по налогам (ITP, AJD, IBI, налог на имущество нерезидентов)"
        },
        {
          name: "Официальный сайт испанского правительства для иностранцев",
          url: "extranjeros.inclusion.gob.es",
          description: "Порядок получения ВНЖ, виз, требования"
        }
      ],
      professional: [
        {
          name: "Совет коллегий регистраторов имущества",
          url: "www.registradores.org",
          description: "Достоверная юридическая информация о сделках"
        },
        {
          name: "Национальный совет коллегий нотариусов",
          url: "www.notariado.org",
          description: "Образцы договоров, юридические комментарии"
        }
      ],
      market: [
        {
          name: "Idealista / Fotocasa / Habitaclia",
          description: "Крупнейшие порталы для отслеживания цен, предложений и трендов"
        }
      ]
    },
    dubai: {
      official: [
        {
          name: "Управление по регулированию недвижимости Дубая (RERA)",
          url: "www.dubailand.gov.ae",
          description: "Главный источник. Все правила, калькуляторы комиссий, стандартные формы договоров (F Forms), реестр застройщиков"
        },
        {
          name: "Департамент земельных ресурсов Дубая (DLD)",
          url: "www.dubailand.gov.ae",
          description: "Регистрация сделок, база данных (ОДУД), система Муска"
        },
        {
          name: "Федеральный орган по идентификации и гражданству (ICA)",
          url: "www.ica.gov.ae",
          description: "Официальные процедуры и условия получения ВНЖ"
        }
      ],
      developers: [
        {
          name: "Emaar Properties",
          url: "emaar.com"
        },
        {
          name: "Nakheel Properties",
          url: "nakheel.com"
        },
        {
          name: "Meraas / Dubai Holding",
          url: "meraas.com"
        }
      ],
      market: [
        {
          name: "Property Finder / Bayut / Dubizzle",
          description: "Основные порталы для анализа рынка"
        }
      ]
    }
  },

  // Типы объектов и локации
  propertyTypes: {
    spain: {
      types: [
        "Квартира (первая/вторая береговая линия)",
        "Апартаменты",
        "Таунхаус",
        "Вилла",
        "Бунгало",
        "Finca (загородный дом с землей)",
        "Cortijo (хутор)"
      ],
      regions: [
        "Коста-дель-Соль",
        "Коста-Бланка",
        "Барселона",
        "Мадрид",
        "Балеарские острова",
        "Канарские острова"
      ]
    },
    dubai: {
      types: [
        "Апартаменты (студия, 1/2/3 BR)",
        "Пентхаус",
        "Вилла/таунхаус в закрытых сообществах (community)"
      ],
      areas: [
        "Dubai Marina",
        "Downtown",
        "Palm Jumeirah",
        "Jumeirah Village Circle (JVC)",
        "Dubai Hills Estate",
        "Arabian Ranches"
      ]
    }
  },

  // Процесс покупки
  purchaseProcess: {
    spain: [
      {
        step: 1,
        name: "Поиск",
        description: "Выбор недвижимости"
      },
      {
        step: 2,
        name: "Предварительный договор",
        description: "Contrato privado de compraventa и депозит (10%)"
      },
      {
        step: 3,
        name: "Нотариальное оформление",
        description: "Escritura Pública"
      },
      {
        step: 4,
        name: "Регистрация в Реестре",
        description: "Registro de la Propiedad"
      }
    ],
    dubai: [
      {
        step: 1,
        name: "Поиск",
        description: "Выбор недвижимости"
      },
      {
        step: 2,
        name: "Бронь",
        description: "Reservation Form, 5-10% депозит"
      },
      {
        step: 3,
        name: "Подписание договора",
        description: "Form F, 50/50 или иной план платежей"
      },
      {
        step: 4,
        name: "Регистрация в DLD",
        description: "Через систему Муска"
      },
      {
        step: 5,
        name: "Получение Title Deed",
        description: "Свидетельство о праве собственности"
      }
    ]
  },

  // Налоги и расходы
  taxesAndCosts: {
    spain: {
      purchase: [
        {
          name: "Налог на передачу имущества (ITP)",
          rate: "6-12%",
          appliesTo: "Вторичная недвижимость",
          source: "Agencia Tributaria (www.agenciatributaria.es)"
        },
        {
          name: "Налог на юридические оформленные документы (AJD)",
          rate: "0.5-1.5%",
          appliesTo: "Новая недвижимость от застройщика + НДС 10%",
          source: "Agencia Tributaria (www.agenciatributaria.es)"
        },
        {
          name: "Нотариус, регистрация, гонорар адвоката",
          rate: "~1-2%",
          appliesTo: "От стоимости сделки",
          source: "Совет коллегий нотариусов (www.notariado.org)"
        }
      ],
      annual: [
        {
          name: "Налог на недвижимость (IBI)",
          rate: "~0.4-1.1%",
          appliesTo: "От кадастровой стоимости ежегодно",
          source: "Agencia Tributaria (www.agenciatributaria.es)"
        },
        {
          name: "Налог на имущество для нерезидентов (Modelo 210)",
          rate: "19-24%",
          appliesTo: "От кадастровой стоимости ежегодно",
          source: "Agencia Tributaria (www.agenciatributaria.es)"
        }
      ]
    },
    dubai: {
      purchase: [
        {
          name: "Регистрационный сбор (DLD Fee)",
          rate: "4%",
          additional: "+ 580 AED (сервисный сбор)",
          appliesTo: "От цены сделки",
          source: "DLD (www.dubailand.gov.ae)"
        },
        {
          name: "Административный сбор (Trustee Fee)",
          rate: "2000 - 6000 AED",
          appliesTo: "Фиксированная сумма",
          source: "RERA (www.dubailand.gov.ae)"
        },
        {
          name: "Агентское вознаграждение",
          rate: "2%",
          additional: "+ НДС 5%",
          appliesTo: "От цены",
          source: "RERA (www.dubailand.gov.ae)"
        }
      ],
      annual: [
        {
          name: "Коммунальные платежи",
          description: "DEWA, охлаждение",
          source: "DEWA"
        },
        {
          name: "Плата за обслуживание",
          description: "Service charge",
          source: "Управляющая компания"
        }
      ]
    }
  },

  // ВНЖ и льготы
  residency: {
    spain: {
      goldenVisa: {
        minAmount: "€500,000",
        type: "ВНЖ для инвесторов (Residencia por inversión)",
        benefits: [
          "Право жить в Испании",
          "Безвизовый въезд в страны Шенгена",
          "Возможность получить ПМЖ через 5 лет",
          "Воссоединение семьи"
        ],
        documents: [
          "Договор купли-продажи",
          "Справка о регистрации недвижимости",
          "Подтверждение оплаты (минимум €500,000)",
          "Медицинская страховка",
          "Справка о несудимости",
          "Справка о доходах"
        ],
        timeline: "Обычно 2-3 месяца после подачи документов",
        source: "extranjeros.inclusion.gob.es",
        additionalInfo: "Может быть снижена до €250,000 в некоторых регионах"
      },
      nonLucrative: {
        type: "ВНЖ без права на работу (для финансово независимых лиц)",
        requirements: [
          "Подтверждение достаточных средств",
          "Медицинская страховка"
        ],
        source: "extranjeros.inclusion.gob.es"
      }
    },
    dubai: {
      goldenVisa: {
        minAmount: "2 млн AED",
        type: "Долгосроческий ВНЖ на 10 лет",
        benefits: [
          "Право жить в Дубае",
          "Открытие банковского счета",
          "Регистрация компании (при определенных условиях)",
          "Воссоединение семьи (супруг/супруга и дети)",
          "Налоговые льготы"
        ],
        documents: [
          "Договор купли-продажи (MOU)",
          "Справка о регистрации в DLD",
          "Подтверждение оплаты",
          "Медицинская страховка",
          "Справка о несудимости",
          "Фотографии",
          "Медицинское обследование в ОАЭ"
        ],
        timeline: "Обычно 1-2 месяца после покупки",
        validity: "10 лет",
        source: "ICA (www.ica.gov.ae)"
      },
      propertyVisa: {
        minAmount: "1,000,000 AED (около €250,000)",
        type: "Резидентская виза инвестора в недвижимость",
        validity: "Обычно 2-3 года с возможностью продления",
        source: "DLD (www.dubailand.gov.ae)"
      }
    }
  },

  // Риски и предупреждения
  risks: {
    spain: [
      {
        risk: "Наличие задолженностей",
        description: "Проверка IBI, сборы сообщества",
        source: "Registro de la Propiedad"
      },
      {
        risk: "Статус застройщика",
        description: "Для новой недвижимости - проверка лицензии",
        source: "Совет коллегий регистраторов (www.registradores.org)"
      },
      {
        risk: "Лицензия на аренду",
        description: "Для туризма - наличие лицензии",
        source: "Местные власти"
      }
    ],
    dubai: [
      {
        risk: "Рейтинг застройщика",
        description: "Проверка рейтинга в RERA",
        source: "RERA (www.dubailand.gov.ae)"
      },
      {
        risk: "Статус проекта",
        description: "Проверка статуса строительства",
        source: "DLD (www.dubailand.gov.ae)"
      },
      {
        risk: "Соответствие планировки",
        description: "Соответствие утвержденной в DLD (Oqood)",
        source: "DLD (www.dubailand.gov.ae)"
      },
      {
        risk: "График платежей",
        description: "Четкий график платежей по договору",
        source: "RERA (www.dubailand.gov.ae)"
      }
    ]
  }
};

/**
 * Поиск информации в базе знаний
 * @param {string} query - Поисковый запрос
 * @param {string} country - 'spain' или 'dubai' (опционально)
 * @returns {Object} Результаты поиска с найденной информацией и источниками
 */
function searchKnowledgeBase(query, country = null) {
  const results = {
    found: false,
    data: null,
    sources: [],
    category: null
  };

  const lowerQuery = query.toLowerCase();

  // Определяем страну из запроса, если не указана
  if (!country) {
    if (lowerQuery.includes('испан') || lowerQuery.includes('spain') || lowerQuery.includes('барселон') || lowerQuery.includes('мадрид')) {
      country = 'spain';
    } else if (lowerQuery.includes('дубай') || lowerQuery.includes('dubai') || lowerQuery.includes('оаэ') || lowerQuery.includes('uae')) {
      country = 'dubai';
    }
  }

  // Поиск по налогам
  if (lowerQuery.includes('налог') || lowerQuery.includes('itp') || lowerQuery.includes('ajd') || lowerQuery.includes('ibi') || lowerQuery.includes('расход') || lowerQuery.includes('стоимость')) {
    if (country === 'spain' || !country) {
      results.found = true;
      results.data = knowledgeBase.taxesAndCosts.spain;
      results.category = 'taxes';
      results.sources = [
        ...knowledgeBase.sources.spain.official.filter(s => s.name.includes('Agencia Tributaria') || s.name.includes('Налоговая')),
        ...knowledgeBase.sources.spain.professional
      ];
    }
    if (country === 'dubai' || !country) {
      if (!results.found) {
        results.found = true;
        results.data = knowledgeBase.taxesAndCosts.dubai;
        results.category = 'taxes';
      } else {
        results.data = { ...results.data, dubai: knowledgeBase.taxesAndCosts.dubai };
      }
      results.sources = [
        ...knowledgeBase.sources.dubai.official.filter(s => s.name.includes('RERA') || s.name.includes('DLD')),
        ...results.sources
      ];
    }
  }

  // Поиск по ВНЖ
  if (lowerQuery.includes('внж') || lowerQuery.includes('виза') || lowerQuery.includes('residency') || lowerQuery.includes('visa') || lowerQuery.includes('golden visa')) {
    if (country === 'spain' || !country) {
      results.found = true;
      results.data = knowledgeBase.residency.spain;
      results.category = 'residency';
      results.sources = [
        ...knowledgeBase.sources.spain.official.filter(s => s.name.includes('иностранцев')),
        ...results.sources
      ];
    }
    if (country === 'dubai' || !country) {
      if (!results.found) {
        results.found = true;
        results.data = knowledgeBase.residency.dubai;
        results.category = 'residency';
      } else {
        results.data = { ...results.data, dubai: knowledgeBase.residency.dubai };
      }
      results.sources = [
        ...knowledgeBase.sources.dubai.official.filter(s => s.name.includes('ICA')),
        ...results.sources
      ];
    }
  }

  // Поиск по процессу покупки
  if (lowerQuery.includes('процесс') || lowerQuery.includes('покупк') || lowerQuery.includes('оформлен') || lowerQuery.includes('документ') || lowerQuery.includes('шаг')) {
    if (country === 'spain' || !country) {
      results.found = true;
      results.data = knowledgeBase.purchaseProcess.spain;
      results.category = 'process';
      results.sources = [
        ...knowledgeBase.sources.spain.professional,
        ...results.sources
      ];
    }
    if (country === 'dubai' || !country) {
      if (!results.found) {
        results.found = true;
        results.data = knowledgeBase.purchaseProcess.dubai;
        results.category = 'process';
      } else {
        results.data = { ...results.data, dubai: knowledgeBase.purchaseProcess.dubai };
      }
      results.sources = [
        ...knowledgeBase.sources.dubai.official.filter(s => s.name.includes('DLD') || s.name.includes('RERA')),
        ...results.sources
      ];
    }
  }

  // Поиск по типам недвижимости
  if (lowerQuery.includes('тип') || lowerQuery.includes('квартир') || lowerQuery.includes('вилл') || lowerQuery.includes('апартамент') || lowerQuery.includes('локац') || lowerQuery.includes('район')) {
    if (country === 'spain' || !country) {
      results.found = true;
      results.data = knowledgeBase.propertyTypes.spain;
      results.category = 'propertyTypes';
    }
    if (country === 'dubai' || !country) {
      if (!results.found) {
        results.found = true;
        results.data = knowledgeBase.propertyTypes.dubai;
        results.category = 'propertyTypes';
      } else {
        results.data = { ...results.data, dubai: knowledgeBase.propertyTypes.dubai };
      }
    }
  }

  // Поиск по рискам
  if (lowerQuery.includes('риск') || lowerQuery.includes('проверк') || lowerQuery.includes('опасн') || lowerQuery.includes('предупрежден')) {
    if (country === 'spain' || !country) {
      results.found = true;
      results.data = knowledgeBase.risks.spain;
      results.category = 'risks';
      results.sources = [
        ...knowledgeBase.sources.spain.professional,
        ...results.sources
      ];
    }
    if (country === 'dubai' || !country) {
      if (!results.found) {
        results.found = true;
        results.data = knowledgeBase.risks.dubai;
        results.category = 'risks';
      } else {
        results.data = { ...results.data, dubai: knowledgeBase.risks.dubai };
      }
      results.sources = [
        ...knowledgeBase.sources.dubai.official,
        ...results.sources
      ];
    }
  }

  return results;
}

/**
 * Получить источники для конкретной страны
 * @param {string} country - 'spain' или 'dubai'
 * @returns {Array} Массив источников
 */
function getSources(country) {
  if (country === 'spain') {
    return [
      ...knowledgeBase.sources.spain.official,
      ...knowledgeBase.sources.spain.professional
    ];
  } else if (country === 'dubai') {
    return knowledgeBase.sources.dubai.official;
  }
  return [];
}

module.exports = {
  knowledgeBase,
  searchKnowledgeBase,
  getSources
};


