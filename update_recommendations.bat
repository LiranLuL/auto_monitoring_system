@echo off
echo Updating vehicle recommendations in database...
echo.

REM Сначала обновляем данные миграцией
echo Running data migration...
cd /d D:\auto_monitoring_system\MonitoringServer\src\modules\predictive_analysis
python migrate_data.py
echo.

REM Затем обеспечиваем наличие рекомендаций
echo Ensuring recommendations exist for all vehicles...
python ensure_recommendations.py
echo.

echo Recommendations update completed successfully!
echo.
echo Press any key to exit this window.
pause > nul 