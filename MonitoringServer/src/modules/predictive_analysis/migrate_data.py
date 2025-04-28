#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import os
import json
import logging
from datetime import datetime
from database import Database

# Set up logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger("DataMigration")

def load_json_data(filename):
    """Load data from JSON file"""
    try:
        filepath = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'mock_data', filename)
        if os.path.exists(filepath):
            with open(filepath, 'r') as f:
                return json.load(f)
        return []
    except Exception as e:
        logger.error(f"Error loading {filename}: {str(e)}")
        return []

def migrate_data():
    """Migrate data from JSON files to SQLite database"""
    try:
        # Initialize database
        db = Database()
        
        # Load data from JSON files
        vehicles = load_json_data('vehicles.json')
        telemetry_data = load_json_data('telemetry_data.json')
        works = load_json_data('works.json')
        vehicle_analysis = load_json_data('vehicle_analysis.json')
        
        # Migrate vehicles
        for vehicle in vehicles:
            # Проверяем, существует ли уже автомобиль с таким VIN
            query = "SELECT id FROM vehicles WHERE vin = ?"
            result = db.execute_query(query, (vehicle.get('vin'),))
            
            if not result:
                # Если автомобиля нет, добавляем его
                query = """
                    INSERT INTO vehicles (vin, make, model, plate_number, owner_phone, created_at)
                    VALUES (?, ?, ?, ?, ?, ?)
                """
                params = (
                    vehicle.get('vin'),
                    vehicle.get('make'),
                    vehicle.get('model'),
                    vehicle.get('plate_number'),
                    vehicle.get('owner_phone'),
                    vehicle.get('created_at', datetime.now().isoformat())
                )
                db.execute_query(query, params, fetch=False)
                logger.info(f"Added vehicle with VIN: {vehicle.get('vin')}")
            else:
                logger.info(f"Vehicle with VIN {vehicle.get('vin')} already exists, skipping")
        
        logger.info(f"Migrated {len(vehicles)} vehicles")
        
        # Migrate telemetry data
        for telemetry in telemetry_data:
            # Проверяем, существует ли уже запись с таким ID
            query = "SELECT id FROM telemetry_data WHERE id = ?"
            result = db.execute_query(query, (telemetry.get('id'),))
            
            if not result:
                # Если записи нет, добавляем ее
                query = """
                    INSERT INTO telemetry_data (
                        vehicle_id, rpm, speed, engine_temp, dtc_codes,
                        o2_voltage, fuel_pressure, intake_temp, maf_sensor,
                        throttle_pos, created_at
                    )
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """
                params = (
                    telemetry.get('vehicle_id'),
                    telemetry.get('rpm'),
                    telemetry.get('speed'),
                    telemetry.get('engine_temp'),
                    telemetry.get('dtc_codes'),
                    telemetry.get('o2_voltage'),
                    telemetry.get('fuel_pressure'),
                    telemetry.get('intake_temp'),
                    telemetry.get('maf_sensor'),
                    telemetry.get('throttle_pos'),
                    telemetry.get('created_at', datetime.now().isoformat())
                )
                db.execute_query(query, params, fetch=False)
                logger.info(f"Added telemetry data for vehicle ID: {telemetry.get('vehicle_id')}")
            else:
                logger.info(f"Telemetry data with ID {telemetry.get('id')} already exists, skipping")
        
        logger.info(f"Migrated {len(telemetry_data)} telemetry records")
        
        # Migrate works
        for work in works:
            # Проверяем, существует ли уже запись с таким ID
            query = "SELECT id FROM works WHERE id = ?"
            result = db.execute_query(query, (work.get('id'),))
            
            if not result:
                # Если записи нет, добавляем ее
                query = """
                    INSERT INTO works (vehicle_id, description, date, created_at)
                    VALUES (?, ?, ?, ?)
                """
                params = (
                    work.get('vehicle_id'),
                    work.get('description'),
                    work.get('date'),
                    work.get('created_at', datetime.now().isoformat())
                )
                db.execute_query(query, params, fetch=False)
                logger.info(f"Added work record for vehicle ID: {work.get('vehicle_id')}")
            else:
                logger.info(f"Work record with ID {work.get('id')} already exists, skipping")
        
        logger.info(f"Migrated {len(works)} work records")
        
        # Migrate vehicle analysis
        for analysis in vehicle_analysis:
            # Проверяем, существует ли уже запись с таким ID
            query = "SELECT id FROM vehicle_analysis WHERE id = ?"
            result = db.execute_query(query, (analysis.get('id'),))
            
            if not result:
                # Если записи нет, добавляем ее
                query = """
                    INSERT INTO vehicle_analysis (
                        vehicle_id, engine_health, oil_health, tires_health,
                        brakes_health, suspension_health, battery_health,
                        overall_health, recommendations, created_at
                    )
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """
                params = (
                    analysis.get('vehicle_id'),
                    analysis.get('engine_health'),
                    analysis.get('oil_health'),
                    analysis.get('tires_health'),
                    analysis.get('brakes_health'),
                    analysis.get('suspension_health'),
                    analysis.get('battery_health'),
                    analysis.get('overall_health'),
                    analysis.get('recommendations'),
                    analysis.get('created_at', datetime.now().isoformat())
                )
                db.execute_query(query, params, fetch=False)
                logger.info(f"Added analysis record for vehicle ID: {analysis.get('vehicle_id')}")
            else:
                logger.info(f"Analysis record with ID {analysis.get('id')} already exists, skipping")
        
        logger.info(f"Migrated {len(vehicle_analysis)} analysis records")
        
        logger.info("Data migration completed successfully")
        
    except Exception as e:
        logger.error(f"Error during data migration: {str(e)}")
        raise

if __name__ == "__main__":
    migrate_data() 