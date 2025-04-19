#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import os
import json
import logging
import time
from datetime import datetime
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Set up logging
logger = logging.getLogger("Database_Pure_Mock")

class Database:
    """
    Класс для имитации работы с базой данных.
    Использует JSON-файлы для хранения данных, без зависимости от SQLite.
    """
    
    def __init__(self):
        """
        Инициализирует хранилище данных в памяти и файлах JSON.
        """
        try:
            self.data_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'mock_data')
            os.makedirs(self.data_dir, exist_ok=True)
            
            # Initialize data stores
            self.data = {
                'vehicles': self._load_data('vehicles.json', []),
                'telemetry_data': self._load_data('telemetry_data.json', []),
                'works': self._load_data('works.json', []),
                'vehicle_analysis': self._load_data('vehicle_analysis.json', [])
            }
            
            logger.info(f"Successfully initialized mock database at {self.data_dir}")
        
        except Exception as e:
            logger.error(f"Database initialization error: {str(e)}")
            # Initialize empty data even if loading fails
            self.data = {
                'vehicles': [],
                'telemetry_data': [],
                'works': [],
                'vehicle_analysis': []
            }
    
    def _load_data(self, filename, default=None):
        """Load data from JSON file"""
        try:
            filepath = os.path.join(self.data_dir, filename)
            if os.path.exists(filepath):
                with open(filepath, 'r') as f:
                    return json.load(f)
            return default or []
        except Exception as e:
            logger.error(f"Error loading {filename}: {str(e)}")
            return default or []
    
    def _save_data(self, filename, data):
        """Save data to JSON file"""
        try:
            filepath = os.path.join(self.data_dir, filename)
            with open(filepath, 'w') as f:
                json.dump(data, f, indent=2)
            return True
        except Exception as e:
            logger.error(f"Error saving {filename}: {str(e)}")
            return False
    
    def create_tables(self):
        """
        No-op since we're using files, not tables.
        """
        logger.info("Mock database doesn't use tables, using file storage instead")
        return True
    
    def execute_query(self, query, params=None, fetch=True):
        """
        Симуляция SQL-запроса.
        """
        # Just a stub for compatibility with the SQLite version
        logger.warning("execute_query is a stub in this pure mock implementation")
        return []
    
    # Base methods for each data type
    def get_all_vehicles(self):
        """Get all vehicles"""
        return self.data['vehicles']
    
    def get_vehicle_by_id(self, vehicle_id):
        """Get vehicle by ID"""
        vehicle_id = int(vehicle_id) if vehicle_id.isdigit() else vehicle_id
        for vehicle in self.data['vehicles']:
            if vehicle.get('id') == vehicle_id:
                return vehicle
        return None
    
    def get_telemetry_data(self, vehicle_id, start_date=None, end_date=None):
        """Get telemetry data for a vehicle"""
        vehicle_id = int(vehicle_id) if isinstance(vehicle_id, str) and vehicle_id.isdigit() else vehicle_id
        result = [t for t in self.data['telemetry_data'] 
                 if t.get('vehicle_id') == vehicle_id]
        # Filtering by date would be added here if needed
        return result
    
    def get_vehicle_works(self, vehicle_id):
        """Get works for a vehicle"""
        vehicle_id = int(vehicle_id) if isinstance(vehicle_id, str) and vehicle_id.isdigit() else vehicle_id
        return [w for w in self.data['works'] if w.get('vehicle_id') == vehicle_id]
    
    def save_analysis_result(self, analysis_result):
        """Save analysis results"""
        try:
            # Generate an ID and add timestamp
            analysis_result['id'] = len(self.data['vehicle_analysis']) + 1
            if isinstance(analysis_result.get('recommendations'), list):
                analysis_result['recommendations'] = ','.join(analysis_result['recommendations'])
            
            analysis_result['created_at'] = datetime.now().isoformat()
            
            # Add to in-memory data
            self.data['vehicle_analysis'].append(analysis_result)
            
            # Save to file
            self._save_data('vehicle_analysis.json', self.data['vehicle_analysis'])
            
            logger.info(f"Analysis saved for vehicle {analysis_result['vehicle_id']}")
            return True
        except Exception as e:
            logger.error(f"Error saving analysis result: {str(e)}")
            return False
    
    def create_analysis_table_if_not_exists(self):
        """No-op for file-based storage"""
        return True
    
    # For testing, add some sample data if none exists
    def add_sample_data_if_empty(self):
        """Add sample data for testing if database is empty"""
        if not self.data['vehicles']:
            # Add sample vehicle
            sample_vehicle = {
                'id': 1,
                'vin': 'SAMPLEVIN12345',
                'make': 'Test',
                'model': 'Simulator',
                'plate_number': 'TEST123',
                'owner_phone': '+1234567890',
                'created_at': datetime.now().isoformat()
            }
            self.data['vehicles'].append(sample_vehicle)
            self._save_data('vehicles.json', self.data['vehicles'])
            
            # Add sample telemetry
            sample_telemetry = {
                'id': 1,
                'vehicle_id': 1,
                'rpm': 2000,
                'speed': 60,
                'engine_temp': 90.5,
                'dtc_codes': 'P0100,P0101',
                'o2_voltage': 0.85,
                'fuel_pressure': 45.2,
                'intake_temp': 35.0,
                'maf_sensor': 15.6,
                'throttle_pos': 25.0,
                'created_at': datetime.now().isoformat()
            }
            self.data['telemetry_data'].append(sample_telemetry)
            self._save_data('telemetry_data.json', self.data['telemetry_data'])
            
            logger.info("Added sample data to empty database")
            return True
        return False 