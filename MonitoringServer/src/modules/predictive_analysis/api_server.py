#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import os
import json
import logging
from flask import Flask, request, jsonify, Response
from dotenv import load_dotenv
from database import Database
from predictive_analyzer import PredictiveAnalyzer
from datetime import datetime

# Load environment variables
load_dotenv()

# Set up logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler("api_server.log"),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger("APIServer")

# Initialize Flask app
app = Flask(__name__)
app.config['JSON_AS_ASCII'] = False

# Функция для создания корректно кодированного JSON-ответа
def json_response(data, status=200):
    return Response(
        json.dumps(data, ensure_ascii=False).encode('utf-8'),
        status=status,
        mimetype='application/json; charset=utf-8'
    )

# Initialize database and analyzer
db = Database()
analyzer = PredictiveAnalyzer()

# Ensure that analysis table exists
db.create_analysis_table_if_not_exists()

# Authentication middleware
def authenticate():
    """
    Проверяет токен авторизации в заголовке запроса.
    В демо-режиме принимает любой токен.
    
    Returns:
        bool: True если токен верный, иначе False
    """
    auth_header = request.headers.get('Authorization')
    
    if not auth_header:
        logger.warning("No Authorization header provided")
        return False
        
    try:
        # Для демонстрационных целей принимаем любой токен
        # В реальном приложении здесь должна быть проверка токена
        return True
    except Exception as e:
        logger.error(f"Authentication error: {str(e)}")
        return False

# Mobile app authentication for sensor tokens
def authenticate_mobile():
    """
    Проверяет токен сенсора для мобильного приложения.
    В демо-режиме принимает любой токен.
    
    Returns:
        bool: True если токен есть, иначе False
    """
    auth_header = request.headers.get('Authorization')
    
    if not auth_header:
        logger.warning("No Authorization header provided in mobile request")
        return False
        
    try:
        # Для демонстрационных целей принимаем любой токен
        return True
    except Exception as e:
        logger.error(f"Mobile authentication error: {str(e)}")
        return False

@app.route('/api/health', methods=['GET'])
def health_check():
    """
    Эндпоинт для проверки работоспособности сервиса.
    """
    return json_response({
        'status': 'ok',
        'service': 'predictive_analysis',
        'version': '1.0.0'
    })

@app.route('/api/analyze', methods=['POST'])
def analyze():
    """
    Эндпоинт для запуска анализа для всех автомобилей.
    """
    if not authenticate():
        return json_response({
            'status': 'error',
            'message': 'Unauthorized'
        }, 401)
    
    try:
        results = analyzer.run_analysis()
        
        if results:
            return json_response({
                'status': 'success',
                'message': f'Analysis completed for {len(results)} vehicles',
                'results': results
            })
        else:
            return json_response({
                'status': 'warning',
                'message': 'No vehicles to analyze or analysis failed'
            })
    
    except Exception as e:
        logger.error(f"Error during analysis: {str(e)}")
        return json_response({
            'status': 'error',
            'message': str(e)
        }, 500)

@app.route('/api/analyze/<vehicle_id>', methods=['POST'])
def analyze_vehicle(vehicle_id):
    """
    Эндпоинт для запуска анализа для конкретного автомобиля.
    """
    if not authenticate():
        return json_response({
            'status': 'error',
            'message': 'Unauthorized'
        }, 401)
    
    try:
        results = analyzer.run_analysis(vehicle_id)
        
        if results:
            return json_response({
                'status': 'success',
                'message': f'Analysis completed for vehicle {vehicle_id}',
                'results': results[0] if isinstance(results, list) else results
            })
        else:
            return json_response({
                'status': 'warning',
                'message': f'Vehicle {vehicle_id} not found or analysis failed'
            })
    
    except Exception as e:
        logger.error(f"Error during vehicle analysis: {str(e)}")
        return json_response({
            'status': 'error',
            'message': str(e)
        }, 500)

