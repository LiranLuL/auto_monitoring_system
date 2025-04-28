#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import sqlite3
import os
import logging
from database import Database
from predictive_analyzer import PredictiveAnalyzer

# Настройка логирования
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger("EnsureRecommendations")

def ensure_recommendations_exist():
    """
    Проверяет наличие рекомендаций в базе данных и добавляет их, если необходимо
    """
    db = Database()
    analyzer = PredictiveAnalyzer()
    
    # Получаем список автомобилей
    vehicles = db.get_all_vehicles()
    
    if not vehicles:
        logger.warning("Нет автомобилей в базе данных. Сначала запустите migrate_data.py")
        return
    
    logger.info(f"Найдено {len(vehicles)} автомобилей в базе")
    
    # Проверяем каждый автомобиль на наличие рекомендаций
    for vehicle in vehicles:
        vehicle_id = vehicle.get('id')
        
        # Получаем последний анализ для автомобиля
        query = """
        SELECT * FROM vehicle_analysis 
        WHERE vehicle_id = ? 
        ORDER BY created_at DESC 
        LIMIT 1
        """
        
        result = db.execute_query(query, (vehicle_id,))
        
        if not result:
            # Если анализа нет, создаем новый
            logger.info(f"Нет анализа для автомобиля {vehicle_id}. Создаем новый...")
            analyzer.run_analysis(vehicle_id)
            continue
        
        # Проверяем, есть ли рекомендации
        recommendations = result[0].get('recommendations')
        
        if not recommendations:
            # Если рекомендаций нет, обновляем запись с дефолтными рекомендациями
            logger.info(f"Нет рекомендаций для автомобиля {vehicle_id}. Обновляем...")
            default_recommendations = [
                "Рекомендуется регулярная проверка уровня масла",
                "Проверьте давление в шинах при следующем ТО",
                "Рекомендуется диагностика двигателя. Обнаружены признаки износа",
                "Регулярно проверяйте состояние тормозной системы"
            ]
            
            # Конвертируем список в строку с разделителями
            recommendations_str = ','.join(default_recommendations)
            
            # Обновляем запись в базе данных
            update_query = """
            UPDATE vehicle_analysis 
            SET recommendations = ? 
            WHERE id = ?
            """
            
            db.execute_query(update_query, (recommendations_str, result[0].get('id')), fetch=False)
            logger.info(f"Добавлены рекомендации для автомобиля {vehicle_id}")
        else:
            logger.info(f"Для автомобиля {vehicle_id} уже есть рекомендации: {recommendations}")
    
    logger.info("Проверка и обновление рекомендаций завершены")

if __name__ == "__main__":
    ensure_recommendations_exist()
    logger.info("Скрипт успешно выполнен") 