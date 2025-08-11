
import { pool, CartItem } from '../lib/mysql'

export class CartService {
  static async getUserCart(userId: number): Promise<CartItem[]> {
    try {
      const connection = await pool.getConnection()
      const [items] = await connection.execute(
        'SELECT * FROM cart_items WHERE user_id = ? ORDER BY created_at DESC',
        [userId]
      ) as any[]
      
      connection.release()
      return items as CartItem[]
    } catch (error) {
      console.error('Ошибка загрузки корзины:', error)
      throw error
    }
  }

  static async addToCart(userId: number, product: any): Promise<void> {
    try {
      const connection = await pool.getConnection()
      
      // Проверяем, есть ли уже такой товар в корзине
      const [existingItems] = await connection.execute(
        'SELECT id, quantity FROM cart_items WHERE user_id = ? AND product_id = ?',
        [userId, product.id]
      ) as any[]
      
      if (existingItems.length > 0) {
        // Увеличиваем количество
        await connection.execute(
          'UPDATE cart_items SET quantity = quantity + 1 WHERE id = ?',
          [existingItems[0].id]
        )
      } else {
        // Добавляем новый товар
        await connection.execute(
          `INSERT INTO cart_items (user_id, product_id, product_name, product_price, product_image, product_category, quantity) 
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [
            userId,
            product.id,
            product.name,
            product.price,
            product.image,
            product.category,
            1
          ]
        )
      }
      
      connection.release()
    } catch (error) {
      console.error('Ошибка добавления в корзину:', error)
      throw error
    }
  }

  static async removeFromCart(itemId: number): Promise<void> {
    try {
      const connection = await pool.getConnection()
      await connection.execute('DELETE FROM cart_items WHERE id = ?', [itemId])
      connection.release()
    } catch (error) {
      console.error('Ошибка удаления из корзины:', error)
      throw error
    }
  }

  static async updateQuantity(itemId: number, quantity: number): Promise<void> {
    try {
      const connection = await pool.getConnection()
      
      if (quantity <= 0) {
        await connection.execute('DELETE FROM cart_items WHERE id = ?', [itemId])
      } else {
        await connection.execute(
          'UPDATE cart_items SET quantity = ? WHERE id = ?',
          [quantity, itemId]
        )
      }
      
      connection.release()
    } catch (error) {
      console.error('Ошибка обновления количества:', error)
      throw error
    }
  }

  static async clearCart(userId: number): Promise<void> {
    try {
      const connection = await pool.getConnection()
      await connection.execute('DELETE FROM cart_items WHERE user_id = ?', [userId])
      connection.release()
    } catch (error) {
      console.error('Ошибка очистки корзины:', error)
      throw error
    }
  }
}
