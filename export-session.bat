@echo off
REM Скрипт для экспорта сессии WhatsApp с локальной машины (Windows)

echo 📦 Экспорт сессии WhatsApp...

if not exist ".wwebjs_auth" (
    echo ❌ Папка .wwebjs_auth не найдена!
    echo 💡 Убедитесь, что вы находитесь в корневой директории проекта
    exit /b 1
)

REM Создаем архив (требуется tar, доступен в Windows 10+)
tar -czf whatsapp-session.tar.gz .wwebjs_auth\

if exist "whatsapp-session.tar.gz" (
    echo ✅ Сессия экспортирована в whatsapp-session.tar.gz
    echo.
    echo 📤 Теперь загрузите этот файл на Railway:
    echo    1. В Railway Dashboard создайте Volume: /app/.wwebjs_auth
    echo    2. Подключитесь к контейнеру: railway run bash
    echo    3. Загрузите файл и распакуйте: tar -xzf whatsapp-session.tar.gz
) else (
    echo ❌ Ошибка при создании архива
    exit /b 1
)

