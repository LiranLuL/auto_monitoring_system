#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import os
import logging
import random
from datetime import datetime
from database import Database
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Set up logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger("PredictiveAnalyzer")

class PredictiveAnalyzer:
    """
    Класс для анализа состояния автомобиля на основе телеметрических данных.
    Генерирует оценки состояния различных систем автомобиля и рекомендации по обслуживанию.
    """
    
    def __init__(self):
        """
        Инициализация анализатора
        """
        self.db = Database()
        logger.info("Predictive analyzer initialized")
    
    def run_analysis(self, vehicle_id=None):
        """
        Запускает анализ для одного или всех автомобилей
        
        Args:
            vehicle_id (int, optional): ID конкретного автомобиля, если None - анализ всех автомобилей
            
        Returns:
            list: Список результатов анализа
        """
        try:
            results = []
            
            if vehicle_id:
                # Анализ для конкретного автомобиля
                vehicle = self.db.get_vehicle_by_id(vehicle_id)
                if vehicle:
                    result = self._analyze_vehicle(vehicle)
                    if result:
                        results.append(result)
                        logger.info(f"Analysis completed for vehicle {vehicle_id}")
                    else:
                        logger.warning(f"Analysis failed for vehicle {vehicle_id}")
                else:
                    logger.warning(f"Vehicle {vehicle_id} not found")
            else:
                # Анализ для всех автомобилей
                vehicles = self.db.get_all_vehicles()
                for vehicle in vehicles:
                    result = self._analyze_vehicle(vehicle)
                    if result:
                        results.append(result)
                        logger.info(f"Analysis completed for vehicle {vehicle.get('id')}")
                    else:
                        logger.warning(f"Analysis failed for vehicle {vehicle.get('id')}")
            
            return results
        
        except Exception as e:
            logger.error(f"Error during analysis: {str(e)}")
            return None
    
    def _analyze_vehicle(self, vehicle):
        """
        Анализирует состояние автомобиля и генерирует рекомендации
        
        Args:
            vehicle (dict): Данные об автомобиле
            
        Returns:
            dict: Результат анализа
        """
        try:
            vehicle_id = vehicle.get('id')
            
            # Получаем последние телеметрические данные
            telemetry_data = self.db.get_telemetry_data(vehicle_id)
            
            # Получаем историю работ
            work_history = self.db.get_vehicle_works(vehicle_id)
            
            # Анализируем состояние различных систем
            engine_health = self._analyze_engine_health(telemetry_data, work_history)
            oil_health = self._analyze_oil_health(telemetry_data, work_history)
            tires_health = self._analyze_tires_health(telemetry_data, work_history)
            brakes_health = self._analyze_brakes_health(telemetry_data, work_history)
            suspension_health = self._analyze_suspension_health(telemetry_data, work_history)
            battery_health = self._analyze_battery_health(telemetry_data, work_history)
            
            # Вычисляем общий рейтинг технического состояния
            overall_health = int((engine_health + oil_health + tires_health + 
                                 brakes_health + suspension_health + battery_health) / 6)
            
            # Генерируем рекомендации
            recommendations = self._generate_recommendations({
                'engine': engine_health,
                'oil': oil_health,
                'tires': tires_health,
                'brakes': brakes_health,
                'suspension': suspension_health,
                'battery': battery_health
            })
            
            # Формируем результат анализа
            analysis_result = {
                'vehicle_id': vehicle_id,
                'engine_health': engine_health,
                'oil_health': oil_health,
                'tires_health': tires_health,
                'brakes_health': brakes_health,
                'suspension_health': suspension_health,
                'battery_health': battery_health,
                'overall_health': overall_health,
                'recommendations': recommendations
            }
            
            # Сохраняем результат в базу данных
            self.db.save_analysis_result(analysis_result)
            
            return analysis_result
            
        except Exception as e:
            logger.error(f"Error analyzing vehicle {vehicle.get('id')}: {str(e)}")
            return None
    
    # Методы для анализа различных систем
    def _analyze_engine_health(self, telemetry_data, work_history):
        """
        Анализирует состояние двигателя на основе телеметрических данных
        
        Args:
            telemetry_data (list): Список записей телеметрии
            work_history (list): История работ по автомобилю
            
        Returns:
            int: Оценка состояния двигателя от 0 до 100
        """
        if not telemetry_data:
            logger.warning("No telemetry data available for engine health analysis")
            return 85  # Базовая оценка при отсутствии данных
        
        # Базовая оценка для двигателя
        health_score = 100
        issues_found = []
        
        # Получаем последние телеметрические данные
        latest_data = telemetry_data[-1]
        
        # Анализ температуры двигателя
        engine_temp = latest_data.get('engineTemp', 90)  # Нормальная температура около 90°C
        if engine_temp > 110:
            health_score -= 30
            issues_found.append(f"Критически высокая температура двигателя: {engine_temp}°C")
        elif engine_temp > 105:
            health_score -= 20
            issues_found.append(f"Повышенная температура двигателя: {engine_temp}°C")
        elif engine_temp > 100:
            health_score -= 10
            issues_found.append(f"Незначительно повышенная температура двигателя: {engine_temp}°C")
        
        # Анализ оборотов двигателя
        rpm = latest_data.get('rpm', 800)
        if rpm > 6000:
            health_score -= 15
            issues_found.append(f"Критически высокие обороты: {rpm} об/мин")
        elif rpm > 5000:
            health_score -= 5
            issues_found.append(f"Высокие обороты: {rpm} об/мин")
        
        # Анализ кодов ошибок (DTC)
        dtc_codes = latest_data.get('dtcCodes', "[]")
        try:
            dtc_list = eval(dtc_codes) if isinstance(dtc_codes, str) else dtc_codes
            if dtc_list and len(dtc_list) > 0:
                # Каждый код ошибки снижает оценку
                health_score -= min(25, len(dtc_list) * 8)  # Максимальное снижение 25 пунктов
                issues_found.append(f"Найдены коды ошибок: {dtc_list}")
        except Exception as e:
            logger.error(f"Error processing DTC codes: {str(e)}")
        
        # Анализ давления масла (если доступно)
        oil_pressure = latest_data.get('oilPressure')
        if oil_pressure is not None:
            if oil_pressure < 10:  # Критически низкое давление
                health_score -= 25
                issues_found.append(f"Критически низкое давление масла: {oil_pressure} PSI")
            elif oil_pressure < 20:  # Низкое давление
                health_score -= 15
                issues_found.append(f"Низкое давление масла: {oil_pressure} PSI")
        
        # Анализ расхода топлива (если доступно)
        fuel_consumption = latest_data.get('fuelConsumption')
        if fuel_consumption is not None:
            # Повышенный расход может указывать на проблемы
            avg_consumption = 8.0  # Предполагаемый средний расход
            if fuel_consumption > avg_consumption * 1.5:
                health_score -= 10
                issues_found.append(f"Повышенный расход топлива: {fuel_consumption} л/100км")
            elif fuel_consumption > avg_consumption * 1.2:
                health_score -= 5
                issues_found.append(f"Незначительно повышенный расход топлива: {fuel_consumption} л/100км")
        
        # Анализ значений MAF сенсора
        maf = latest_data.get('mafSensor')
        if maf is not None:
            # Проверка на необычно высокие или низкие значения MAF
            if maf > 100:
                health_score -= 5
                issues_found.append(f"Высокое значение массового расхода воздуха: {maf} г/с")
            elif maf < 5 and rpm > 1500:
                health_score -= 10
                issues_found.append(f"Низкое значение массового расхода воздуха при повышенных оборотах")
        
        # Учет истории ремонтов двигателя
        engine_works = [work for work in work_history if 'engine' in work.get('description', '').lower()]
        if engine_works:
            # Недавние работы могут указывать на проблемы
            last_work = engine_works[-1]
            days_since_last_work = (datetime.now() - datetime.strptime(last_work.get('date'), '%Y-%m-%d')).days
            if days_since_last_work < 30:
                health_score -= 5
                issues_found.append(f"Недавние работы с двигателем ({days_since_last_work} дней назад)")
        
        # Логирование найденных проблем
        if issues_found:
            issues_str = ', '.join(issues_found)
            logger.info(f"Engine health issues: {issues_str}")
        
        # Обеспечиваем, что оценка находится в пределах от 0 до 100
        health_score = max(0, min(100, health_score))
        
        return health_score
    
    def _analyze_oil_health(self, telemetry_data, work_history):
        """
        Анализирует состояние масла на основе телеметрических данных
        
        Args:
            telemetry_data (list): Список записей телеметрии
            work_history (list): История работ по автомобилю
            
        Returns:
            int: Оценка состояния масла от 0 до 100
        """
        if not telemetry_data:
            logger.warning("No telemetry data available for oil health analysis")
            return 80  # Базовая оценка при отсутствии данных
        
        # Базовая оценка для масла
        health_score = 100
        issues_found = []
        
        # Получаем последние телеметрические данные
        latest_data = telemetry_data[-1]
        
        # Проверяем историю замен масла
        oil_changes = [work for work in work_history if 'масло' in work.get('description', '').lower() or 'oil' in work.get('description', '').lower()]
        
        # Расчет времени с последней замены масла
        days_since_oil_change = 365  # По умолчанию предполагаем, что масло старое
        if oil_changes:
            last_oil_change = oil_changes[-1]
            days_since_oil_change = (datetime.now() - datetime.strptime(last_oil_change.get('date'), '%Y-%m-%d')).days
        
        # Снижаем оценку в зависимости от времени с последней замены
        if days_since_oil_change > 365:  # Более года
            health_score -= 50
            issues_found.append(f"Критический срок с последней замены масла: {days_since_oil_change} дней")
        elif days_since_oil_change > 270:  # 9 месяцев
            health_score -= 40
            issues_found.append(f"Превышен рекомендуемый срок замены масла: {days_since_oil_change} дней")
        elif days_since_oil_change > 180:  # 6 месяцев
            health_score -= 20
            issues_found.append(f"Приближается срок замены масла: {days_since_oil_change} дней")
        elif days_since_oil_change > 90:  # 3 месяца
            health_score -= 5
            issues_found.append(f"Масло используется {days_since_oil_change} дней")
        
        # Проверка пробега с последней замены (если доступно)
        if oil_changes and telemetry_data:
            try:
                last_change_date = datetime.strptime(oil_changes[-1].get('date'), '%Y-%m-%d')
                
                # Находим телеметрию ближайшую к дате замены масла
                mileage_at_change = None
                for data in sorted(telemetry_data, key=lambda x: abs((datetime.strptime(x.get('timestamp', '2000-01-01'), '%Y-%m-%d %H:%M:%S') - last_change_date).total_seconds())):
                    mileage_at_change = data.get('odometer')
                    if mileage_at_change is not None:
                        break
                
                if mileage_at_change is not None:
                    current_mileage = latest_data.get('odometer', mileage_at_change)
                    miles_since_change = current_mileage - mileage_at_change
                    
                    # Снижаем оценку в зависимости от пробега
                    if miles_since_change > 15000:  # Более 15,000 миль
                        health_score -= 40
                        issues_found.append(f"Критический пробег с последней замены масла: {miles_since_change} миль")
                    elif miles_since_change > 10000:  # Более 10,000 миль
                        health_score -= 30
                        issues_found.append(f"Превышен рекомендуемый пробег для замены масла: {miles_since_change} миль")
                    elif miles_since_change > 7500:  # Более 7,500 миль
                        health_score -= 15
                        issues_found.append(f"Приближается рекомендуемый пробег для замены масла: {miles_since_change} миль")
            except Exception as e:
                logger.error(f"Error calculating mileage since last oil change: {str(e)}")
        
        # Анализ температуры двигателя (влияет на состояние масла)
        engine_temp = latest_data.get('engineTemp', 90)
        if engine_temp > 110:
            health_score -= 15
            issues_found.append(f"Высокая температура двигателя ({engine_temp}°C) ускоряет деградацию масла")
        elif engine_temp > 100:
            health_score -= 5
            issues_found.append(f"Повышенная температура двигателя ({engine_temp}°C) может влиять на масло")
        
        # Анализ оборотов двигателя (высокие обороты могут влиять на масло)
        rpm = latest_data.get('rpm', 800)
        if rpm > 5000:
            health_score -= 5
            issues_found.append(f"Высокие обороты ({rpm} об/мин) могут ускорять износ масла")
        
        # Анализ давления масла (если доступно)
        oil_pressure = latest_data.get('oilPressure')
        if oil_pressure is not None:
            if oil_pressure < 15:
                health_score -= 20
                issues_found.append(f"Низкое давление масла: {oil_pressure} PSI")
            elif oil_pressure < 25:
                health_score -= 10
                issues_found.append(f"Пониженное давление масла: {oil_pressure} PSI")
        
        # Логирование найденных проблем
        if issues_found:
            issues_str = ', '.join(issues_found)
            logger.info(f"Oil health issues: {issues_str}")
        
        # Обеспечиваем, что оценка находится в пределах от 0 до 100
        health_score = max(0, min(100, health_score))
        
        return health_score
    
    def _analyze_tires_health(self, telemetry_data, work_history):
        """
        Анализирует состояние шин на основе телеметрических данных
        
        Args:
            telemetry_data (list): Список записей телеметрии
            work_history (list): История работ по автомобилю
            
        Returns:
            int: Оценка состояния шин от 0 до 100
        """
        if not telemetry_data:
            logger.warning("No telemetry data available for tires health analysis")
            return 85  # Базовая оценка при отсутствии данных
        
        # Базовая оценка для шин
        health_score = 100
        issues_found = []
        
        # Получаем последние телеметрические данные и историю
        latest_data = telemetry_data[-1]
        
        # Анализ замены шин
        tire_changes = [work for work in work_history if any(term in work.get('description', '').lower() for term in ['шин', 'колес', 'tire', 'wheel'])]
        
        # Расчет времени с последней замены шин
        months_since_tire_change = 48  # По умолчанию предполагаем, что шины старые (4 года)
        if tire_changes:
            last_tire_change = tire_changes[-1]
            days_since_change = (datetime.now() - datetime.strptime(last_tire_change.get('date'), '%Y-%m-%d')).days
            months_since_tire_change = days_since_change // 30
        
        # Снижаем оценку в зависимости от времени с последней замены
        if months_since_tire_change > 60:  # Более 5 лет
            health_score -= 40
            issues_found.append(f"Критический возраст шин: {months_since_tire_change} месяцев")
        elif months_since_tire_change > 48:  # Более 4 лет
            health_score -= 30
            issues_found.append(f"Превышен рекомендуемый срок службы шин: {months_since_tire_change} месяцев")
        elif months_since_tire_change > 36:  # Более 3 лет
            health_score -= 15
            issues_found.append(f"Шины используются {months_since_tire_change} месяцев")
        
        # Проверка пробега с последней замены шин (если доступно)
        if tire_changes and telemetry_data:
            try:
                last_change_date = datetime.strptime(tire_changes[-1].get('date'), '%Y-%m-%d')
                
                # Находим телеметрию ближайшую к дате замены шин
                mileage_at_change = None
                for data in sorted(telemetry_data, key=lambda x: abs((datetime.strptime(x.get('timestamp', '2000-01-01'), '%Y-%m-%d %H:%M:%S') - last_change_date).total_seconds())):
                    mileage_at_change = data.get('odometer')
                    if mileage_at_change is not None:
                        break
                
                if mileage_at_change is not None:
                    current_mileage = latest_data.get('odometer', mileage_at_change)
                    miles_since_change = current_mileage - mileage_at_change
                    
                    # Снижаем оценку в зависимости от пробега
                    if miles_since_change > 50000:  # Более 50,000 миль
                        health_score -= 40
                        issues_found.append(f"Критический пробег шин: {miles_since_change} миль")
                    elif miles_since_change > 40000:  # Более 40,000 миль
                        health_score -= 30
                        issues_found.append(f"Превышен рекомендуемый пробег шин: {miles_since_change} миль")
                    elif miles_since_change > 30000:  # Более 30,000 миль
                        health_score -= 15
                        issues_found.append(f"Приближается рекомендуемый срок замены шин: {miles_since_change} миль")
            except Exception as e:
                logger.error(f"Error calculating mileage since last tire change: {str(e)}")
        
        # Анализ данных о давлении в шинах (если доступно)
        tire_pressure = latest_data.get('tirePressure')
        if tire_pressure is not None:
            # Проверяем все шины, ожидаем список или словарь значений
            if isinstance(tire_pressure, dict):
                for position, pressure in tire_pressure.items():
                    if pressure < 25:  # PSI
                        health_score -= 20
                        issues_found.append(f"Критически низкое давление в шине {position}: {pressure} PSI")
                    elif pressure < 30:
                        health_score -= 10
                        issues_found.append(f"Пониженное давление в шине {position}: {pressure} PSI")
                    elif pressure > 38:
                        health_score -= 10
                        issues_found.append(f"Повышенное давление в шине {position}: {pressure} PSI")
            elif isinstance(tire_pressure, (int, float)):
                # Если есть только одно общее значение
                if tire_pressure < 25:
                    health_score -= 20
                    issues_found.append(f"Критически низкое давление в шинах: {tire_pressure} PSI")
                elif tire_pressure < 30:
                    health_score -= 10
                    issues_found.append(f"Пониженное давление в шинах: {tire_pressure} PSI")
                elif tire_pressure > 38:
                    health_score -= 10
                    issues_found.append(f"Повышенное давление в шинах: {tire_pressure} PSI")
        
        # Анализ скоростного режима
        speed_records = [data.get('speed', 0) for data in telemetry_data[-50:] if data.get('speed') is not None]
        if speed_records:
            max_speed = max(speed_records)
            avg_speed = sum(speed_records) / len(speed_records)
            
            # Высокие скорости ускоряют износ шин
            if max_speed > 140:  # км/ч
                health_score -= 10
                issues_found.append(f"Зафиксированы поездки на высокой скорости ({max_speed} км/ч)")
            elif max_speed > 120:
                health_score -= 5
                issues_found.append(f"Зафиксированы поездки на повышенной скорости ({max_speed} км/ч)")
        
        # Логирование найденных проблем
        if issues_found:
            issues_str = ', '.join(issues_found)
            logger.info(f"Tire health issues: {issues_str}")
        
        # Обеспечиваем, что оценка находится в пределах от 0 до 100
        health_score = max(0, min(100, health_score))
        
        return health_score
    
    def _analyze_brakes_health(self, telemetry_data, work_history):
        """
        Анализирует состояние тормозной системы на основе телеметрических данных
        
        Args:
            telemetry_data (list): Список записей телеметрии
            work_history (list): История работ по автомобилю
            
        Returns:
            int: Оценка состояния тормозной системы от 0 до 100
        """
        if not telemetry_data:
            logger.warning("No telemetry data available for brakes health analysis")
            return 85  # Базовая оценка при отсутствии данных
        
        # Базовая оценка для тормозной системы
        health_score = 100
        issues_found = []
        
        # Получаем последние телеметрические данные
        latest_data = telemetry_data[-1]
        
        # Анализ замены тормозных колодок и дисков
        brake_works = [work for work in work_history if any(term in work.get('description', '').lower() for term in ['тормоз', 'колод', 'диск', 'brake', 'pad', 'disc'])]
        
        # Расчет времени с последнего обслуживания тормозов
        months_since_brake_service = 36  # По умолчанию предполагаем, что обслуживание давно не проводилось
        if brake_works:
            last_brake_work = brake_works[-1]
            days_since_service = (datetime.now() - datetime.strptime(last_brake_work.get('date'), '%Y-%m-%d')).days
            months_since_brake_service = days_since_service // 30
        
        # Снижаем оценку в зависимости от времени с последнего обслуживания
        if months_since_brake_service > 36:  # Более 3 лет
            health_score -= 30
            issues_found.append(f"Критический срок с последнего обслуживания тормозов: {months_since_brake_service} месяцев")
        elif months_since_brake_service > 24:  # Более 2 лет
            health_score -= 20
            issues_found.append(f"Превышен рекомендуемый срок обслуживания тормозов: {months_since_brake_service} месяцев")
        elif months_since_brake_service > 12:  # Более 1 года
            health_score -= 10
            issues_found.append(f"Приближается срок обслуживания тормозов: {months_since_brake_service} месяцев")
        
        # Проверка пробега с последнего обслуживания тормозов
        if brake_works and telemetry_data:
            try:
                last_service_date = datetime.strptime(brake_works[-1].get('date'), '%Y-%m-%d')
                
                # Находим телеметрию ближайшую к дате обслуживания
                mileage_at_service = None
                for data in sorted(telemetry_data, key=lambda x: abs((datetime.strptime(x.get('timestamp', '2000-01-01'), '%Y-%m-%d %H:%M:%S') - last_service_date).total_seconds())):
                    mileage_at_service = data.get('odometer')
                    if mileage_at_service is not None:
                        break
                
                if mileage_at_service is not None:
                    current_mileage = latest_data.get('odometer', mileage_at_service)
                    miles_since_service = current_mileage - mileage_at_service
                    
                    # Снижаем оценку в зависимости от пробега
                    if miles_since_service > 50000:  # Более 50,000 миль
                        health_score -= 40
                        issues_found.append(f"Критический пробег с последнего обслуживания тормозов: {miles_since_service} миль")
                    elif miles_since_service > 30000:  # Более 30,000 миль
                        health_score -= 30
                        issues_found.append(f"Повышенный пробег с последнего обслуживания тормозов: {miles_since_service} миль")
                    elif miles_since_service > 20000:  # Более 20,000 миль
                        health_score -= 15
                        issues_found.append(f"Приближается рекомендуемый срок обслуживания тормозов: {miles_since_service} миль")
            except Exception as e:
                logger.error(f"Error calculating mileage since last brake service: {str(e)}")
        
        # Анализ данных о толщине тормозных колодок (если доступно)
        brake_pad_thickness = latest_data.get('brakePadThickness')
        if brake_pad_thickness is not None:
            # Проверяем все колодки, ожидаем список или словарь значений
            if isinstance(brake_pad_thickness, dict):
                for position, thickness in brake_pad_thickness.items():
                    if thickness < 2:  # мм
                        health_score -= 40
                        issues_found.append(f"Критический износ тормозных колодок {position}: {thickness} мм")
                    elif thickness < 4:
                        health_score -= 20
                        issues_found.append(f"Повышенный износ тормозных колодок {position}: {thickness} мм")
                    elif thickness < 6:
                        health_score -= 10
                        issues_found.append(f"Заметный износ тормозных колодок {position}: {thickness} мм")
            elif isinstance(brake_pad_thickness, (int, float)):
                # Если есть только одно общее значение
                if brake_pad_thickness < 2:
                    health_score -= 40
                    issues_found.append(f"Критический износ тормозных колодок: {brake_pad_thickness} мм")
                elif brake_pad_thickness < 4:
                    health_score -= 20
                    issues_found.append(f"Повышенный износ тормозных колодок: {brake_pad_thickness} мм")
                elif brake_pad_thickness < 6:
                    health_score -= 10
                    issues_found.append(f"Заметный износ тормозных колодок: {brake_pad_thickness} мм")
        
        # Анализ данных о состоянии тормозной жидкости (если доступно)
        brake_fluid = latest_data.get('brakeFluid')
        if brake_fluid is not None:
            if brake_fluid.lower() in ['low', 'низкий']:
                health_score -= 20
                issues_found.append("Низкий уровень тормозной жидкости")
            elif brake_fluid.lower() in ['old', 'contaminated', 'старый', 'загрязненный']:
                health_score -= 15
                issues_found.append("Загрязненная тормозная жидкость")
        
        # Анализ кодов ошибок (DTC), связанных с тормозной системой
        dtc_codes = latest_data.get('dtcCodes', "[]")
        try:
            dtc_list = eval(dtc_codes) if isinstance(dtc_codes, str) else dtc_codes
            brake_dtc_codes = [code for code in dtc_list if code.startswith('C')]  # Коды C обычно относятся к шасси, включая тормоза
            if brake_dtc_codes:
                health_score -= min(30, len(brake_dtc_codes) * 10)
                issues_found.append(f"Обнаружены коды ошибок тормозной системы: {brake_dtc_codes}")
        except Exception as e:
            logger.error(f"Error processing DTC codes for brakes: {str(e)}")
        
        # Анализ скоростного режима (частое резкое торможение ускоряет износ)
        if len(telemetry_data) > 1:
            try:
                # Считаем количество случаев резкого снижения скорости (резкого торможения)
                sudden_braking_count = 0
                for i in range(1, min(30, len(telemetry_data))):
                    prev_speed = telemetry_data[-i-1].get('speed', 0)
                    curr_speed = telemetry_data[-i].get('speed', 0)
                    
                    if prev_speed - curr_speed > 20:  # Снижение скорости более чем на 20 км/ч
                        sudden_braking_count += 1
                
                if sudden_braking_count > 10:
                    health_score -= 15
                    issues_found.append(f"Частое резкое торможение: {sudden_braking_count} случаев")
                elif sudden_braking_count > 5:
                    health_score -= 5
                    issues_found.append(f"Умеренное количество случаев резкого торможения: {sudden_braking_count}")
            except Exception as e:
                logger.error(f"Error analyzing braking patterns: {str(e)}")
        
        # Логирование найденных проблем
        if issues_found:
            issues_str = ', '.join(issues_found)
            logger.info(f"Brake health issues: {issues_str}")
        
        # Обеспечиваем, что оценка находится в пределах от 0 до 100
        health_score = max(0, min(100, health_score))
        
        return health_score
    
    def _analyze_suspension_health(self, telemetry_data, work_history):
        """
        Анализирует состояние подвески на основе телеметрических данных
        
        Args:
            telemetry_data (list): Список записей телеметрии
            work_history (list): История работ по автомобилю
            
        Returns:
            int: Оценка состояния подвески от 0 до 100
        """
        if not telemetry_data:
            logger.warning("No telemetry data available for suspension health analysis")
            return 85  # Базовая оценка при отсутствии данных
        
        # Базовая оценка для подвески
        health_score = 100
        issues_found = []
        
        # Получаем последние телеметрические данные
        latest_data = telemetry_data[-1]
        
        # Анализ работ с подвеской
        suspension_works = [work for work in work_history if any(term in work.get('description', '').lower() for term in ['подвес', 'аморт', 'пруж', 'стойк', 'suspend', 'shock', 'spring', 'strut'])]
        
        # Расчет времени с последнего обслуживания подвески
        years_since_suspension_service = 5  # По умолчанию предполагаем, что обслуживание давно не проводилось
        if suspension_works:
            last_suspension_work = suspension_works[-1]
            days_since_service = (datetime.now() - datetime.strptime(last_suspension_work.get('date'), '%Y-%m-%d')).days
            years_since_suspension_service = days_since_service / 365
        
        # Снижаем оценку в зависимости от времени с последнего обслуживания
        if years_since_suspension_service > 8:  # Более 8 лет
            health_score -= 40
            issues_found.append(f"Критический срок с последнего обслуживания подвески: {years_since_suspension_service:.1f} лет")
        elif years_since_suspension_service > 5:  # Более 5 лет
            health_score -= 25
            issues_found.append(f"Превышен рекомендуемый срок обслуживания подвески: {years_since_suspension_service:.1f} лет")
        elif years_since_suspension_service > 3:  # Более 3 лет
            health_score -= 10
            issues_found.append(f"Приближается срок обслуживания подвески: {years_since_suspension_service:.1f} лет")
        
        # Проверка пробега с последнего обслуживания подвески
        if suspension_works and telemetry_data:
            try:
                last_service_date = datetime.strptime(suspension_works[-1].get('date'), '%Y-%m-%d')
                
                # Находим телеметрию ближайшую к дате обслуживания
                mileage_at_service = None
                for data in sorted(telemetry_data, key=lambda x: abs((datetime.strptime(x.get('timestamp', '2000-01-01'), '%Y-%m-%d %H:%M:%S') - last_service_date).total_seconds())):
                    mileage_at_service = data.get('odometer')
                    if mileage_at_service is not None:
                        break
                
                if mileage_at_service is not None:
                    current_mileage = latest_data.get('odometer', mileage_at_service)
                    miles_since_service = current_mileage - mileage_at_service
                    
                    # Снижаем оценку в зависимости от пробега
                    if miles_since_service > 80000:  # Более 80,000 миль
                        health_score -= 30
                        issues_found.append(f"Критический пробег с последнего обслуживания подвески: {miles_since_service} миль")
                    elif miles_since_service > 50000:  # Более 50,000 миль
                        health_score -= 20
                        issues_found.append(f"Повышенный пробег с последнего обслуживания подвески: {miles_since_service} миль")
                    elif miles_since_service > 30000:  # Более 30,000 миль
                        health_score -= 10
                        issues_found.append(f"Значительный пробег с последнего обслуживания подвески: {miles_since_service} миль")
            except Exception as e:
                logger.error(f"Error calculating mileage since last suspension service: {str(e)}")
        
        # Анализ данных о вибрациях (если доступно)
        vibration_data = latest_data.get('vibration')
        if vibration_data is not None:
            if isinstance(vibration_data, dict):
                for position, value in vibration_data.items():
                    if value > 3.0:  # Высокий уровень вибрации
                        health_score -= 20
                        issues_found.append(f"Сильные вибрации в области {position}: {value}")
                    elif value > 2.0:
                        health_score -= 10
                        issues_found.append(f"Повышенные вибрации в области {position}: {value}")
            elif isinstance(vibration_data, (int, float)):
                if vibration_data > 3.0:
                    health_score -= 20
                    issues_found.append(f"Сильные вибрации: {vibration_data}")
                elif vibration_data > 2.0:
                    health_score -= 10
                    issues_found.append(f"Повышенные вибрации: {vibration_data}")
        
        # Анализ жалоб/отзывов пользователя на подвеску (если доступно)
        suspension_complaints = latest_data.get('suspensionComplaints', [])
        if suspension_complaints:
            # Каждая жалоба снижает оценку
            health_score -= min(30, len(suspension_complaints) * 10)
            complaints_str = ', '.join(suspension_complaints)
            issues_found.append(f"Зарегистрированы жалобы на подвеску: {complaints_str}")
        
        # Анализ качества дорог (если доступно)
        road_quality = latest_data.get('roadQuality')
        if road_quality is not None:
            if road_quality.lower() in ['poor', 'bad', 'плохое']:
                health_score -= 10
                issues_found.append("Эксплуатация на дорогах низкого качества")
            elif road_quality.lower() in ['terrible', 'ужасное']:
                health_score -= 15
                issues_found.append("Эксплуатация на дорогах очень низкого качества")
        
        # Анализ кодов ошибок (DTC), связанных с подвеской
        dtc_codes = latest_data.get('dtcCodes', "[]")
        try:
            dtc_list = eval(dtc_codes) if isinstance(dtc_codes, str) else dtc_codes
            suspension_dtc_codes = [code for code in dtc_list if code.startswith('C')]  # Коды C обычно относятся к шасси
            if suspension_dtc_codes:
                health_score -= min(25, len(suspension_dtc_codes) * 8)
                issues_found.append(f"Обнаружены коды ошибок, связанные с шасси: {suspension_dtc_codes}")
        except Exception as e:
            logger.error(f"Error processing DTC codes for suspension: {str(e)}")
        
        # Логирование найденных проблем
        if issues_found:
            issues_str = ', '.join(issues_found)
            logger.info(f"Suspension health issues: {issues_str}")
        
        # Обеспечиваем, что оценка находится в пределах от 0 до 100
        health_score = max(0, min(100, health_score))
        
        return health_score
    
    def _analyze_battery_health(self, telemetry_data, work_history):
        """
        Анализирует состояние аккумулятора на основе телеметрических данных
        
        Args:
            telemetry_data (list): Список записей телеметрии
            work_history (list): История работ по автомобилю
            
        Returns:
            int: Оценка состояния аккумулятора от 0 до 100
        """
        if not telemetry_data:
            logger.warning("No telemetry data available for battery health analysis")
            return 85  # Базовая оценка при отсутствии данных
        
        # Базовая оценка для аккумулятора
        health_score = 100
        issues_found = []
        
        # Получаем последние телеметрические данные
        latest_data = telemetry_data[-1]
        
        # Анализ замены аккумулятора
        battery_replacements = [work for work in work_history if any(term in work.get('description', '').lower() for term in ['аккумулятор', 'батаре', 'battery', 'batt'])]
        
        # Расчет времени с последней замены аккумулятора
        years_since_battery_replacement = 4  # По умолчанию предполагаем, что аккумулятор старый
        if battery_replacements:
            last_battery_replacement = battery_replacements[-1]
            days_since_replacement = (datetime.now() - datetime.strptime(last_battery_replacement.get('date'), '%Y-%m-%d')).days
            years_since_battery_replacement = days_since_replacement / 365
        
        # Снижаем оценку в зависимости от возраста аккумулятора
        if years_since_battery_replacement > 5:  # Более 5 лет
            health_score -= 40
            issues_found.append(f"Критический возраст аккумулятора: {years_since_battery_replacement:.1f} лет")
        elif years_since_battery_replacement > 4:  # Более 4 лет
            health_score -= 30
            issues_found.append(f"Аккумулятор превысил рекомендуемый срок службы: {years_since_battery_replacement:.1f} лет")
        elif years_since_battery_replacement > 3:  # Более 3 лет
            health_score -= 20
            issues_found.append(f"Аккумулятор приближается к концу срока службы: {years_since_battery_replacement:.1f} лет")
        
        # Анализ напряжения аккумулятора (если доступно)
        battery_voltage = latest_data.get('batteryVoltage')
        if battery_voltage is not None:
            if battery_voltage < 11.5:  # Вольт
                health_score -= 40
                issues_found.append(f"Критически низкое напряжение аккумулятора: {battery_voltage} В")
            elif battery_voltage < 12.0:
                health_score -= 30
                issues_found.append(f"Пониженное напряжение аккумулятора: {battery_voltage} В")
            elif battery_voltage < 12.4:
                health_score -= 15
                issues_found.append(f"Напряжение аккумулятора ниже оптимального: {battery_voltage} В")
            elif battery_voltage > 14.7:
                health_score -= 20
                issues_found.append(f"Повышенное напряжение в системе: {battery_voltage} В (возможные проблемы с генератором)")
        
        # Анализ CCA (тока холодной прокрутки) аккумулятора (если доступно)
        battery_cca = latest_data.get('batteryCCA')
        if battery_cca is not None:
            original_cca = latest_data.get('originalBatteryCCA', 600)  # Используем стандартное значение, если оригинальное неизвестно
            cca_percentage = (battery_cca / original_cca) * 100
            
            if cca_percentage < 60:
                health_score -= 40
                issues_found.append(f"Критически низкий ток холодной прокрутки: {cca_percentage:.1f}% от номинала")
            elif cca_percentage < 75:
                health_score -= 25
                issues_found.append(f"Значительно сниженный ток холодной прокрутки: {cca_percentage:.1f}% от номинала")
            elif cca_percentage < 85:
                health_score -= 10
                issues_found.append(f"Сниженный ток холодной прокрутки: {cca_percentage:.1f}% от номинала")
        
        # Анализ проблем с запуском двигателя (если данные доступны)
        start_problems = latest_data.get('startProblems', 0)
        if start_problems > 3:
            health_score -= 25
            issues_found.append(f"Частые проблемы с запуском двигателя ({start_problems} случаев)")
        elif start_problems > 1:
            health_score -= 15
            issues_found.append(f"Отмечены проблемы с запуском двигателя ({start_problems} случая)")
        
        # Анализ плотности электролита (для обычных свинцово-кислотных аккумуляторов, если данные доступны)
        electrolyte_density = latest_data.get('electrolyteDensity')
        if electrolyte_density is not None:
            if electrolyte_density < 1.225:
                health_score -= 30
                issues_found.append(f"Низкая плотность электролита: {electrolyte_density}")
            elif electrolyte_density < 1.250:
                health_score -= 15
                issues_found.append(f"Пониженная плотность электролита: {electrolyte_density}")
        
        # Анализ температурного режима эксплуатации (экстремальные температуры сокращают срок службы)
        climate_data = latest_data.get('climateConditions')
        if climate_data:
            if climate_data.lower() in ['extreme cold', 'extreme hot', 'экстремально холодный', 'экстремально жаркий']:
                health_score -= 10
                issues_found.append(f"Эксплуатация в экстремальных температурных условиях: {climate_data}")
        
        # Анализ состояния генератора (влияет на зарядку аккумулятора)
        alternator_data = latest_data.get('alternatorOutput')
        if alternator_data is not None:
            if alternator_data < 13.0:
                health_score -= 15
                issues_found.append(f"Недостаточное напряжение от генератора: {alternator_data} В")
            elif alternator_data > 15.0:
                health_score -= 15
                issues_found.append(f"Повышенное напряжение от генератора: {alternator_data} В")
        
        # Логирование найденных проблем
        if issues_found:
            issues_str = ', '.join(issues_found)
            logger.info(f"Battery health issues: {issues_str}")
        
        # Обеспечиваем, что оценка находится в пределах от 0 до 100
        health_score = max(0, min(100, health_score))
        
        return health_score
    
    def _generate_recommendations(self, health_ratings):
        """
        Генерирует рекомендации на основе рейтингов технического состояния
        
        Args:
            health_ratings (dict): Рейтинги систем автомобиля
            
        Returns:
            list: Список рекомендаций
        """
        recommendations = []
        
        # Рекомендации для двигателя
        if health_ratings['engine'] < 50:
            recommendations.append("Требуется срочная диагностика и ремонт двигателя. Возможны серьезные неисправности.")
        elif health_ratings['engine'] < 70:
            recommendations.append("Рекомендуется диагностика двигателя. Обнаружены признаки износа или неисправностей.")
        elif health_ratings['engine'] < 85:
            recommendations.append("Рекомендуется проверка двигателя при следующем ТО. Есть признаки начального износа.")
        
        # Рекомендации для масла
        if health_ratings['oil'] < 50:
            recommendations.append("Требуется немедленная замена масла и масляного фильтра. Критический уровень износа масла.")
        elif health_ratings['oil'] < 65:
            recommendations.append("Срочно замените масло и масляный фильтр. Масло значительно изношено.")
        elif health_ratings['oil'] < 80:
            recommendations.append("Рекомендуется замена масла в ближайшее время. Свойства масла ухудшаются.")
        
        # Рекомендации для шин
        if health_ratings['tires'] < 50:
            recommendations.append("Требуется срочная замена шин. Критический износ или превышен срок службы.")
        elif health_ratings['tires'] < 65:
            recommendations.append("Рекомендуется проверка и, возможно, замена шин. Значительный износ.")
        elif health_ratings['tires'] < 80:
            recommendations.append("Проверьте давление в шинах и их износ при следующем ТО.")
        
        # Рекомендации для тормозов
        if health_ratings['brakes'] < 50:
            recommendations.append("Требуется срочное обслуживание тормозной системы. Критический износ компонентов.")
        elif health_ratings['brakes'] < 70:
            recommendations.append("Рекомендуется проверка тормозной системы. Признаки значительного износа колодок или дисков.")
        elif health_ratings['brakes'] < 85:
            recommendations.append("Проверьте состояние тормозных колодок и уровень тормозной жидкости при следующем ТО.")
        
        # Рекомендации для подвески
        if health_ratings['suspension'] < 60:
            recommendations.append("Требуется диагностика и ремонт подвески. Повышенный износ или повреждения компонентов.")
        elif health_ratings['suspension'] < 75:
            recommendations.append("Рекомендуется проверка подвески. Возможны неисправности амортизаторов или других компонентов.")
        elif health_ratings['suspension'] < 90:
            recommendations.append("Проверьте состояние подвески при следующем ТО.")
        
        # Рекомендации для аккумулятора
        if health_ratings['battery'] < 60:
            recommendations.append("Требуется замена аккумулятора. Критическое снижение емкости или напряжения.")
        elif health_ratings['battery'] < 75:
            recommendations.append("Рекомендуется проверка и, возможно, замена аккумулятора в ближайшее время.")
        elif health_ratings['battery'] < 85:
            recommendations.append("Проверьте заряд и состояние аккумулятора при следующем ТО.")
        
        # Общие рекомендации на основе общей оценки
        overall_health = sum(health_ratings.values()) / len(health_ratings)
        
        if overall_health < 60:
            recommendations.append("Автомобиль требует комплексного технического обслуживания. Рекомендуется посещение сервисного центра в ближайшее время.")
        elif overall_health < 75:
            recommendations.append("Общее состояние автомобиля удовлетворительное. Рекомендуется плановое техническое обслуживание.")
        elif overall_health < 90:
            recommendations.append("Общее состояние автомобиля хорошее. Рекомендуется придерживаться регулярного графика обслуживания.")
        else:
            recommendations.append("Автомобиль в отличном техническом состоянии. Продолжайте регулярное обслуживание.")
        
        # Добавляем рекомендацию по регулярному использованию системы мониторинга
        recommendations.append("Для оптимального отслеживания состояния автомобиля рекомендуется регулярно подключаться к системе мониторинга.")
        
        return recommendations


if __name__ == "__main__":
    analyzer = PredictiveAnalyzer()
    
    # If called directly, analyze all vehicles
    results = analyzer.run_analysis()
    if results:
        logger.info(f"Analysis completed for {len(results)} vehicles")
    else:
        logger.warning("No analysis results generated") 