#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import os
import json
import logging
import sqlite3
import threading
from datetime import datetime
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Set up logging
logger = logging.getLogger("Database")

class Database:
    """
    Класс для работы с базой данных SQLite.
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
        Инициализирует подключение к базе данных SQLite.
        """
        # Проверяем, был ли уже инициализирован экземпляр
        if self._initialized:
            return
            
        with self._lock:
            if self._initialized:
                return
                
            try:
                self.db_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'vehicle_monitoring.db')
                self._initialized = True
                
                # Создаем таблицы при первом запуске
                self._create_tables()
                
                logger.info(f"Successfully initialized database at {self.db_path}")
            except Exception as e:
                logger.error(f"Database initialization error: {str(e)}")
                raise
    
    def _get_connection(self):
        """
        Создает новое соединение с базой данных для текущего потока.
        """
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        return conn
    
    def _create_tables(self):
        """
        Создает необходимые таблицы в базе данных, если они не существуют.
        """
        try:
            conn = self._get_connection()
            cursor = conn.cursor()
            
            # Таблица автомобилей
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS vehicles (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    vin TEXT UNIQUE NOT NULL,
                    make TEXT,
                    model TEXT,
                    plate_number TEXT,
                    owner_phone TEXT,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            ''')
            
            # Таблица телеметрических данных
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS telemetry_data (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    vehicle_id INTEGER NOT NULL,
                    rpm INTEGER,
                    speed REAL,
                    engine_temp REAL,
                    dtc_codes TEXT,
                    o2_voltage REAL,
                    fuel_pressure REAL,
                    intake_temp REAL,
                    maf_sensor REAL,
                    throttle_pos REAL,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (vehicle_id) REFERENCES vehicles (id)
                )
            ''')
            
            # Таблица работ
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS works (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    vehicle_id INTEGER NOT NULL,
                    description TEXT,
                    date DATE,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (vehicle_id) REFERENCES vehicles (id)
                )
            ''')
            
            # Таблица результатов анализа
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS vehicle_analysis (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    vehicle_id INTEGER NOT NULL,
                    engine_health INTEGER,
                    oil_health INTEGER,
                    tires_health INTEGER,
                    brakes_health INTEGER,
                    suspension_health INTEGER,
                    battery_health INTEGER,
                    overall_health INTEGER,
                    recommendations TEXT,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (vehicle_id) REFERENCES vehicles (id)
                )
            ''')
            
            conn.commit()
            conn.close()
            logger.info("Database tables created successfully")
            
        except Exception as e:
            logger.error(f"Error creating tables: {str(e)}")
            raise
    
    def execute_query(self, query, params=None, fetch=True):
        """
        Выполняет SQL-запрос к базе данных.
        
        Args:
            query (str): SQL-запрос
            params (tuple, optional): Параметры запроса
            fetch (bool): Если True, возвращает результаты запроса
            
        Returns:
            list или None: Результаты запроса или None
        """
        conn = None
        try:
            conn = self._get_connection()
            cursor = conn.cursor()
            
            if params:
                cursor.execute(query, params)
            else:
                cursor.execute(query)
            
            if fetch:
                result = [dict(row) for row in cursor.fetchall()]
                return result
            else:
                conn.commit()
                return None
                
        except Exception as e:
            logger.error(f"Error executing query: {str(e)}")
            raise
        finally:
            if conn:
                conn.close()
    
    def get_all_vehicles(self):
        """Get all vehicles"""
        query = "SELECT * FROM vehicles"
        return self.execute_query(query)
    
    def get_vehicle_by_id(self, vehicle_id):
        """Get vehicle by ID"""
        query = "SELECT * FROM vehicles WHERE id = ?"
        result = self.execute_query(query, (vehicle_id,))
        return result[0] if result else None
    
    def get_telemetry_data(self, vehicle_id, start_date=None, end_date=None):
        """Get telemetry data for a vehicle"""
        query = "SELECT * FROM telemetry_data WHERE vehicle_id = ?"
        params = [vehicle_id]
        
        if start_date:
            query += " AND created_at >= ?"
            params.append(start_date)
        if end_date:
            query += " AND created_at <= ?"
            params.append(end_date)
            
        query += " ORDER BY created_at DESC"
        
        return self.execute_query(query, tuple(params))
    
    def get_vehicle_works(self, vehicle_id):
        """Get works for a vehicle"""
        query = "SELECT * FROM works WHERE vehicle_id = ? ORDER BY date DESC"
        return self.execute_query(query, (vehicle_id,))
    
    def save_analysis_result(self, analysis_result):
        """Save analysis results"""
        try:
            # Преобразуем список рекомендаций в строку
            if isinstance(analysis_result.get('recommendations'), list):
                analysis_result['recommendations'] = ','.join(analysis_result['recommendations'])
            
            # Добавляем timestamp
            analysis_result['created_at'] = datetime.now().isoformat()
            
            # Формируем SQL-запрос
            columns = ', '.join(analysis_result.keys())
            placeholders = ', '.join(['?' for _ in analysis_result])
            query = f"INSERT INTO vehicle_analysis ({columns}) VALUES ({placeholders})"
            
            # Выполняем запрос
            self.execute_query(query, tuple(analysis_result.values()), fetch=False)
            
            logger.info(f"Analysis saved for vehicle {analysis_result['vehicle_id']}")
            return True
            
        except Exception as e:
            logger.error(f"Error saving analysis result: {str(e)}")
            return False
    
    def create_analysis_table_if_not_exists(self):
        """Создает таблицу анализа, если она не существует"""
        try:
            conn = self._get_connection()
            cursor = conn.cursor()
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS vehicle_analysis (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    vehicle_id INTEGER NOT NULL,
                    engine_health INTEGER,
                    oil_health INTEGER,
                    tires_health INTEGER,
                    brakes_health INTEGER,
                    suspension_health INTEGER,
                    battery_health INTEGER,
                    overall_health INTEGER,
                    recommendations TEXT,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (vehicle_id) REFERENCES vehicles (id)
                )
            ''')
            conn.commit()
            conn.close()
            return True
        except Exception as e:
            logger.error(f"Error creating analysis table: {str(e)}")
            return False
    
    def __del__(self):
        """
        Закрывает соединение с базой данных при уничтожении объекта
        """
        try:
            if hasattr(self, 'conn'):
                self.conn.close()
        except Exception as e:
            logger.error(f"Error closing database connection: {str(e)}") 