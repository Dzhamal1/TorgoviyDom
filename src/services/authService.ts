
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { pool, User } from '../lib/mysql'

const JWT_SECRET = process.env.VITE_JWT_SECRET || 'your-secret-key-here'

export class AuthService {
  static async register(email: string, password: string, fullName: string, phone?: string): Promise<{ user: User; token: string }> {
    try {
      const connection = await pool.getConnection()
      
      // Проверяем, существует ли пользователь
      const [existingUsers] = await connection.execute(
        'SELECT id FROM users WHERE email = ?',
        [email]
      ) as any[]
      
      if (existingUsers.length > 0) {
        connection.release()
        throw new Error('Пользователь с таким email уже существует')
      }
      
      // Хешируем пароль
      const passwordHash = await bcrypt.hash(password, 10)
      
      // Создаем пользователя
      const [result] = await connection.execute(
        'INSERT INTO users (email, password_hash, full_name, phone) VALUES (?, ?, ?, ?)',
        [email, passwordHash, fullName, phone || null]
      ) as any[]
      
      // Получаем созданного пользователя
      const [users] = await connection.execute(
        'SELECT id, email, full_name, phone, address, is_admin, created_at, updated_at FROM users WHERE id = ?',
        [result.insertId]
      ) as any[]
      
      connection.release()
      
      const user = users[0] as User
      const token = jwt.sign({ userId: user.id, email: user.email }, JWT_SECRET, { expiresIn: '7d' })
      
      return { user, token }
    } catch (error) {
      throw error
    }
  }
  
  static async login(email: string, password: string): Promise<{ user: User; token: string }> {
    try {
      const connection = await pool.getConnection()
      
      // Находим пользователя
      const [users] = await connection.execute(
        'SELECT * FROM users WHERE email = ?',
        [email]
      ) as any[]
      
      connection.release()
      
      if (users.length === 0) {
        throw new Error('Неверный email или пароль')
      }
      
      const user = users[0]
      
      // Проверяем пароль
      const isValidPassword = await bcrypt.compare(password, user.password_hash)
      if (!isValidPassword) {
        throw new Error('Неверный email или пароль')
      }
      
      // Создаем токен
      const token = jwt.sign({ userId: user.id, email: user.email }, JWT_SECRET, { expiresIn: '7d' })
      
      // Убираем хеш пароля из ответа
      delete user.password_hash
      
      return { user, token }
    } catch (error) {
      throw error
    }
  }
  
  static async verifyToken(token: string): Promise<User | null> {
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as any
      
      const connection = await pool.getConnection()
      const [users] = await connection.execute(
        'SELECT id, email, full_name, phone, address, is_admin, created_at, updated_at FROM users WHERE id = ?',
        [decoded.userId]
      ) as any[]
      
      connection.release()
      
      return users.length > 0 ? users[0] : null
    } catch (error) {
      return null
    }
  }
  
  static async updateProfile(userId: number, updates: Partial<User>): Promise<User> {
    try {
      const connection = await pool.getConnection()
      
      const fields = []
      const values = []
      
      if (updates.full_name) {
        fields.push('full_name = ?')
        values.push(updates.full_name)
      }
      if (updates.phone) {
        fields.push('phone = ?')
        values.push(updates.phone)
      }
      if (updates.address) {
        fields.push('address = ?')
        values.push(updates.address)
      }
      
      values.push(userId)
      
      await connection.execute(
        `UPDATE users SET ${fields.join(', ')} WHERE id = ?`,
        values
      )
      
      // Получаем обновленного пользователя
      const [users] = await connection.execute(
        'SELECT id, email, full_name, phone, address, is_admin, created_at, updated_at FROM users WHERE id = ?',
        [userId]
      ) as any[]
      
      connection.release()
      
      return users[0] as User
    } catch (error) {
      throw error
    }
  }
}
