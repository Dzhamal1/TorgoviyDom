import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css'
import { testConnection, createTables } from './lib/mysql'

// Инициализация базы данных
const initializeDatabase = async () => {
  try {
    const isConnected = await testConnection()
    if (isConnected) {
      await createTables()
      console.log('✅ База данных успешно инициализирована')
    }
  } catch (error) {
    console.error('❌ Ошибка инициализации базы данных:', error)
  }
}

initializeDatabase();

// Импортируем простой тест Supabase
import './lib/simple-test';

// Проверка поддержки современных браузеров
if (!window.fetch) {
  console.error('❌ Ваш браузер не поддерживает современные веб-стандарты. Пожалуйста, обновите браузер.');
}

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
