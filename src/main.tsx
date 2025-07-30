import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Проверка поддержки современных браузеров
if (!window.fetch) {
  console.error('❌ Ваш браузер не поддерживает современные веб-стандарты. Пожалуйста, обновите браузер.');
}

// Глобальная обработка ошибок для лучшей отладки
window.addEventListener('error', (event) => {
  // Игнорируем ошибки Facebook Pixel и других внешних скриптов
  if (event.filename && (
    event.filename.includes('facebook.com') ||
    event.filename.includes('fbevents.js') ||
    event.filename.includes('bolt.new') ||
    event.filename.includes('sentry') ||
    event.filename.includes('debug-logger') ||
    event.message.includes('getReplayId') ||
    event.message.includes('Sentry Logger')
  )) {
    return;
  }
  console.error('🚨 Глобальная ошибка:', event.error);
});

window.addEventListener('unhandledrejection', (event) => {
  // Игнорируем ошибки внешних сервисов
  if (event.reason && typeof event.reason === 'string' && (
    event.reason.includes('facebook.com') ||
    event.reason.includes('ERR_CONNECTION_RESET') ||
    event.reason.includes('sentry') ||
    event.reason.includes('getReplayId')
  )) {
    return;
  }
  console.error('🚨 Необработанное отклонение Promise:', event.reason);
});

// Подавляем логи Sentry в консоли
const originalConsoleLog = console.log;
const originalConsoleError = console.error;

console.log = (...args) => {
  const message = args.join(' ');
  if (message.includes('Sentry Logger') || 
      message.includes('Flushing outcomes') ||
      message.includes('No outcomes to send') ||
      message.includes('log entries are not shown') ||
      message.includes('debug-logger')) {
    return;
  }
  originalConsoleLog.apply(console, args);
};

console.error = (...args) => {
  const message = args.join(' ');
  if (message.includes('getReplayId') ||
      message.includes('Sentry Logger') ||
      message.includes('instrumentation handler')) {
    return;
  }
  originalConsoleError.apply(console, args);
};
// Получаем корневой элемент с проверкой
const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error('❌ Не найден корневой элемент #root');
}

// Создаем и рендерим приложение
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
