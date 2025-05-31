#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import os
import json
import logging
import requests
from dotenv import load_dotenv
from datetime import datetime

# Load environment variables
load_dotenv()

# Set up logging
logger = logging.getLogger("ApiClient")

class ApiClient:
    """
    Клиент для взаимодействия с API сервера Node.js.
    Предоставляет методы для получения телеметрических данных и данных о автомобилях.
    """
    
    def __init__(self):
        """
        Инициализирует клиент API с настройками из .env
        """
        self.api_base_url = os.getenv('NODE_API_URL', 'http://localhost:5000/api')
        self.api_token = os.getenv('API_TOKEN', 'demo_token')
        logger.info(f"API client initialized with base URL: {self.api_base_url}")
    
    def _make_request(self, method, endpoint, data=None, params=None, vehicle_id=None):
        """
        Выполняет HTTP-запрос к API с учетом авторизации.
        
        Args:
            method (str): HTTP метод ('GET', 'POST', etc.)
            endpoint (str): API endpoint (без base_url)
            data (dict, optional): Данные для отправки в запросе
            params (dict, optional): URL-параметры запроса
            vehicle_id (str, optional): ID автомобиля для авторизации
            
        Returns:
            dict: Результат запроса или None в случае ошибки
        """
        try:
            url = f"{self.api_base_url}/{endpoint}"
            
            # Для новых маршрутов авторизация не требуется
            headers = {
                'Content-Type': 'application/json'
            }
            
            logger.info(f"Making {method} request to {url}")
            
            if method.upper() == 'GET':
                response = requests.get(url, headers=headers, params=params)
            elif method.upper() == 'POST':
                response = requests.post(url, headers=headers, json=data)
            elif method.upper() == 'PUT':
                response = requests.put(url, headers=headers, json=data)
            else:
                logger.error(f"Unsupported HTTP method: {method}")
                return None
            
            if response.status_code in (200, 201):
                return response.json()
            else:
                logger.error(f"API request failed: {response.status_code} - {response.text}")
                return None
                
        except Exception as e:
            logger.error(f"Error making API request: {str(e)}")
            return None
    
    def get_vehicle_by_vin(self, vin):
        """
        Получает данные автомобиля по VIN
        
        Args:
            vin (str): VIN автомобиля
            
        Returns:
            dict: Данные автомобиля или None
        """
        try:
            # Для новых маршрутов
            result = self._make_request('GET', 'vehicles/search/by-vin', params={'vin': vin})
            
            if result and 'vehicle' in result:
                logger.info(f"Vehicle found by VIN {vin}")
                return result['vehicle']
            
            logger.warning(f"Vehicle with VIN {vin} not found")
            return None
            
        except Exception as e:
            logger.error(f"Error getting vehicle by VIN {vin}: {str(e)}")
            return None
    
    def get_vehicle_by_id(self, vehicle_id):
        """
        Получает данные автомобиля по ID
        
        Args:
            vehicle_id (str): ID автомобиля
            
        Returns:
            dict: Данные автомобиля или None
        """
        try:
            result = self._make_request('GET', f'vehicles/{vehicle_id}')
            if result and 'vehicle' in result:
                logger.info(f"Vehicle found by ID {vehicle_id}")
                return result['vehicle']
            
            logger.warning(f"Vehicle with ID {vehicle_id} not found")
            return None
            
        except Exception as e:
            logger.error(f"Error getting vehicle by ID {vehicle_id}: {str(e)}")
            return None
    
    def get_all_vehicles(self):
        """
        Получает список всех автомобилей
        
        Returns:
            list: Список автомобилей или пустой список
        """
        try:
            result = self._make_request('GET', 'vehicles')
            if result and 'vehicles' in result:
                logger.info(f"Got {len(result['vehicles'])} vehicles")
                return result['vehicles']
            
            logger.warning("No vehicles found")
            return []
            
        except Exception as e:
            logger.error(f"Error getting all vehicles: {str(e)}")
            return []
    
    def get_telemetry_data(self, vehicle_id, start_date=None, end_date=None, limit=10):
        """
        Получает телеметрические данные для автомобиля
        
        Args:
            vehicle_id (str): ID автомобиля
            start_date (str, optional): Начальная дата выборки в формате ISO 8601
            end_date (str, optional): Конечная дата выборки в формате ISO 8601
            limit (int, optional): Максимальное количество записей
            
        Returns:
            list: Список телеметрических данных или пустой список
        """
        try:
            # Обновленные параметры для нового маршрута
            params = {'vehicle_id': vehicle_id, 'limit': limit}
            if start_date:
                params['start_date'] = start_date
            if end_date:
                params['end_date'] = end_date
                
            # Используем новый маршрут
            result = self._make_request('GET', 'telemetry/vehicle-data', params=params)
            
            if result and 'data' in result:
                logger.info(f"Got {len(result['data'])} telemetry records for vehicle {vehicle_id}")
                # Преобразуем ключи из camelCase в snake_case для совместимости с legacy-кодом
                transformed_data = []
                for item in result['data']:
                    transformed = {}
                    for key, value in item.items():
                        # Преобразуем camelCase в snake_case
                        snake_key = ''.join(['_'+c.lower() if c.isupper() else c for c in key]).lstrip('_')
                        transformed[snake_key] = value
                    transformed_data.append(transformed)
                return transformed_data
            
            logger.warning(f"No telemetry data found for vehicle {vehicle_id}")
            return []
            
        except Exception as e:
            logger.error(f"Error getting telemetry data for vehicle {vehicle_id}: {str(e)}")
            return []
    
    def get_vehicle_works(self, vehicle_id):
        """
        Получает историю работ для автомобиля
        
        Args:
            vehicle_id (str): ID автомобиля
            
        Returns:
            list: Список работ или пустой список
        """
        try:
            result = self._make_request('GET', f'works/vehicle/{vehicle_id}')
            if result and 'works' in result:
                logger.info(f"Got {len(result['works'])} works for vehicle {vehicle_id}")
                return result['works']
            
            logger.warning(f"No works found for vehicle {vehicle_id}")
            return []
            
        except Exception as e:
            logger.error(f"Error getting works for vehicle {vehicle_id}: {str(e)}")
            return []
    
    def save_analysis_result(self, analysis_result):
        """
        Сохраняет результат анализа через API
        
        Args:
            analysis_result (dict): Результат анализа
            
        Returns:
            bool: True в случае успеха, False в случае ошибки
        """
        try:
            # Преобразуем ключи из snake_case в camelCase для совместимости с API
            camel_data = {}
            for key, value in analysis_result.items():
                # Преобразуем snake_case в camelCase
                components = key.split('_')
                camel_key = components[0] + ''.join(x.title() for x in components[1:])
                camel_data[camel_key] = value
            
            vehicle_id = analysis_result.get('vehicle_id')
            
            # Используем новый маршрут
            result = self._make_request('POST', f'analysis/vehicle/{vehicle_id}/results', data=camel_data)
            
            if result and result.get('status') == 'success':
                logger.info(f"Analysis result saved for vehicle {vehicle_id}")
                return True
            
            logger.warning(f"Failed to save analysis result for vehicle {vehicle_id}")
            return False
            
        except Exception as e:
            logger.error(f"Error saving analysis result: {str(e)}")
            return False 