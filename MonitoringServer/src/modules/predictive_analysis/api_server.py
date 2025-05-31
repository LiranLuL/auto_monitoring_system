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
import random

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
    vehicle_id может быть как числовым ID, так и VIN
    """
    if not authenticate():
        return json_response({
            'status': 'error',
            'message': 'Unauthorized'
        }, 401)
    
    try:
        # Проверяем, это VIN или числовой ID
        is_vin = not vehicle_id.isdigit()
        logger.info(f"Запрос анализа для {'VIN' if is_vin else 'ID'} {vehicle_id}")
        
        # Если передан VIN, получаем ID по нему
        if is_vin:
            vehicle = db.get_vehicle_by_vin(vehicle_id)
            if not vehicle:
                logger.warning(f"Автомобиль с VIN {vehicle_id} не найден")
                return json_response({
                    'status': 'error',
                    'message': f'Vehicle with VIN {vehicle_id} not found'
                }, 404)
            
            vehicle_id_for_analysis = vehicle.get('id')
            logger.info(f"Найден автомобиль с VIN {vehicle_id}, ID: {vehicle_id_for_analysis}")
        else:
            # Если числовой ID, используем напрямую
            vehicle_id_for_analysis = vehicle_id
            
        # Запускаем анализ для найденного ID
        results = analyzer.run_analysis(vehicle_id_for_analysis)
        
        if results:
            # Преобразуем результаты для ответа
            result_data = results[0] if isinstance(results, list) else results
            
            # Проверяем, чтобы рекомендации были списком
            if 'recommendations' in result_data and isinstance(result_data['recommendations'], str):
                result_data['recommendations'] = [rec.strip() for rec in result_data['recommendations'].split(',') if rec.strip()]
            
            return json_response({
                'status': 'success',
                'message': f'Analysis completed for vehicle {vehicle_id}',
                'results': result_data
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
    vehicle_id может быть как числовым ID, так и VIN
    """
    if not authenticate() and not authenticate_mobile():
        return json_response({
            'status': 'error',
            'message': 'Unauthorized'
        }, 401)
    
    try:
        # Проверяем, это VIN или числовой ID
        is_vin = not vehicle_id.isdigit()
        logger.info(f"Запрос анализа для {'VIN' if is_vin else 'ID'} {vehicle_id}")
        
        # Получаем последний анализ из базы данных
        if is_vin:
            # Сначала получаем данные автомобиля по VIN
            vehicle = db.get_vehicle_by_vin(vehicle_id)
            if not vehicle:
                logger.warning(f"Автомобиль с VIN {vehicle_id} не найден")
                return json_response({
                    'status': 'error',
                    'message': f'Vehicle with VIN {vehicle_id} not found'
                }, 404)
            
            # Используем ID из полученных данных
            vehicle_id_for_analysis = vehicle.get('id')
            logger.info(f"Найден автомобиль с VIN {vehicle_id}, ID: {vehicle_id_for_analysis}")
        else:
            # Если передан числовой ID, используем его напрямую
            vehicle_id_for_analysis = vehicle_id
        
        # Получаем анализ для найденного ID
        query = """
        SELECT * FROM vehicle_analysis
        WHERE vehicle_id = ?
        ORDER BY created_at DESC
        LIMIT 1
        """
        
        result = db.execute_query(query, (vehicle_id_for_analysis,))
        
        if result:
            logger.info(f"Найден анализ для {'VIN' if is_vin else 'ID'} {vehicle_id}")
            
            # В новой версии рекомендации уже хранятся как список, но обрабатываем и строковый формат для совместимости
            if result[0].get('recommendations') and isinstance(result[0].get('recommendations'), str):
                result[0]['recommendations'] = [rec.strip() for rec in result[0]['recommendations'].split(',') if rec.strip()]
            
            return json_response({
                'status': 'success',
                'analysis': result[0]
            })
        
        # Если анализ не найден, запускаем новый
        logger.info(f"Анализ для {'VIN' if is_vin else 'ID'} {vehicle_id} не найден, создаем новый")
        
        # Получаем данные автомобиля
        if is_vin:
            vehicle = db.get_vehicle_by_vin(vehicle_id)
            if not vehicle:
                logger.error(f"Автомобиль с VIN {vehicle_id} не найден при повторной проверке")
                return json_response({
                    'status': 'error',
                    'message': f'Vehicle with VIN {vehicle_id} not found'
                }, 404)
        else:
            vehicle = db.get_vehicle_by_id(vehicle_id)
            if not vehicle:
                logger.error(f"Автомобиль с ID {vehicle_id} не найден")
                return json_response({
                    'status': 'error',
                    'message': f'Vehicle with ID {vehicle_id} not found'
                }, 404)
        
        # Запускаем анализ для этого автомобиля
        logger.info(f"Запускаем анализ для автомобиля: {vehicle_id_for_analysis}")
        new_analysis = analyzer.run_analysis(vehicle_id_for_analysis)
        
        # Проверяем, успешно ли выполнен анализ
        if new_analysis and len(new_analysis) > 0:
            logger.info(f"Создан новый анализ для автомобиля {vehicle_id_for_analysis}")
            analysis_data = new_analysis[0] if isinstance(new_analysis, list) else new_analysis
            
            # Гарантируем, что ID автомобиля в анализе соответствует запрошенному
            if 'vehicle_id' in analysis_data:
                analysis_data['vehicle_id'] = vehicle_id_for_analysis
            
            # Гарантируем, что рекомендации являются списком
            if 'recommendations' in analysis_data and isinstance(analysis_data['recommendations'], str):
                logger.info("Преобразуем строку рекомендаций в список")
                analysis_data['recommendations'] = [rec.strip() for rec in analysis_data['recommendations'].split(',') if rec.strip()]
            
            return json_response({
                'status': 'success',
                'analysis': analysis_data
            })
        else:
            # Если анализ не удалось выполнить, возвращаем ошибку
            logger.error(f"Не удалось выполнить анализ для автомобиля {vehicle_id_for_analysis}")
            return json_response({
                'status': 'error',
                'message': f'Failed to perform analysis for vehicle {vehicle_id_for_analysis}'
            }, 500)
    
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
    vehicle_id может быть как числовым ID, так и VIN
    """
    if not authenticate():
        return json_response({
            'status': 'error',
            'message': 'Unauthorized'
        }, 401)
    
    try:
        # Проверяем, это VIN или числовой ID
        is_vin = not vehicle_id.isdigit()
        logger.info(f"Запрос истории анализов для {'VIN' if is_vin else 'ID'} {vehicle_id}")
        
        # Если передан VIN, получаем ID по нему
        if is_vin:
            vehicle = db.get_vehicle_by_vin(vehicle_id)
            if not vehicle:
                logger.warning(f"Автомобиль с VIN {vehicle_id} не найден")
                return json_response({
                    'status': 'error',
                    'message': f'Vehicle with VIN {vehicle_id} not found'
                }, 404)
            
            vehicle_id_for_query = vehicle.get('id')
            logger.info(f"Найден автомобиль с VIN {vehicle_id}, ID: {vehicle_id_for_query}")
        else:
            # Если числовой ID, используем напрямую
            vehicle_id_for_query = vehicle_id
        
        # Получаем историю анализов из базы данных
        query = """
        SELECT * FROM vehicle_analysis
        WHERE vehicle_id = ?
        ORDER BY created_at DESC
        """
        
        results = db.execute_query(query, (vehicle_id_for_query,))
        
        if results:
            # В новой версии рекомендации уже хранятся как список, но обрабатываем и строковый формат для совместимости
            for result in results:
                if 'recommendations' in result and isinstance(result['recommendations'], str):
                    result['recommendations'] = [rec.strip() for rec in result['recommendations'].split(',') if rec.strip()]
            
            logger.info(f"Найдено {len(results)} записей в истории анализов")
            return json_response({
                'status': 'success',
                'history': results
            })
        else:
            logger.warning(f"История анализов для {'VIN' if is_vin else 'ID'} {vehicle_id} не найдена")
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

@app.route('/api/emulator/recommendations/<vehicle_id>', methods=['GET'])
def get_emulator_recommendations(vehicle_id):

    try:
        logger.info(f"Запрос эмулированных рекомендаций для автомобиля: {vehicle_id}")
        
        # Use vehicle ID to create deterministic randomness
        seed = sum(ord(c) for c in vehicle_id)
        # Add time-based component to make it change slightly on repeated calls
        time_factor = int(datetime.now().timestamp() / 60) % 10  # Changes every minute
        random_factor = (seed % 15) - 7 + time_factor - 5  # Between -12 and +12
        
        # Generate health ratings with some randomness
        engine_health = min(100, max(0, (seed % 25 + 70) + random_factor))
        oil_health = min(100, max(0, ((seed * 2) % 30 + 65) + random_factor))
        tires_health = min(100, max(0, ((seed * 3) % 25 + 70) + random_factor))
        brakes_health = min(100, max(0, ((seed * 5) % 20 + 75) + random_factor))
        suspension_health = min(100, max(0, ((seed * 7) % 25 + 70) + random_factor))
        battery_health = min(100, max(0, ((seed * 11) % 20 + 75) + random_factor))
        
        # Calculate overall health
        overall_health = int((engine_health + oil_health + tires_health + 
                             brakes_health + suspension_health + battery_health) / 6)
        
        # Generate recommendations
        recommendations = []
        
        # Engine recommendations
        if engine_health < 75:
            recommendations.append("Срочно требуется диагностика двигателя. Наблюдаются признаки серьезного износа.")
        elif engine_health < 85:
            recommendations.append("Рекомендуется диагностика двигателя. Обнаружены признаки износа.")
        
        # Oil recommendations
        if oil_health < 70:
            recommendations.append("Требуется срочная замена моторного масла и фильтра.")
        elif oil_health < 80:
            recommendations.append("Рекомендуется замена моторного масла при следующем ТО.")
        else:
            recommendations.append("Регулярно проверяйте уровень масла.")
        
        # Tires recommendations
        if tires_health < 80:
            recommendations.append("Требуется проверка давления в шинах и их состояния. Возможен неравномерный износ.")
        else:
            recommendations.append("Проверьте давление в шинах при следующем ТО.")
        
        # Brakes recommendations
        if brakes_health < 80:
            recommendations.append("Рекомендуется проверка тормозной системы. Возможен износ колодок.")
        else:
            recommendations.append("Регулярно проверяйте состояние тормозной системы.")
        
        # Suspension recommendations
        if suspension_health < 80:
            recommendations.append("Рекомендуется диагностика подвески. Возможны признаки износа амортизаторов.")
        
        # Battery recommendations
        if battery_health < 80:
            recommendations.append("Рекомендуется проверка аккумулятора. Возможно снижение емкости.")
        
        # Additional recommendations
        additional_recs = [
            "Проверьте состояние воздушного фильтра при следующем ТО.",
            "Рекомендуется проверка уровня охлаждающей жидкости.",
            "Следите за уровнем жидкости в бачке омывателя.",
            "Рекомендуется проверка работы системы кондиционирования.",
            "Проверьте состояние щеток стеклоочистителя.",
            "Рекомендуется проверка и регулировка углов установки колес.",
            "Проверьте состояние приводных ремней.",
            "Рекомендуется замена салонного фильтра.",
            "Визуально осмотрите тормозные диски на наличие повреждений.",
            "Рекомендуется проверка состояния аккумуляторных клемм.",
            "Проверьте состояние и натяжение ремня генератора.",
            "Проверьте герметичность сальников и прокладок.",
            "Следите за расходом топлива - повышенный расход может указывать на проблемы."
        ]
        
        # Add 1-3 additional recommendations based on vehicle ID
        additional_count = 1 + (seed % 3)
        for i in range(additional_count):
            rec_index = (seed + i * 17) % len(additional_recs)
            if additional_recs[rec_index] not in recommendations:
                recommendations.append(additional_recs[rec_index])
        
        # Create the analysis result
        analysis = {
            'vehicle_id': vehicle_id,
            'engine_health': engine_health,
            'oil_health': oil_health,
            'tires_health': tires_health,
            'brakes_health': brakes_health,
            'suspension_health': suspension_health,
            'battery_health': battery_health,
            'overall_health': overall_health,
            'recommendations': recommendations,
            'created_at': datetime.now().isoformat()
        }
        
        # Try to save to database
        try:
            # Convert recommendations to string for storage
            recommendations_str = ','.join(recommendations) if recommendations else ""
            
            query = """
            INSERT INTO vehicle_analysis 
            (vehicle_id, engine_health, oil_health, tires_health, brakes_health,
             suspension_health, battery_health, overall_health, recommendations, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """
            
            result = db.execute_query(
                query, 
                (vehicle_id, engine_health, oil_health, tires_health, brakes_health,
                 suspension_health, battery_health, overall_health, recommendations_str, 
                 datetime.now().isoformat())
            )
            
            if result:
                logger.info(f"Эмулированный анализ сохранен для автомобиля {vehicle_id}")
        except Exception as e:
            logger.error(f"Error saving emulated analysis: {str(e)}")
            # Continue even if save fails
        
        return json_response({
            'status': 'success',
            'analysis': analysis
        })
    
    except Exception as e:
        logger.error(f"Error generating emulated recommendations: {str(e)}")
        return json_response({
            'status': 'error',
            'message': str(e)
        }, 500)

# Also add an alias route for the same function
@app.route('/api/analysis/recommendations/<vehicle_id>', methods=['GET'])
def get_analysis_recommendations(vehicle_id):
    """
    Alias for the emulator recommendations endpoint
    """
    return get_emulator_recommendations(vehicle_id)

if __name__ == "__main__":
    app.run(host='0.0.0.0', port=5001, debug=True) 