// Интеграция с Google Sheets API для загрузки данных о товарах
const GOOGLE_SHEETS_API_KEY = import.meta.env?.VITE_GOOGLE_SHEETS_API_KEY;
const SPREADSHEET_ID = import.meta.env?.VITE_SPREADSHEET_ID;

// Функция для выполнения запроса с retry логикой
const fetchWithRetry = async (url: string, retries = 3, delay = 1000): Promise<Response> => {
  for (let i = 0; i < retries; i++) {
    try {
      console.log(`🔄 Попытка ${i + 1} из ${retries}: ${url}`)
      
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 10000) // 10 секунд таймаут
      
      const response = await fetch(url, {
        signal: controller.signal,
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'ConstructionStore/1.0'
        }
      })
      
      clearTimeout(timeoutId)
      
      if (response.ok) {
        console.log(`✅ Успешный запрос с попытки ${i + 1}`)
        return response
      }
      
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      
    } catch (error) {
      console.warn(`❌ Попытка ${i + 1} неудачна:`, error.message)
      
      if (i === retries - 1) {
        throw error
      }
      
      // Экспоненциальная задержка между попытками
      await new Promise(resolve => setTimeout(resolve, delay * Math.pow(2, i)))
    }
  }
  
  throw new Error('Все попытки исчерпаны')
}

