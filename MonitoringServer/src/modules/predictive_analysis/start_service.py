#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import os
import sys
import time
import logging
import subprocess
import threading
from dotenv import load_dotenv
from datetime import datetime
from api_server import app
from predictive_analyzer import PredictiveAnalyzer
from database import Database

# Set up logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler("service.log"),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger("Service")

# Load environment variables
load_dotenv()

def check_requirements():
    """
    Проверить и установить необходимые базовые библиотеки
    """
    required_packages = ["python-dotenv", "flask", "requests", "numpy"]
    
    try:
        logger.info("Checking basic requirements...")
        for package in required_packages:
            try:
                subprocess.check_call([sys.executable, "-m", "pip", "install", package])
                logger.info(f"Installed {package}")
            except Exception as e:
                logger.error(f"Error installing {package}: {str(e)}")
                if package in ["python-dotenv", "flask", "requests"]:  # Критически важные пакеты
                    return False
        
        return True
    except Exception as e:
        logger.error(f"Error checking requirements: {str(e)}")
        return False

def check_database():
    """
    Проверка доступности базы данных PostgreSQL
    """
    try:
        logger.info("Checking PostgreSQL connection...")
        # Пробуем импортировать psycopg2
        try:
            import psycopg2
            logger.info("psycopg2 is installed")
        except ImportError:
            logger.warning("psycopg2 is not installed, will use sqlite instead")
            return False
            
        # Пробуем подключиться к PostgreSQL
        try:
            from database import Database
            db = Database()
            logger.info("PostgreSQL connection successful")
            return True
        except Exception as e:
            logger.warning(f"Failed to connect to PostgreSQL: {str(e)}")
            return False
    except Exception as e:
        logger.error(f"Error checking database: {str(e)}")
        return False

def install_full_requirements():
    """
    Пытаемся установить все зависимости
    """
    try:
        logger.info("Installing all requirements...")
        subprocess.check_call([sys.executable, "-m", "pip", "install", "-r", "requirements.txt"])
        logger.info("Requirements installed successfully")
        return True
    except Exception as e:
        logger.error(f"Error installing requirements: {str(e)}")
        return False

def run_periodic_analysis():
    """
    Запускает анализ всех автомобилей каждые 20 минут
    """
    analyzer = PredictiveAnalyzer()
    
    while True:
        try:
            logger.info("Starting periodic analysis of all vehicles")
            results = analyzer.run_analysis()
            
            if results:
                logger.info(f"Analysis completed for {len(results)} vehicles")
            else:
                logger.warning("No vehicles analyzed or analysis failed")
                
            # Ждем 20 минут перед следующим анализом
            time.sleep(1200)  # 20 минут = 1200 секунд
            
        except Exception as e:
            logger.error(f"Error in periodic analysis: {str(e)}")
            time.sleep(60)  # При ошибке ждем минуту перед повторной попыткой

def start_service():
    """
    Запускает сервис анализа и API сервер
    """
    try:
        # Запускаем периодический анализ в отдельном потоке
        analysis_thread = threading.Thread(target=run_periodic_analysis)
        analysis_thread.daemon = True
        analysis_thread.start()
        
        # Запускаем API сервер
        app.run(host='0.0.0.0', port=5001, debug=False)
        
    except Exception as e:
        logger.error(f"Service error: {str(e)}")
        raise

if __name__ == "__main__":
    logger.info("Starting predictive analysis service...")
    
    # Запустить сервис
    start_service() 