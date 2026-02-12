#!/bin/bash
# Скрипт для экспорта сессии WhatsApp с локальной машины

echo "📦 Экспорт сессии WhatsApp..."

if [ ! -d ".wwebjs_auth" ]; then
    echo "❌ Папка .wwebjs_auth не найдена!"
    echo "💡 Убедитесь, что вы находитесь в корневой директории проекта"
    exit 1
fi

# Создаем архив
tar -czf whatsapp-session.tar.gz .wwebjs_auth/

if [ -f "whatsapp-session.tar.gz" ]; then
    echo "✅ Сессия экспортирована в whatsapp-session.tar.gz"
    echo "📁 Размер архива: $(du -h whatsapp-session.tar.gz | cut -f1)"
    echo ""
    echo "📤 Теперь загрузите этот файл на Railway:"
    echo "   1. В Railway Dashboard создайте Volume: /app/.wwebjs_auth"
    echo "   2. Подключитесь к контейнеру: railway run bash"
    echo "   3. Загрузите файл и распакуйте: tar -xzf whatsapp-session.tar.gz"
else
    echo "❌ Ошибка при создании архива"
    exit 1
fi