// Основная функция для получения товаров из Google Sheets с fallback на мок-данные
export const fetchProductsFromGoogleSheets = async () => {
  try {
    // Валидация наличия необходимых переменных окружения
    if (!GOOGLE_SHEETS_API_KEY || !SPREADSHEET_ID) {
      console.log('📊 Google Sheets API не настроен, используем мок-данные');
      return getMockProducts();
    }

    // Формирование запроса к Google Sheets API (пропускаем заголовки, берем данные)
    const range = 'A2:G1000'; // Диапазон данных без заголовков
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/${range}?key=${GOOGLE_SHEETS_API_KEY}`;
    
    console.log('📊 Запрос к Google Sheets API...');
    
    const response = await fetchWithRetry(url);
    
    const data = await response.json();
    console.log('✅ Данные получены от Google Sheets API');
    
    // Парсинг и валидация полученных данных
    if (data.values) {
      const products = data.values.map((row: string[], index: number) => ({
        id: row[0] || `product-${index + 1}`,
        name: row[1] || 'Товар без названия',
        description: row[2] || 'Описание отсутствует',
        price: parseFloat(row[3]) || 0,
        image: row[4] || 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAwIiBoZWlnaHQ9IjMwMCIgdmlld0JveD0iMCAwIDQwMCAzMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSI0MDAiIGhlaWdodD0iMzAwIiBmaWxsPSIjMzMzOEZGIi8+CjxjaXJjbGUgY3g9IjIwMCIgY3k9IjE1MCIgcj0iNDAiIGZpbGw9IndoaXRlIiBmaWxsLW9wYWNpdHk9IjAuMiIvPgo8cGF0aCBkPSJNMTcwIDEzMEgxODBWMTcwSDE3MFYxMzBaTTIyMCAxMzBIMjMwVjE3MEgyMjBWMTMwWiIgZmlsbD0id2hpdGUiLz4KPHN2ZyB4PSIxNzUiIHk9IjEzNSIgd2lkdGg9IjUwIiBoZWlnaHQ9IjMwIj4KPHA+CjxwYXRoIGQ9Ik0xMCAxNUwyNSA1TDQwIDE1TDI1IDI1TDEwIDE1WiIgZmlsbD0id2hpdGUiLz4KPC9wPgo8L3N2Zz4KPHRleHQgeD0iMjAwIiB5PSIyMDAiIGZvbnQtZmFtaWx5PSJBcmlhbCwgc2Fucy1zZXJpZiIgZm9udC1zaXplPSIxNCIgZmlsbD0id2hpdGUiIGZvbnQtd2VpZ2h0PSI1MDAiIHRleHQtYW5jaG9yPSJtaWRkbGUiPtCi0L7QstCw0YA8L3RleHQ+Cjx0ZXh0IHg9IjIwMCIgeT0iMjIwIiBmb250LWZhbWlseT0iQXJpYWwsIHNhbnMtc2VyaWYiIGZvbnQtc2l6ZT0iMTIiIGZpbGw9IndoaXRlIiBmaWxsLW9wYWNpdHk9IjAuOCIgdGV4dC1hbmNob3I9Im1pZGRsZSI+0J7RgtGB0YPRgtGB0YLQstGD0LXRgiDQuNC30L7QsdGA0LDQttC10L3QuNC1PC90ZXh0Pgo8L3N2Zz4=',
        category: row[5]?.trim() || 'Общие товары', // Нормализация категории
        inStock: row[6]?.toLowerCase() === 'да' || row[6]?.toLowerCase() === 'true' || row[6] === '1',
      })).filter(product => product.name !== 'Товар без названия'); // Фильтрация пустых строк
      
      console.log('📦 Загружено товаров из Google Sheets:', products.length);
      return products;
    }
    
    console.log('📊 Нет данных в Google Sheets, используем мок-данные');
    return getMockProducts();
  } catch (error) {
    console.warn('❌ Не удалось загрузить данные из Google Sheets:', error.message);
    
    if (error.message.includes('ERR_CONNECTION_RESET')) {
      console.log('🔄 Проблема с сетевым соединением, используем мок-данные');
    } else if (error.message.includes('AbortError')) {
      console.log('⏱️ Превышено время ожидания, используем мок-данные');
    } else {
      console.log('📊 Используем мок-данные из-за ошибки API');
    }
    
    return getMockProducts(); // Резервные данные при ошибке
  }
};

// Мок-данные для разработки и резервного использования
const DEFAULT_PRODUCT_IMAGE = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAwIiBoZWlnaHQ9IjMwMCIgdmlld0JveD0iMCAwIDQwMCAzMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSI0MDAiIGhlaWdodD0iMzAwIiBmaWxsPSIjMzMzOEZGIi8+CjxjaXJjbGUgY3g9IjIwMCIgY3k9IjE1MCIgcj0iNDAiIGZpbGw9IndoaXRlIiBmaWxsLW9wYWNpdHk9IjAuMiIvPgo8cGF0aCBkPSJNMTcwIDEzMEgxODBWMTcwSDE3MFYxMzBaTTIyMCAxMzBIMjMwVjE3MEgyMjBWMTMwWiIgZmlsbD0id2hpdGUiLz4KPHN2ZyB4PSIxNzUiIHk9IjEzNSIgd2lkdGg9IjUwIiBoZWlnaHQ9IjMwIj4KPHA+CjxwYXRoIGQ9Ik0xMCAxNUwyNSA1TDQwIDE1TDI1IDI1TDEwIDE1WiIgZmlsbD0id2hpdGUiLz4KPC9wPgo8L3N2Zz4KPHRleHQgeD0iMjAwIiB5PSIyMDAiIGZvbnQtZmFtaWx5PSJBcmlhbCwgc2Fucy1zZXJpZiIgZm9udC1zaXplPSIxNCIgZmlsbD0id2hpdGUiIGZvbnQtd2VpZ2h0PSI1MDAiIHRleHQtYW5jaG9yPSJtaWRkbGUiPtCi0L7QstCw0YA8L3RleHQ+Cjx0ZXh0IHg9IjIwMCIgeT0iMjIwIiBmb250LWZhbWlseT0iQXJpYWwsIHNhbnMtc2VyaWYiIGZvbnQtc2l6ZT0iMTIiIGZpbGw9IndoaXRlIiBmaWxsLW9wYWNpdHk9IjAuOCIgdGV4dC1hbmNob3I9Im1pZGRsZSI+0J7RgtGB0YPRgtGB0YLQstGD0LXRgiDQuNC30L7QsdGA0LDQttC10L3QuNC1PC90ZXh0Pgo8L3N2Zz4=';

export const getMockProducts = () => [
  {
    id: '1',
    name: 'Цемент М400 50кг',
    description: 'Высококачественный портландцемент для строительных работ',
    price: 320,
    image: DEFAULT_PRODUCT_IMAGE,
    category: 'Стройматериалы',
    inStock: true,
  },
  {
    id: '2',
    name: 'Кирпич красный',
    description: 'Керамический кирпич для кладки стен',
    price: 15,
    image: DEFAULT_PRODUCT_IMAGE,
    category: 'Стройматериалы',
    inStock: true,
  },
  {
    id: '3',
    name: 'Дрель ударная Bosch',
    description: 'Профессиональная ударная дрель мощностью 750Вт',
    price: 4500,
    image: DEFAULT_PRODUCT_IMAGE,
    category: 'Инструменты',
    inStock: true,
  },
  {
    id: '4',
    name: 'Смеситель для кухни',
    description: 'Однорычажный смеситель с поворотным изливом',
    price: 2800,
    image: DEFAULT_PRODUCT_IMAGE,
    category: 'Сантехника',
    inStock: false,
  },
  {
    id: '5',
    name: 'Кабель ВВГ 3х2.5',
    description: 'Электрический кабель для внутренней проводки',
    price: 45,
    image: DEFAULT_PRODUCT_IMAGE,
    category: 'Электрика',
    inStock: true,
  },
  {
    id: '6',
    name: 'Шкаф-купе 2м',
    description: 'Двухдверный шкаф-купе с зеркальными фасадами',
    price: 18500,
    image: DEFAULT_PRODUCT_IMAGE,
    category: 'Мебель',
    inStock: true,
  },
  {
    id: '7',
    name: 'Диван угловой',
    description: 'Удобный угловой диван с мягкой обивкой',
    price: 25000,
    image: DEFAULT_PRODUCT_IMAGE,
    category: 'Интерьер',
    inStock: true,
  },
  {
    id: '8',
    name: 'Стол обеденный',
    description: 'Деревянный обеденный стол на 6 персон',
    price: 12000,
    image: DEFAULT_PRODUCT_IMAGE,
    category: 'Интерьер',
    inStock: true,
  },
  {
    id: '9',
    name: 'Болты М8х50',
    description: 'Оцинкованные болты с гайками и шайбами',
    price: 5,
    image: DEFAULT_PRODUCT_IMAGE,
    category: 'Крепежи',
    inStock: true,
  },
  {
    id: '10',
    name: 'Люстра потолочная',
    description: 'Современная LED люстра для гостиной',
    price: 8500,
    image: DEFAULT_PRODUCT_IMAGE,
    category: 'Интерьер',
    inStock: true,
  },
];

// Функция получения категорий товаров с оптимизированными изображениями
export const getMockCategories = () => [
  {
    id: 'stroy',
    name: 'Стройматериалы',
    description: 'Цемент, кирпич, блоки, сухие смеси',
    image: DEFAULT_PRODUCT_IMAGE,
  },
  {
    id: 'electrical',
    name: 'Электрика',
    description: 'Кабели, выключатели, розетки, автоматы',
    image: DEFAULT_PRODUCT_IMAGE,
  },
  {
    id: 'tools',
    name: 'Инструменты',
    description: 'Электроинструмент, ручной инструмент',
    image: DEFAULT_PRODUCT_IMAGE,
  },
  {
    id: 'plumbing',
    name: 'Сантехника',
    description: 'Смесители, трубы, фитинги, унитазы',
    image: DEFAULT_PRODUCT_IMAGE,
  },
  {
    id: 'furniture',
    name: 'Мебель',
    description: 'Шкафы, столы, стулья, кровати',
    image: DEFAULT_PRODUCT_IMAGE,
  },
  {
    id: 'interior',
    name: 'Интерьер',
    description: 'Мебель, декор, освещение, текстиль',
    image: DEFAULT_PRODUCT_IMAGE,
  },
  {
    id: 'fasteners',
    name: 'Крепежи',
    description: 'Винты, болты, гайки, дюбели',
    image: DEFAULT_PRODUCT_IMAGE,
  },
];