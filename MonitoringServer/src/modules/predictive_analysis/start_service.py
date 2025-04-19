#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import os
import sys
import time
import logging
import subprocess
from dotenv import load_dotenv

# Set up logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler("service.log"),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger("StartupScript")

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

def start_service():
    """
    Запустить API сервер для предиктивного анализа
    """
    try:
        # Проверяем наличие основных библиотек
        if not check_requirements():
            logger.error("Failed to install critical requirements. Exiting...")
            return False
            
        # Пробуем установить все зависимости
        install_full_requirements()
        
        # Сразу используем файловую БД вместо SQLite или PostgreSQL
        logger.info("Using pure file-based mock database")
        
        # Переименовываем файл database.py, если он существует
        if os.path.exists("database.py"):
            backup_filename = f"database.py.bak.{int(time.time())}"
            os.rename("database.py", backup_filename)
            logger.info(f"Renamed database.py to {backup_filename}")
        
        # Копируем database_pure_mock.py в database.py
        if os.path.exists("database_pure_mock.py"):
            # Copy the file instead of renaming to preserve the original
            import shutil
            shutil.copy2("database_pure_mock.py", "database.py")
            logger.info("Copied pure Python mock database implementation to database.py")
        else:
            logger.error("No database_pure_mock.py file found. Cannot continue.")
            return False
        
        try:
            # Test database connection before proceeding
            from importlib import reload
            try:
                import database
                reload(database)
            except:
                import database
                
            from database import Database
            test_db = Database()
            
            # Create data directory if it doesn't exist
            data_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'mock_data')
            os.makedirs(data_dir, exist_ok=True)
            
            # Add sample data for testing
            if hasattr(test_db, 'add_sample_data_if_empty'):
                test_db.add_sample_data_if_empty()
                logger.info("Added sample data if needed")
            
            # Start API server
            logger.info("Starting API server with pure Python database...")
            subprocess.call([sys.executable, "api_server.py"])
        except Exception as db_error:
            logger.error(f"Database error: {str(db_error)}")
            logger.error("Could not initialize database. Check error log for details.")
            return False
        
    except Exception as e:
        logger.error(f"Error starting service: {str(e)}")
        return False

if __name__ == "__main__":
    logger.info("Starting predictive analysis service...")
    
    # Запустить сервис
    start_service() 