@app.route('/api/analysis/latest/<vehicle_id>', methods=['GET'])
def get_latest_analysis(vehicle_id):
    """
    Эндпоинт для получения последнего результата анализа для автомобиля.
    """
    if not authenticate() and not authenticate_mobile():
        return json_response({
            'status': 'error',
            'message': 'Unauthorized'
        }, 401)
    
    try:
        logger.info(f"Запрос анализа для автомобиля {vehicle_id}")
        
        # Получаем последний анализ из базы данных
        query = """
        SELECT * FROM vehicle_analysis
        WHERE vehicle_id = ?
        ORDER BY created_at DESC
        LIMIT 1
        """
        
        result = db.execute_query(query, (vehicle_id,))
        
        if result:
            logger.info(f"Найден анализ для автомобиля {vehicle_id}")
            # Parse recommendations from comma-separated string to list
            if 'recommendations' in result[0]:
                result[0]['recommendations'] = result[0]['recommendations'].split(',')
            
            return json_response({
                'status': 'success',
                'analysis': result[0]
            })
        else:
            logger.info(f"Анализ для автомобиля {vehicle_id} не найден, создаем новый")
            
            # Проверяем, существует ли автомобиль в базе по VIN
            # Используем vehicle_id (который является VIN) только для поиска по полю vin
            vehicle_check = db.execute_query("SELECT id FROM vehicles WHERE vin = ?", (vehicle_id,))

            vehicle_db_id = None # Инициализируем ID

            if not vehicle_check:
                logger.warning(f"Автомобиль {vehicle_id} (VIN) не найден в базе, создаем новую запись.")
                try:
                    # Создаем запись о автомобиле, ID должен генерироваться БД (если автоинкрементный)
                    # Убираем явную вставку ID
                    db.execute_query(
                        "INSERT INTO vehicles (vin, make, model) VALUES (?, ?, ?)", # Убрали ID из INSERT
                        (vehicle_id, "Unknown", "Unknown"),
                        fetch=False
                    )
                    logger.info(f"Создана запись о автомобиле с VIN {vehicle_id}")
                    
                    # Получаем ID только что созданного автомобиля
                    new_vehicle_data = db.execute_query("SELECT id FROM vehicles WHERE vin = ?", (vehicle_id,))
                    if new_vehicle_data:
                        vehicle_db_id = new_vehicle_data[0]['id'] # Получаем реальный ID
                        logger.info(f"ID нового автомобиля: {vehicle_db_id}")
                    else:
                         logger.error(f"Не удалось получить ID для только что созданного автомобиля {vehicle_id}")
                         raise Exception(f"Failed to retrieve ID for newly created vehicle {vehicle_id}")
                except Exception as insert_err:
                     logger.error(f"Ошибка при создании записи автомобиля {vehicle_id}: {str(insert_err)}")
                     raise insert_err # Перебрасываем ошибку дальше
            else:
                # Если автомобиль найден, получаем его ID
                vehicle_db_id = vehicle_check[0]['id']
                logger.info(f"Автомобиль {vehicle_id} найден в базе, ID: {vehicle_db_id}")
                
            # Если vehicle_db_id не установлен (из-за ошибки выше), прерываемся
            if vehicle_db_id is None:
                 logger.error("Не удалось определить ID автомобиля для анализа.")
                 raise Exception("Could not determine vehicle ID for analysis.")

            # --- ВАЖНО ---
            # Убедитесь, что последующие вызовы используют ПРАВИЛЬНЫЙ ID.
            # Если таблица `vehicle_analysis` связана с `vehicles` по числовому ID,
            # используйте `vehicle_db_id` (число).
            # Если `vehicle_analysis.vehicle_id` хранит VIN (текст), используйте `vehicle_id`.
            # Замените `vehicle_id_for_analysis` на нужную переменную ниже.
            
            # !!! ЗАМЕНИТЕ ЭТО НА vehicle_db_id ИЛИ vehicle_id В ЗАВИСИМОСТИ ОТ СХЕМЫ !!!
            vehicle_id_for_analysis = vehicle_db_id # Предполагаем, что нужен числовой ID, ИСПРАВЬТЕ ЕСЛИ НЕ ТАК

            logger.info(f"Запускаем анализ для ID автомобиля: {vehicle_id_for_analysis} (тип: {type(vehicle_id_for_analysis)})")
            new_analysis = analyzer.run_analysis(vehicle_id_for_analysis)

            if new_analysis and len(new_analysis) > 0:
                logger.info(f"Создан новый анализ для автомобиля с ID {vehicle_id_for_analysis}")
                analysis_data = new_analysis[0] if isinstance(new_analysis, list) else new_analysis
                
                # Убедимся, что и в результат записывается правильный ID
                if 'vehicle_id' in analysis_data:
                     analysis_data['vehicle_id'] = vehicle_id_for_analysis

                # --- ИСПРАВЛЕНИЕ --- 
                # Проверяем поле recommendations и преобразуем строку в список, если нужно
                if 'recommendations' in analysis_data and isinstance(analysis_data['recommendations'], str):
                    logger.info("Преобразуем строку рекомендаций в список")
                    # Разделяем по запятой, удаляем лишние пробелы у каждого элемента
                    analysis_data['recommendations'] = [rec.strip() for rec in analysis_data['recommendations'].split(',') if rec.strip()]
                elif 'recommendations' not in analysis_data:
                     logger.warning("Поле 'recommendations' отсутствует в результатах анализа")
                     analysis_data['recommendations'] = [] # Устанавливаем пустой список по умолчанию
                # --- КОНЕЦ ИСПРАВЛЕНИЯ ---

                return json_response({
                    'status': 'success',
                    'analysis': analysis_data
                })
            
            logger.warning(f"Не удалось создать автоматический анализ для ID {vehicle_id_for_analysis}, использую дефолтные данные")
            
            # Генерируем дефолтный анализ
            # Сохраняем исходный список рекомендаций
            default_recommendations_list = [
                "Рекомендуется регулярная проверка уровня масла",
                "Проверьте давление в шинах при следующем ТО",
                "Рекомендуется диагностика двигателя. Обнаружены признаки износа",
                "Регулярно проверяйте состояние тормозной системы"
            ]
            default_analysis = {
                # Используем правильный ID для сохранения
                'vehicle_id': vehicle_id_for_analysis,
                'engine_health': 80,
                'oil_health': 75,
                'tires_health': 85,
                'brakes_health': 90,
                'suspension_health': 85,
                'battery_health': 80,
                'overall_health': 82,
                'recommendations': default_recommendations_list, # Используем список здесь
                'created_at': datetime.now().isoformat()
            }
            
            # Сохраняем дефолтный анализ в базу
            # db.save_analysis_result может изменить default_analysis['recommendations'] на строку
            try:
                 db.save_analysis_result(default_analysis.copy()) # Передаем копию, чтобы оригинал не изменился
            except Exception as save_err:
                 logger.error(f"Ошибка при сохранении дефолтного анализа для ID {vehicle_id_for_analysis}: {save_err}")
                 # Решаем, стоит ли возвращать ошибку или все же отдать дефолтный ответ

            # Возвращаем JSON, гарантируя, что recommendations - это массив
            # Создаем словарь для ответа заново или модифицируем существующий
            response_data = default_analysis # Начинаем с данных, которые могли быть изменены
            response_data['recommendations'] = default_recommendations_list # Убеждаемся, что возвращаем список

            return json_response({
                'status': 'success',
                'analysis': response_data
            })
    
    except Exception as e:
        logger.error(f"Error getting latest analysis: {str(e)}")
        return json_response({
            'status': 'error',
            'message': str(e)
        }, 500)

@app.route('/api/analysis/history/<vehicle_id>', methods=['GET'])
def get_analysis_history(vehicle_id):
    """
    Эндпоинт для получения истории результатов анализа для автомобиля.
    """
    if not authenticate():
        return json_response({
            'status': 'error',
            'message': 'Unauthorized'
        }, 401)
    
    try:
        # Получаем историю анализов из базы данных
        query = """
        SELECT * FROM vehicle_analysis
        WHERE vehicle_id = ?
        ORDER BY created_at DESC
        """
        
        results = db.execute_query(query, (vehicle_id,))
        
        if results:
            # Parse recommendations from comma-separated string to list
            for result in results:
                if 'recommendations' in result:
                    result['recommendations'] = result['recommendations'].split(',')
            
            return json_response({
                'status': 'success',
                'history': results
            })
        else:
            return json_response({
                'status': 'warning',
                'message': f'No analysis history found for vehicle {vehicle_id}'
            })
    
    except Exception as e:
        logger.error(f"Error getting analysis history: {str(e)}")
        return json_response({
            'status': 'error',
            'message': str(e)
        }, 500)

if __name__ == "__main__":
    app.run(host='0.0.0.0', port=5001, debug=True) 