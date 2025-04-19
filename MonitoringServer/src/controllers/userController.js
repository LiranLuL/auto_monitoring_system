const { pool } = require('../db');

/**
 * Получение профиля пользователя
 */
exports.getUserProfile = async (req, res) => {
  const userId = req.user.id;
  
  try {
    const query = `
      SELECT id, username, email, phone, role, created_at 
      FROM users 
      WHERE id = $1
    `;
    
    const result = await pool.query(query, [userId]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Пользователь не найден' });
    }
    
    // Не отправляем пароль в ответе
    const user = result.rows[0];
    
    res.status(200).json({ user });
    
  } catch (error) {
    console.error('Ошибка при получении профиля:', error);
    res.status(500).json({ message: 'Ошибка сервера при получении профиля' });
  }
};

/**
 * Обновление профиля пользователя
 */
exports.updateUserProfile = async (req, res) => {
  const userId = req.user.id;
  const { username, email, phone } = req.body;
  
  // Проверка обязательных полей
  if (!username && !email && !phone) {
    return res.status(400).json({ message: 'Необходимо указать хотя бы одно поле для обновления' });
  }
  
  try {
    // Формируем запрос с учетом переданных полей
    let updateFields = [];
    let values = [];
    let paramIndex = 1;
    
    if (username) {
      updateFields.push(`username = $${paramIndex}`);
      values.push(username);
      paramIndex++;
    }
    
    if (email) {
      updateFields.push(`email = $${paramIndex}`);
      values.push(email);
      paramIndex++;
    }
    
    if (phone) {
      updateFields.push(`phone = $${paramIndex}`);
      values.push(phone);
      paramIndex++;
    }
    
    // Добавляем id пользователя в массив параметров
    values.push(userId);
    
    const query = `
      UPDATE users 
      SET ${updateFields.join(', ')} 
      WHERE id = $${paramIndex}
      RETURNING id, username, email, phone, role, created_at
    `;
    
    const result = await pool.query(query, values);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Пользователь не найден' });
    }
    
    res.status(200).json({ 
      message: 'Профиль успешно обновлен', 
      user: result.rows[0] 
    });
    
  } catch (error) {
    console.error('Ошибка при обновлении профиля:', error);
    res.status(500).json({ message: 'Ошибка сервера при обновлении профиля' });
  }
};

/**
 * Удаление профиля пользователя
 */
exports.deleteUserProfile = async (req, res) => {
  const userId = req.user.id;
  
  try {
    // Начинаем транзакцию
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      
      // Удаляем связанные с пользователем данные (в будущем здесь могут быть дополнительные запросы)
      
      // Удаляем самого пользователя
      const deleteQuery = 'DELETE FROM users WHERE id = $1 RETURNING id';
      const result = await client.query(deleteQuery, [userId]);
      
      if (result.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(404).json({ message: 'Пользователь не найден' });
      }
      
      await client.query('COMMIT');
      
      res.status(200).json({ message: 'Профиль успешно удален' });
      
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
    
  } catch (error) {
    console.error('Ошибка при удалении профиля:', error);
    res.status(500).json({ message: 'Ошибка сервера при удалении профиля' });
  }
}; 