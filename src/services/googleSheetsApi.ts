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
        image: row[4] || 'https://images.pexels.com/photos/1198802/pexels-photo-1198802.jpeg',
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
export const getMockProducts = () => [
  {
    id: '1',
    name: 'Цемент М400 50кг',
    description: 'Высококачественный портландцемент для строительных работ',
    price: 320,
    image: '',
    category: 'Стройматериалы',
    inStock: true,
  },
  {
    id: '2',
    name: 'Кирпич красный',
    description: 'Керамический кирпич для кладки стен',
    price: 15,
    image: '',
    category: 'Стройматериалы',
    inStock: true,
  },
  {
    id: '3',
    name: 'Дрель ударная Bosch',
    description: 'Профессиональная ударная дрель мощностью 750Вт',
    price: 4500,
    image: '',
    category: 'Инструменты',
    inStock: true,
  },
  {
    id: '4',
    name: 'Смеситель для кухни',
    description: 'Однорычажный смеситель с поворотным изливом',
    price: 2800,
    image: '',
    category: 'Сантехника',
    inStock: false,
  },
  {
    id: '5',
    name: 'Кабель ВВГ 3х2.5',
    description: 'Электрический кабель для внутренней проводки',
    price: 45,
    image: '',
    category: 'Электрика',
    inStock: true,
  },
  {
    id: '6',
    name: 'Шкаф-купе 2м',
    description: 'Двухдверный шкаф-купе с зеркальными фасадами',
    price: 18500,
    image: '',
    category: 'Мебель',
    inStock: true,
  },
  {
    id: '7',
    name: 'Диван угловой',
    description: 'Удобный угловой диван с мягкой обивкой',
    price: 25000,
    image: '',
    category: 'Интерьер',
    inStock: true,
  },
  {
    id: '8',
    name: 'Стол обеденный',
    description: 'Деревянный обеденный стол на 6 персон',
    price: 12000,
    image: '',
    category: 'Интерьер',
    inStock: true,
  },
  {
    id: '9',
    name: 'Болты М8х50',
    description: 'Оцинкованные болты с гайками и шайбами',
    price: 5,
    image: '',
    category: 'Крепежи',
    inStock: true,
  },
  {
    id: '10',
    name: 'Люстра потолочная',
    description: 'Современная LED люстра для гостиной',
    price: 8500,
    image: '',
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
    image: '',
  },
  {
    id: 'electrical',
    name: 'Электрика',
    description: 'Кабели, выключатели, розетки, автоматы',
    image: '',
  },
  {
    id: 'tools',
    name: 'Инструменты',
    description: 'Электроинструмент, ручной инструмент',
    image: '',
  },
  {
    id: 'plumbing',
    name: 'Сантехника',
    description: 'Смесители, трубы, фитинги, унитазы',
    image: '',
  },
  {
    id: 'furniture',
    name: 'Мебель',
    description: 'Шкафы, столы, стулья, кровати',
    image: '',
  },
  {
    id: 'interior',
    name: 'Интерьер',
    description: 'Мебель, декор, освещение, текстиль',
    image: '',
  },
  {
    id: 'fasteners',
    name: 'Крепежи',
    description: 'Винты, болты, гайки, дюбели',
    image: '',
  },
];