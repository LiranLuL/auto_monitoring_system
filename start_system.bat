@echo off
echo Starting Auto Monitoring System Components...
echo.

REM Запуск основного сервера мониторинга
start cmd /k "cd /d D:\auto_monitoring_system\MonitoringServer && npm run dev"


timeout /t 1


start cmd /k "cd /d D:\auto_monitoring_system\car-service-web && npm start"

timeout /t 1

REM Запуск сервиса периодического анализа

start cmd /k "cd /d D:\auto_monitoring_system\MonitoringServer\src\modules\predictive_analysis && python start_service.py"
timeout /t 1

REM Запуск эмулятора

start cmd /k "elm -n 35000"
echo.
echo All components started successfully!
echo.
echo Press any key to exit this window. Services will continue running.
pause > nul 