#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import os
import json
import logging
import threading
from datetime import datetime
from dotenv import load_dotenv
from api_client import ApiClient

# Load environment variables
load_dotenv()

# Set up logging
logger = logging.getLogger("Database")

class Database:
    """
    Класс для работы с данными из NodeJS API.
    Поддерживает многопоточность.
    """
    
    _instance = None
    _lock = threading.Lock()
    
    def __new__(cls):
        """Реализация паттерна Singleton с поддержкой многопоточности"""
        with cls._lock:
            if cls._instance is None:
                cls._instance = super(Database, cls).__new__(cls)
                cls._instance._initialized = False
            return cls._instance
    
    def __init__(self):
        """
        Инициализирует клиент API для доступа к данным.
        """
        # Проверяем, был ли уже инициализирован экземпляр
        if self._initialized:
            return
            
        with self._lock:
            if self._initialized:
                return
                
            try:
                # Инициализируем клиент API
                self.api_client = ApiClient()
                self._initialized = True
                
                logger.info("Database proxy initialized successfully")
            except Exception as e:
                logger.error(f"Database initialization error: {str(e)}")
                raise
    
    def get_all_vehicles(self):
        """
        Получает список всех автомобилей через API.
        
        Returns:
            list: Список автомобилей
        """
        try:
            vehicles = self.api_client.get_all_vehicles()
            return vehicles
        except Exception as e:
            logger.error(f"Error getting all vehicles: {str(e)}")
            return []
    
    def get_vehicle_by_id(self, vehicle_id):
        """
        Получает данные автомобиля по ID через API.
        
        Args:
            vehicle_id: ID автомобиля
            
        Returns:
            dict: Данные автомобиля или None
        """
        try:
            vehicle = self.api_client.get_vehicle_by_id(vehicle_id)
            return vehicle
        except Exception as e:
            logger.error(f"Error getting vehicle by ID {vehicle_id}: {str(e)}")
            return None
    
    def get_vehicle_by_vin(self, vin):
        """
        Получает данные автомобиля по VIN через API.
        
        Args:
            vin: VIN автомобиля
            
        Returns:
            dict: Данные автомобиля или None
        """
        try:
            vehicle = self.api_client.get_vehicle_by_vin(vin)
            return vehicle
        except Exception as e:
            logger.error(f"Error getting vehicle by VIN {vin}: {str(e)}")
            return None
    
    def get_telemetry_data(self, vehicle_id, start_date=None, end_date=None):
        """
        Получает телеметрические данные для автомобиля через API.
        
        Args:
            vehicle_id: ID автомобиля
            start_date (optional): Начальная дата выборки
            end_date (optional): Конечная дата выборки
            
        Returns:
            list: Список телеметрических данных
        """
        try:
            telemetry_data = self.api_client.get_telemetry_data(vehicle_id, start_date, end_date)
            return telemetry_data
        except Exception as e:
            logger.error(f"Error getting telemetry data for vehicle {vehicle_id}: {str(e)}")
            return []
    
    def get_vehicle_works(self, vehicle_id):
        """
        Получает историю работ для автомобиля через API.
        
        Args:
            vehicle_id: ID автомобиля
            
        Returns:
            list: Список работ
        """
        try:
            works = self.api_client.get_vehicle_works(vehicle_id)
            return works
        except Exception as e:
            logger.error(f"Error getting works for vehicle {vehicle_id}: {str(e)}")
            return []
    
    def save_analysis_result(self, analysis_result):
        """
        Сохраняет результат анализа через API.
        
        Args:
            analysis_result (dict): Результат анализа
            
        Returns:
            bool: True в случае успеха, False в случае ошибки
        """
        try:
            # Если нет created_at, добавляем его
            if 'created_at' not in analysis_result:
                analysis_result['created_at'] = datetime.now().isoformat()
                
            # Сохраняем анализ через API-клиент
            result = self.api_client.save_analysis_result(analysis_result)
            
            if result:
                logger.info(f"Analysis saved for vehicle {analysis_result.get('vehicle_id')}")
                return True
            else:
                logger.error(f"Failed to save analysis for vehicle {analysis_result.get('vehicle_id')}")
                return False
                
        except Exception as e:
            logger.error(f"Error saving analysis result: {str(e)}")
            return False
    
    def create_analysis_table_if_not_exists(self):
        """
        Метод-заглушка для совместимости с legacy-кодом.
        В новой версии таблицы создаются на стороне Node.js.
        
        Returns:
            bool: Всегда True
        """
        logger.info("Using Node.js API, no need to create tables")
        return True
    
    def execute_query(self, query, params=None, fetch=True):
        """
        Метод-заглушка для совместимости с legacy-кодом.
        В новой версии запросы выполняются через API.
        
        ВНИМАНИЕ: Этот метод не рекомендуется использовать в новом коде!
        
        Args:
            query (str): SQL-запрос (не используется)
            params (tuple, optional): Параметры запроса (не используется)
            fetch (bool): Если True, возвращает результаты запроса (не используется)
            
        Returns:
            list или None: Пустой список или None
        """
        logger.warning("execute_query method is deprecated, use specific API methods instead")
        return [] if fetch else None 