
import mysql from 'mysql2/promise'

// Настройки подключения к MySQL
const dbConfig = {
  host: process.env.VITE_DB_HOST || 'localhost',
  port: parseInt(process.env.VITE_DB_PORT || '3306'),
  user: process.env.VITE_DB_USER || 'root',
  password: process.env.VITE_DB_PASSWORD || '',
  database: process.env.VITE_DB_NAME || 'construction_store',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  acquireTimeout: 60000,
  timeout: 60000,
}

// Создание пула соединений
export const pool = mysql.createPool(dbConfig)

// Функция для проверки подключения
export const testConnection = async () => {
  try {
    const connection = await pool.getConnection()
    console.log('✅ Подключение к MySQL установлено')
    connection.release()
    return true
  } catch (error) {
    console.error('❌ Ошибка подключения к MySQL:', error)
    return false
  }
}

// Функция для создания таблиц
export const createTables = async () => {
  try {
    const connection = await pool.getConnection()
    
    // Создание таблицы пользователей
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        full_name VARCHAR(255) NOT NULL,
        phone VARCHAR(50),
        address TEXT,
        is_admin BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `)
    
    // Создание таблицы корзины
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS cart_items (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        product_id VARCHAR(255) NOT NULL,
        product_name VARCHAR(255) NOT NULL,
        product_price DECIMAL(10,2) NOT NULL,
        product_image TEXT,
        product_category VARCHAR(100),
        quantity INT NOT NULL DEFAULT 1,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `)
    
    // Создание таблицы сообщений
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS contact_messages (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        phone VARCHAR(50) NOT NULL,
        email VARCHAR(255),
        message TEXT NOT NULL,
        preferred_contact ENUM('phone', 'whatsapp', 'telegram') DEFAULT 'phone',
        status ENUM('new', 'processed') DEFAULT 'new',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `)
    
    // Создание таблицы заказов
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS orders (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT,
        customer_name VARCHAR(255) NOT NULL,
        customer_phone VARCHAR(50) NOT NULL,
        customer_email VARCHAR(255),
        customer_address TEXT NOT NULL,
        items JSON NOT NULL,
        total_amount DECIMAL(10,2) NOT NULL,
        status ENUM('new', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled') DEFAULT 'new',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
      )
    `)
    
    // Создание администратора по умолчанию
    await connection.execute(`
      INSERT IGNORE INTO users (email, password_hash, full_name, is_admin) 
      VALUES ('admin@example.com', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Администратор', TRUE)
    `)
    
    connection.release()
    console.log('✅ Таблицы созданы успешно')
    
  } catch (error) {
    console.error('❌ Ошибка создания таблиц:', error)
    throw error
  }
}

// Типы для TypeScript
export interface User {
  id: number
  email: string
  full_name: string
  phone?: string
  address?: string
  is_admin: boolean
  created_at: string
  updated_at: string
}

export interface CartItem {
  id: number
  user_id: number
  product_id: string
  product_name: string
  product_price: number
  product_image: string
  product_category: string
  quantity: number
  created_at: string
}

export interface ContactMessage {
  id: number
  name: string
  phone: string
  email?: string
  message: string
  preferred_contact: 'phone' | 'whatsapp' | 'telegram'
  status: 'new' | 'processed'
  created_at: string
}

export interface Order {
  id: number
  user_id?: number
  customer_name: string
  customer_phone: string
  customer_email?: string
  customer_address: string
  items: any[]
  total_amount: number
  status: 'new' | 'confirmed' | 'processing' | 'shipped' | 'delivered' | 'cancelled'
  created_at: string
}
