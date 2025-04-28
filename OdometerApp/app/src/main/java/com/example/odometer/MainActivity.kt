package com.example.odometer
import android.content.Intent
import android.os.Bundle
import android.util.Log
import android.widget.Toast
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.foundation.layout.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.foundation.lazy.LazyColumn
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import java.io.BufferedOutputStream
import java.io.InputStream
import java.io.OutputStream
import java.net.HttpURLConnection
import java.net.InetSocketAddress
import java.net.Socket
import java.net.URL
import org.json.JSONObject
import org.json.JSONArray
import android.content.Context
import kotlinx.coroutines.Job
import kotlinx.coroutines.isActive
import kotlinx.coroutines.withContext
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.platform.LocalContext
import com.example.odometerapp.ui.RecommendationsActivity
import androidx.compose.animation.core.FastOutSlowInEasing
import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.animateIntAsState
import androidx.compose.animation.core.tween
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.draw.clip
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.ui.graphics.Color
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import androidx.lifecycle.ViewModelProvider
import androidx.lifecycle.ViewModelStoreOwner

import android.view.View
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Warning
import androidx.compose.ui.text.font.FontStyle
import androidx.compose.ui.unit.sp

// Используем локальную версию BluetoothDeviceSelectionActivity
// import com.example.odometerapp.BluetoothDeviceSelectionActivity

// Создаем отдельный ViewModel для работы с OBD данными
class OdometerViewModel : ViewModel() {
    // StateFlow переменные из MainActivity
    private val _isCollectingData = MutableStateFlow(false)
    val isCollectingData: StateFlow<Boolean> = _isCollectingData.asStateFlow()
    
    private val _rpmValue = MutableStateFlow(0)
    val rpmValue: StateFlow<Int> = _rpmValue.asStateFlow()
    
    private val _speedValue = MutableStateFlow(0)
    val speedValue: StateFlow<Int> = _speedValue.asStateFlow()
    
    private val _engineTempValue = MutableStateFlow(0)
    val engineTempValue: StateFlow<Int> = _engineTempValue.asStateFlow()
    
    private val _dtcCodesValue = MutableStateFlow("")
    val dtcCodesValue: StateFlow<String> = _dtcCodesValue.asStateFlow()
    
    private val _o2VoltageValue = MutableStateFlow(0.0)
    val o2VoltageValue: StateFlow<Double> = _o2VoltageValue.asStateFlow()
    
    private val _fuelLevelValue = MutableStateFlow(0.0)
    val fuelLevelValue: StateFlow<Double> = _fuelLevelValue.asStateFlow()
    
    private val _intakeTempValue = MutableStateFlow(0)
    val intakeTempValue: StateFlow<Int> = _intakeTempValue.asStateFlow()
    
    private val _mafSensorValue = MutableStateFlow(0.0)
    val mafSensorValue: StateFlow<Double> = _mafSensorValue.asStateFlow()
    
    private val _throttlePosValue = MutableStateFlow(0)
    val throttlePosValue: StateFlow<Int> = _throttlePosValue.asStateFlow()
    
    private val _engineHealthValue = MutableStateFlow(100)
    val engineHealthValue: StateFlow<Int> = _engineHealthValue.asStateFlow()
    
    private val _oilHealthValue = MutableStateFlow(100)
    val oilHealthValue: StateFlow<Int> = _oilHealthValue.asStateFlow()
    
    private val _tiresHealthValue = MutableStateFlow(100)
    val tiresHealthValue: StateFlow<Int> = _tiresHealthValue.asStateFlow()
    
    private val _brakesHealthValue = MutableStateFlow(100)
    val brakesHealthValue: StateFlow<Int> = _brakesHealthValue.asStateFlow()
    
    private val _collectingStatus = MutableStateFlow("Статус: Не подключено")
    val collectingStatus: StateFlow<String> = _collectingStatus.asStateFlow()
    
    private var dataCollectionJob: Job? = null
    private var simulationJob: Job? = null
    private var telemetryData = JSONObject()
    
    fun startDataCollection(context: Context) {
        dataCollectionJob?.cancel()
        _collectingStatus.value = "Статус: Запуск сбора данных..."
        _isCollectingData.value = true
        
        dataCollectionJob = viewModelScope.launch {
            val emulator = Elm327Emulator("192.168.0.121", 35000)
            
            try {
                val connected = emulator.connect()
                
                if (connected) {
                    _collectingStatus.value = "Статус: Подключено к ELM327. Сбор данных..."
                    
                        while (isActive) {
                        try {
                            // Получаем данные с эмулятора
                            val rpm = emulator.getRPM() ?: 0
                            val speed = emulator.getSpeed() ?: 0
                            val dtcCodes = emulator.getDtcCodes()
                            val dtcJson = if (dtcCodes.isEmpty()) "[]" else JSONArray(dtcCodes).toString()
                            
                            // Получаем дополнительные данные (которые могут не поддерживаться эмулятором)
                            val temp = (75..105).random() // Температуру эмулируем
                            val o2 = simulateO2Voltage(rpm, temp)
                            val fuel = simulateFuelPressure(rpm)
                            val intake = simulateIntakeTemperature(temp)
                            val maf = simulateMAF(rpm)
                            val throttle = simulateThrottle(rpm)
                            
                            // Вычисляем здоровье компонентов
                            val engineHealth = calculateEngineHealth(rpm, temp, dtcJson)
                            val oilHealth = calculateOilHealth(rpm, temp)
                            val tiresHealth = calculateTiresHealth(speed)
                            val brakesHealth = calculateBrakesHealth(speed)
                            
                            // Создаем объект для отправки на сервер
                            val telemetryData = JSONObject()
                            telemetryData.put("rpm", rpm)
                            telemetryData.put("speed", speed)
                            telemetryData.put("engineTemp", temp)
                            telemetryData.put("dtcCodes", dtcJson)
                            telemetryData.put("o2Voltage", o2)
                            telemetryData.put("fuelLevel", fuel)
                            telemetryData.put("intakeTemp", intake)
                            telemetryData.put("mafSensor", maf)
                            telemetryData.put("throttlePos", throttle)
                            telemetryData.put("engineHealth", engineHealth)
                            telemetryData.put("oilHealth", oilHealth)
                            telemetryData.put("tiresHealth", tiresHealth)
                            telemetryData.put("brakesHealth", brakesHealth)
                            
                            // Отправляем данные на сервер
                            Log.d("API", "Sending data: $telemetryData")
                            sendToBackend(context, telemetryData)
                            
                            // Обновляем UI
                            _rpmValue.value = rpm
                            _speedValue.value = speed
                            _engineTempValue.value = temp
                            _dtcCodesValue.value = dtcJson
                            _o2VoltageValue.value = o2
                            _fuelLevelValue.value = fuel
                            _intakeTempValue.value = intake
                            _mafSensorValue.value = maf
                            _throttlePosValue.value = throttle
                            _engineHealthValue.value = engineHealth
                            _oilHealthValue.value = oilHealth
                            _tiresHealthValue.value = tiresHealth
                            _brakesHealthValue.value = brakesHealth
                            
                            _collectingStatus.value = "Статус: Данные получены (${System.currentTimeMillis()})"
                            
                            // Задержка между опросами
                            delay(5000)
                        } catch (e: Exception) {
                            // Улучшенное логирование типа ошибки
                            val errorType = e::class.simpleName ?: "UnknownType"
                            val errorMessage = e.message ?: "No message"
                            Log.e("ELM327", "Error collecting data (Type: $errorType): $errorMessage", e)
                            _collectingStatus.value = "Статус: Ошибка сбора данных ($errorType)"
                            delay(2000)
                        }
                    }
                } else {
                    _collectingStatus.value = "Статус: Не удалось подключиться к ELM327. Запуск эмуляции..."
                    
                    // Если эмулятор недоступен, запускаем генерацию тестовых данных
                    while (isActive) {
                        generateTestData(context)
                        delay(5000)
                    }
                }
            } catch (e: Exception) {
                Log.e("DataCollection", "Error in data collection: ${e.message}", e)
                _collectingStatus.value = "Статус: Ошибка - ${e.message}. Запуск эмуляции..."
                
                // В случае ошибки тоже используем тестовые данные
                while (isActive) {
                    generateTestData(context)
                    delay(5000)
                }
            } finally {
                // Закрываем соединение с эмулятором
                emulator.disconnect()
                
                // Обеспечиваем сброс состояния при любом завершении
                _isCollectingData.value = false
            }
        }
    }
    
    fun stopDataCollection() {
        dataCollectionJob?.cancel()
        dataCollectionJob = null
        _collectingStatus.value = "Статус: Остановлено"
        _isCollectingData.value = false
    }
    
    // Функция для генерации тестовых данных
    private suspend fun generateTestData(context: Context) {
        // Инициализируем эмулятор ELM327
        val emulator = Elm327Emulator("192.168.0.121", 35000)
        
        try {
            // Пытаемся подключиться к эмулятору
            val connected = emulator.connect()
            
            if (connected) {
                _collectingStatus.value = "Статус: Подключено к эмулятору ELM327"
                
                // Получаем данные с эмулятора
                val rpm = emulator.getRPM() ?: (800..4000).random()
                val speed = emulator.getSpeed() ?: (20..120).random()
                val dtcCodes = emulator.getDtcCodes()
                
                // Генерируем дополнительные данные, которые могут не поддерживаться эмулятором
                val temp = (75..105).random()
                val o2 = simulateO2Voltage(rpm, temp)
                val fuel = simulateFuelPressure(rpm)
                val intake = simulateIntakeTemperature(temp)
                val maf = simulateMAF(rpm)
                val throttle = simulateThrottle(rpm)
                
                // Вычисляем здоровье компонентов
                val dtcJson = if (dtcCodes.isEmpty()) "[]" else JSONArray(dtcCodes).toString()
                val engineHealth = calculateEngineHealth(rpm, temp, dtcJson)
                val oilHealth = calculateOilHealth(rpm, temp)
                val tiresHealth = calculateTiresHealth(speed)
                val brakesHealth = calculateBrakesHealth(speed)
                
                // Обновляем UI
                _rpmValue.value = rpm
                _speedValue.value = speed
                _engineTempValue.value = temp
                _dtcCodesValue.value = dtcJson
                _o2VoltageValue.value = o2
                _fuelLevelValue.value = fuel
                _intakeTempValue.value = intake
                _mafSensorValue.value = maf
                _throttlePosValue.value = throttle
                _engineHealthValue.value = engineHealth
                _oilHealthValue.value = oilHealth
                _tiresHealthValue.value = tiresHealth
                _brakesHealthValue.value = brakesHealth
                
                _collectingStatus.value = "Статус: Данные с эмулятора ELM327 (${System.currentTimeMillis()})"
            } else {
                // Если не удалось подключиться к эмулятору, генерируем случайные данные
                fallbackToRandomData()
            }
        } catch (e: Exception) {
            Log.e("ELM327", "Error in generateTestData with emulator: ${e.message}", e)
            // В случае ошибки тоже используем случайные данные
            fallbackToRandomData()
        } finally {
            // Закрываем соединение с эмулятором
            emulator.disconnect()
        }
    }
    
    // Метод для генерации случайных данных (когда эмулятор недоступен)
    private fun fallbackToRandomData() {
        try {
            // Генерация случайных значений для тестовых данных
            val speed = (20..120).random()
            val rpm = (800..4000).random()
            val temp = (75..105).random()
            val fuel = (10..100).random()
            val throttle = (0..100).random()
            val load = (0..100).random()
            val voltage = 11.5 + (Math.random() * 2.5)

            // Случайное генерирование кодов ошибок (примерно в 30% случаев)
            val dtcCodes: List<String>
            if (Math.random() < 0.3) {
                val possibleDtcCodes = listOf(
                    "P0100", // Неисправность в цепи расходомера воздуха
                    "P0131", // Низкий уровень сигнала в цепи датчика кислорода
                    "P0300", // Обнаружены пропуски зажигания
                    "P0401", // Недостаточный поток рециркуляции выхлопных газов
                    "P0420", // Эффективность системы катализатора ниже порога
                    "P0500", // Датчик скорости автомобиля неисправен
                    "P0700", // Неисправность в системе управления трансмиссией
                )
                
                // Выбираем от 1 до 3 случайных кода ошибок
                dtcCodes = possibleDtcCodes.shuffled().take((1..3).random())
            } else {
                dtcCodes = emptyList()
            }
            
            val dtcJson = if (dtcCodes.isEmpty()) "[]" else JSONArray(dtcCodes).toString()

            // Рассчитываем здоровье двигателя на основе наличия ошибок
            val engineHealth = if (dtcCodes.isEmpty()) {
                90 + (0..10).random() // Если нет ошибок, здоровье от 90% до 100%
            } else {
                50 + (0..40).random() // Если есть ошибки, здоровье от 50% до 90%
            }
            
            val oilHealth = calculateOilHealth(rpm, temp)
            val tiresHealth = calculateTiresHealth(speed)
            val brakesHealth = calculateBrakesHealth(speed)

            // Симулируем данные датчиков
            val o2 = simulateO2Voltage(rpm, temp)
            val fuelPressure = simulateFuelPressure(rpm)
            val intakeTemp = simulateIntakeTemperature(temp)
            val maf = simulateMAF(rpm)

            // Обновляем UI на главном потоке
            _rpmValue.value = rpm
            _speedValue.value = speed
            _engineTempValue.value = temp
            _dtcCodesValue.value = dtcJson
            _o2VoltageValue.value = o2
            _fuelLevelValue.value = fuelPressure
            _intakeTempValue.value = intakeTemp
            _mafSensorValue.value = maf
            _throttlePosValue.value = throttle
            _engineHealthValue.value = engineHealth
            _oilHealthValue.value = oilHealth
            _tiresHealthValue.value = tiresHealth
            _brakesHealthValue.value = brakesHealth
            
            _collectingStatus.value = "Статус: Эмуляция (эмулятор недоступен) (${System.currentTimeMillis()})"
        } catch (e: Exception) {
            Log.e("Error", "Error generating fallback data: ${e.message}", e)
            _collectingStatus.value = "Статус: Ошибка эмуляции - ${e.message}"
        }
    }
    
    fun startSimulation() {
        simulationJob?.cancel()
        
        simulationJob = viewModelScope.launch {
            while (isActive) {
                // Если нет активного сбора данных, слегка меняем существующие значения
                if (dataCollectionJob == null || !dataCollectionJob!!.isActive) {
                    // Обновляем только если у нас есть какие-то данные (не нулевые)
                    if (_rpmValue.value > 0) {
                        // Немного изменяем значения датчиков для имитации реального поведения
                        _o2VoltageValue.value = simulateO2Voltage(_rpmValue.value, _engineTempValue.value)
                        _fuelLevelValue.value = simulateFuelPressure(_rpmValue.value)
                        _intakeTempValue.value = simulateIntakeTemperature(_engineTempValue.value)
                        _mafSensorValue.value = simulateMAF(_rpmValue.value)
                        _throttlePosValue.value = simulateThrottle(_rpmValue.value)
                    }
                }
                // Обновляем раз в 2 секунды
                delay(2000)
            }
        }
    }
    
    fun stopSimulation() {
        simulationJob?.cancel()
        simulationJob = null
    }
    
    // Функции для симуляции данных датчиков
    private fun simulateO2Voltage(rpm: Int, temp: Int): Double {
        // Кислородный датчик должен быть около 0.45V в нормальном состоянии
        // и колебаться в зависимости от нагрузки двигателя
        val base = 0.45
        val rpmFactor = (rpm / 1000.0) * 0.05
        val tempFactor = (temp - 80) * 0.002
        val randomFactor = (Math.random() - 0.5) * 0.15 // Случайная вариация ±0.075V
        
        return formatDecimal((base + rpmFactor + tempFactor + randomFactor).coerceIn(0.1, 0.9), 2)
    }
    
    private fun simulateFuelPressure(rpm: Int): Double {
        // Давление топлива обычно от 40 до 60 кПа на холостом ходу,
        // и увеличивается с ростом оборотов
        val basePressure = 45.0
        val rpmFactor = (rpm / 1000.0) * 5.0
        val randomFactor = (Math.random() - 0.5) * 3.0 // Случайная вариация ±1.5 кПа
        
        return formatDecimal((basePressure + rpmFactor + randomFactor).coerceIn(35.0, 80.0), 1)
    }
    
    private fun simulateIntakeTemperature(engineTemp: Int): Int {
        // Температура впускного коллектора обычно ниже температуры двигателя
        // и зависит от температуры окружающей среды
        val tempDiff = 15 + (Math.random() * 10).toInt() // Разница 15-25 градусов
        return (engineTemp - tempDiff).coerceIn(5, 50)
    }
    
    private fun simulateMAF(rpm: Int): Double {
        // Датчик массового расхода воздуха (MAF) зависит от оборотов
        val base = 3.0
        val rpmFactor = (rpm / 1000.0) * 2.0
        val randomFactor = (Math.random() - 0.5) * 1.0
        
        return formatDecimal((base + rpmFactor + randomFactor).coerceIn(0.5, 15.0), 2)
    }
    
    private fun simulateThrottle(rpm: Int): Int {
        // Положение дроссельной заслонки зависит от оборотов
        val idleThrottle = 15 // На холостом ходу около 15%
        val rpmFactor = ((rpm - 800) / 5000.0 * 40).toInt() // При высоких оборотах до 55%
        val randomFactor = (Math.random() * 5).toInt() // Случайная вариация ±5%
        
        return (idleThrottle + rpmFactor + randomFactor).coerceIn(10, 100)
    }
    
    private fun calculateEngineHealth(rpm: Int?, temp: Int?, dtcCodes: String): Int {
        var health = 100
        
        // Штраф за высокие обороты
        if (rpm != null && rpm > 5000) {
            health -= 10
        }
        
        // Штраф за высокую температуру
        if (temp != null && temp > 105) {
            health -= 15
        }
        
        // Штраф за наличие ошибок
        if (dtcCodes != "[]") {
            health -= 25
        }
        
        return health.coerceIn(0, 100)
    }
    
    private fun calculateOilHealth(rpm: Int?, temp: Int?): Int {
        var health = 100
        
        // Снижение здоровья масла на основе температуры двигателя
        if (temp != null) {
            when {
                temp > 110 -> health -= 20
                temp > 100 -> health -= 10
                temp > 90 -> health -= 5
            }
        }
        
        // Снижение здоровья масла на основе высоких оборотов
        if (rpm != null && rpm > 4500) {
            health -= 10
        }
        
        return health.coerceIn(0, 100)
    }
    
    private fun calculateTiresHealth(speed: Int?): Int {
        var health = 100
        
        // Снижение здоровья шин на основе скорости
        if (speed != null) {
            when {
                speed > 120 -> health -= 15
                speed > 100 -> health -= 10
                speed > 80 -> health -= 5
            }
        }
        
        return health.coerceIn(0, 100)
    }
    
    private fun calculateBrakesHealth(speed: Int?): Int {
        var health = 100
        
        // Снижение здоровья тормозов на основе скорости
        if (speed != null) {
            when {
                speed > 120 -> health -= 20
                speed > 100 -> health -= 15
                speed > 80 -> health -= 10
            }
        }
        
        return health.coerceIn(0, 100)
    }
    
    // Вспомогательная функция для форматирования десятичных чисел
    private fun formatDecimal(value: Double, decimalPlaces: Int): Double {
        val factor = Math.pow(10.0, decimalPlaces.toDouble())
        return Math.round(value * factor) / factor
    }
}

class MainActivity : ComponentActivity() {
    private lateinit var viewModel: OdometerViewModel
    
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        // Инициализируем ViewModel
        viewModel = ViewModelProvider(this).get(OdometerViewModel::class.java)

        // Проверяем наличие токена
        val token = getSharedPreferences("prefs", Context.MODE_PRIVATE).getString("jwt_token", null)
        if (token == null) {
            // Если токена нет, перенаправляем на экран логина
            startActivity(Intent(this, LoginActivity::class.java))
            finish()
            return
        }

        // Запускаем симуляцию изменений данных даже без подключения к OBD
        viewModel.startSimulation()

        setContent {
            OdometerApp(viewModel, this)
        }
    }
    
    override fun onDestroy() {
        super.onDestroy()
        viewModel.stopDataCollection()
        viewModel.stopSimulation()
    }
    
    fun startDataCollection() {
        viewModel.startDataCollection(this)
    }
    
    fun stopDataCollection() {
        viewModel.stopDataCollection()
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun OdometerApp(viewModel: OdometerViewModel, mainActivity: MainActivity) {
    // Используем collectAsState для подписки на StateFlow
    val connectionStatus by viewModel.collectingStatus.collectAsState()
    val isCollecting by viewModel.isCollectingData.collectAsState()
    val rpmValue by viewModel.rpmValue.collectAsState()
    val speedValue by viewModel.speedValue.collectAsState()
    val engineTempValue by viewModel.engineTempValue.collectAsState()
    val dtcCodesValue by viewModel.dtcCodesValue.collectAsState()
    val o2VoltageValue by viewModel.o2VoltageValue.collectAsState()
    val fuelPressureValue by viewModel.fuelLevelValue.collectAsState()
    val intakeTempValue by viewModel.intakeTempValue.collectAsState()
    val mafSensorValue by viewModel.mafSensorValue.collectAsState()
    val throttlePosValue by viewModel.throttlePosValue.collectAsState()
    val engineHealthValue by viewModel.engineHealthValue.collectAsState()
    val oilHealthValue by viewModel.oilHealthValue.collectAsState()
    val tiresHealthValue by viewModel.tiresHealthValue.collectAsState()
    val brakesHealthValue by viewModel.brakesHealthValue.collectAsState()
    
    val context = LocalContext.current

    MaterialTheme {
        Surface(
            modifier = Modifier.fillMaxSize(),
            color = MaterialTheme.colorScheme.background
        ) {
    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(16.dp),
        horizontalAlignment = Alignment.CenterHorizontally
    ) {
                Text(
                    text = "Мониторинг автомобиля",
                    style = MaterialTheme.typography.headlineMedium,
                    modifier = Modifier.padding(bottom = 16.dp)
                )
                
        Button(
            onClick = {
                        if (isCollecting) {
                            mainActivity.stopDataCollection()
                        } else {
                            mainActivity.startDataCollection()
                        }
                    },
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(horizontal = 8.dp),
                    colors = ButtonDefaults.buttonColors(
                        containerColor = if (isCollecting) MaterialTheme.colorScheme.error else MaterialTheme.colorScheme.primary
                    )
                ) {
                    Text(if (isCollecting) "Остановить сбор данных" else "Начать сбор данных")
                }

                Spacer(modifier = Modifier.height(8.dp))

                Button(
                    onClick = {
                        val intent = Intent(context, BluetoothSelection::class.java)
                        // Добавляем токен в Intent для обеспечения непрерывности авторизации
                        val token = context.getSharedPreferences("prefs", Context.MODE_PRIVATE).getString("jwt_token", null)
                        if (token != null) {
                            intent.putExtra("token", token)
                        }
                        context.startActivity(intent)
                    },
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(horizontal = 8.dp)
                ) {
                    Text("Выбрать Bluetooth устройство")
                }
                
                Spacer(modifier = Modifier.height(8.dp))
                
                Button(
                    onClick = {
                        val sharedPreferences = context.getSharedPreferences("sensor_prefs", Context.MODE_PRIVATE)
                        val vehicleId = sharedPreferences.getString("vehicle_id", null)
                        
                        val intent = Intent(context, RecommendationsActivity::class.java)
                        intent.putExtra("VEHICLE_ID", vehicleId ?: "DEFAULT_VIN")
                        context.startActivity(intent)
                    },
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(horizontal = 8.dp),
                    colors = ButtonDefaults.buttonColors(
                        containerColor = MaterialTheme.colorScheme.primary
                    )
                ) {
                    Text("Рекомендации по обслуживанию")
                }

                Spacer(modifier = Modifier.height(16.dp))

        Text(
            text = connectionStatus,
            style = MaterialTheme.typography.bodyLarge,
                    modifier = Modifier.padding(bottom = 16.dp)
                )

                // Прокручиваемый контент с карточками
                LazyColumn(
                    modifier = Modifier.fillMaxWidth(),
                    verticalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    // Карточка скорости и оборотов
                    item {
                        ElevatedCard(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(4.dp)
                        ) {
                            Column(
                                modifier = Modifier.padding(16.dp)
                            ) {
                                Text(
                                    text = "Основные показатели",
                                    style = MaterialTheme.typography.titleMedium,
                                    modifier = Modifier.padding(bottom = 8.dp)
                                )
                                
                                Row(
                                    modifier = Modifier.fillMaxWidth(),
                                    horizontalArrangement = Arrangement.SpaceBetween
                                ) {
                                    Column {
        Text(
                                            text = "Скорость",
                                            style = MaterialTheme.typography.bodyMedium
        )
                                        AnimatedSensorValue(speedValue, "км/ч")
                                    }
                                    
                                    Column {
        Text(
                                            text = "Обороты",
                                            style = MaterialTheme.typography.bodyMedium
        )
                                        AnimatedSensorValue(rpmValue, "об/мин")
                                    }
                                }
                            }
                        }
                    }
                    
                    // Карточка с показателями здоровья компонентов
                    item {
                        ElevatedCard(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(4.dp)
                        ) {
                            Column(
                                modifier = Modifier.padding(16.dp)
                            ) {
                                Row(
                                    modifier = Modifier
                                        .fillMaxWidth()
                                        .padding(bottom = 8.dp),
                                    verticalAlignment = Alignment.CenterVertically
                            ) {
        Text(
                                        text = "Состояние компонентов",
                                        style = MaterialTheme.typography.titleMedium
                                    )
                                }
                                
                                Spacer(modifier = Modifier.height(4.dp))
                                
                                // Двигатель
                                HealthIndicator(
                                    label = "Двигатель",
                                    value = engineHealthValue
                                )
                                
                                Spacer(modifier = Modifier.height(8.dp))
                                
                                // Масло
                                HealthIndicator(
                                    label = "Масло",
                                    value = oilHealthValue
                                )
                                
                                Spacer(modifier = Modifier.height(8.dp))
                                
                                // Шины
                                HealthIndicator(
                                    label = "Шины",
                                    value = tiresHealthValue
                                )
                                
                                Spacer(modifier = Modifier.height(8.dp))
                                
                                // Тормоза
                                HealthIndicator(
                                    label = "Тормоза",
                                    value = brakesHealthValue
                                )
                            }
                        }
                    }
                    
                    // Карточка с температурой
                    item {
                        ElevatedCard(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(4.dp)
                        ) {
                            Column(
                                modifier = Modifier.padding(16.dp)
                            ) {
        Text(
                                    text = "Температура",
                                    style = MaterialTheme.typography.titleMedium,
                                    modifier = Modifier.padding(bottom = 8.dp)
                                )
                                
                                Row(
                                    modifier = Modifier.fillMaxWidth(),
                                    horizontalArrangement = Arrangement.SpaceBetween
                                ) {
                                    Column {
        Text(
                                            text = "Двигатель",
                                            style = MaterialTheme.typography.bodyMedium
        )
                                        AnimatedSensorValue(engineTempValue, "°C")
                                    }
                                    
                                    Column {
                                        Text(
                                            text = "Впускной коллектор",
                                            style = MaterialTheme.typography.bodyMedium
                                        )
                                        AnimatedSensorValue(intakeTempValue, "°C")
                                    }
                                }
                            }
                        }
                    }
                    
                    // Карточка с давлением и положением
                    item {
                        ElevatedCard(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(4.dp)
                        ) {
                            Column(
                                modifier = Modifier.padding(16.dp)
                            ) {
                                Text(
                                    text = "Давление и положение",
                                    style = MaterialTheme.typography.titleMedium,
                                    modifier = Modifier.padding(bottom = 8.dp)
                                )
                                
                                Row(
                                    modifier = Modifier.fillMaxWidth(),
                                    horizontalArrangement = Arrangement.SpaceBetween
                                ) {
                                    Column {
        Text(
                                            text = "Давление топлива",
                                            style = MaterialTheme.typography.bodyMedium
                                        )
                                        AnimatedSensorValueDouble(fuelPressureValue, "кПа")
                                    }
                                    
                                    Column {
                                        Text(
                                            text = "Положение дросселя",
                                            style = MaterialTheme.typography.bodyMedium
                                        )
                                        AnimatedSensorValue(throttlePosValue, "%")
                                    }
                                }
                            }
                        }
                    }
                    
                    // Карточка с датчиками воздуха
                    item {
                        ElevatedCard(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(4.dp)
                        ) {
                            Column(
                                modifier = Modifier.padding(16.dp)
                            ) {
                                Text(
                                    text = "Датчики воздуха",
                                    style = MaterialTheme.typography.titleMedium,
                                    modifier = Modifier.padding(bottom = 8.dp)
                                )
                                
                                Row(
                                    modifier = Modifier.fillMaxWidth(),
                                    horizontalArrangement = Arrangement.SpaceBetween
                                ) {
                                    Column {
                                        Text(
                                            text = "O₂ датчик",
                                            style = MaterialTheme.typography.bodyMedium
                                        )
                                        AnimatedSensorValueDouble(o2VoltageValue, "В")
                                    }
                                    
                                    Column {
                                        Text(
                                            text = "MAF сенсор",
                                            style = MaterialTheme.typography.bodyMedium
                                        )
                                        AnimatedSensorValueDouble(mafSensorValue, "г/с")
                                    }
                                }
                            }
                        }
                    }

                    // Все датчики в табличном виде
                    item {
                            ElevatedCard(
                                modifier = Modifier
                                    .fillMaxWidth()
                                .padding(4.dp)
                            ) {
                                Column(
                                    modifier = Modifier.padding(16.dp)
                                ) {
                                    Text(
                                    text = "Все показания датчиков",
                                        style = MaterialTheme.typography.titleMedium,
                                        modifier = Modifier.padding(bottom = 8.dp)
                                    )
                                    
                                // Основные датчики
                                SensorValueRow("Обороты двигателя", "$rpmValue об/мин")
                                SensorValueRow("Скорость", "$speedValue км/ч")
                                SensorValueRow("Температура двигателя", "$engineTempValue°C")
                                SensorValueRow("Температура впуск. кол.", "$intakeTempValue°C")
                                SensorValueRow("O₂ датчик", "$o2VoltageValue В")
                                SensorValueRow("Давление топлива", "$fuelPressureValue кПа")
                                SensorValueRow("MAF сенсор", "$mafSensorValue г/с")
                                SensorValueRow("Положение дросселя", "$throttlePosValue%")
                                
                                

                            }
                        }
                    }
                    
                    // Коды ошибок
                    item {
                        DtcCodesCard(dtcCodesValue)
                    }
                }
            }
        }
    }
}

@Composable
fun HealthIndicator(label: String, value: Int) {
    val stateColor = when {
        value < 50 -> MaterialTheme.colorScheme.error
        value < 70 -> MaterialTheme.colorScheme.error.copy(alpha = 0.7f)
        value < 90 -> MaterialTheme.colorScheme.primary.copy(alpha = 0.7f)
        else -> MaterialTheme.colorScheme.primary
    }
    
    val description = when {
        value >= 90 -> "Состояние хорошее"
        value >= 70 -> "Требует внимания"
        else -> "Требуется обслуживание"
    }
    
    val animatedProgress = animateFloatAsState(
        targetValue = value / 100f,
        animationSpec = tween(1000, easing = FastOutSlowInEasing),
        label = "progressAnimation"
    )
    
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .padding(vertical = 4.dp)
    ) {
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Text(
                text = label,
                style = MaterialTheme.typography.bodyMedium
            )
            Text(
                text = "$value%",
                style = MaterialTheme.typography.bodyMedium,
                color = stateColor,
                fontWeight = FontWeight.Bold
            )
        }
        
        Spacer(modifier = Modifier.height(4.dp))
        
        LinearProgressIndicator(
            progress = animatedProgress.value,
            modifier = Modifier
                .fillMaxWidth()
                .height(8.dp)
                .clip(RoundedCornerShape(4.dp)),
            color = stateColor,
            trackColor = MaterialTheme.colorScheme.surfaceVariant
        )
        
        Spacer(modifier = Modifier.height(2.dp))
        
        Text(
            text = description,
            style = MaterialTheme.typography.bodySmall,
            color = MaterialTheme.colorScheme.onSurfaceVariant
        )
    }
}

@Composable
fun SensorValueRow(label: String, value: String) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .padding(vertical = 6.dp),
        horizontalArrangement = Arrangement.SpaceBetween,
        verticalAlignment = Alignment.CenterVertically
    ) {
        Text(
            text = label,
            style = MaterialTheme.typography.bodyMedium,
            color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.8f)
        )
        Text(
            text = value,
            style = MaterialTheme.typography.bodyMedium,
            fontWeight = FontWeight.Bold,
            color = MaterialTheme.colorScheme.primary
        )
    }
    Divider(
        modifier = Modifier.padding(vertical = 2.dp),
        thickness = 1.dp,
        color = MaterialTheme.colorScheme.surfaceVariant
    )
}

@Composable
fun AnimatedSensorValue(value: Int, units: String, style: TextStyle = MaterialTheme.typography.titleLarge) {
    val animatedValue = animateIntAsState(
        targetValue = value,
        animationSpec = tween(durationMillis = 1000, easing = FastOutSlowInEasing),
        label = "valueAnimation"
    )
    Text(
        text = "${animatedValue.value} $units",
        style = style,
        color = MaterialTheme.colorScheme.primary
    )
}

@Composable
fun AnimatedSensorValueDouble(value: Double, units: String, style: TextStyle = MaterialTheme.typography.titleLarge) {
    val animatedValue = animateFloatAsState(
        targetValue = value.toFloat(),
        animationSpec = tween(durationMillis = 1000, easing = FastOutSlowInEasing),
        label = "valueAnimation"
    )
    Text(
        text = "${animatedValue.value} $units",
        style = style,
        color = MaterialTheme.colorScheme.primary
    )
}

private suspend fun connectToElm327(ip: String, port: Int): Socket? {
    return try {
        Log.d("ELM327", "Connecting to ELM327 emulator at $ip:$port")
        val socket = Socket()
        socket.connect(InetSocketAddress(ip, port), 5000)
        Log.d("ELM327", "Connected to socket successfully")
        
        // Даем эмулятору время инициализироваться
        delay(500)
        
        // Настраиваем адаптер
        configureAdapter(socket)
        
        // Проверяем подключение
        val testResponse = sendCommand(socket, "0100")
        if (testResponse.contains("NO DATA") || testResponse.contains("ERROR")) {
            Log.e("ELM327", "Failed to connect to emulator: $testResponse")
            socket.close()
            return null
        }
        
        Log.d("ELM327", "ELM327 emulator connected and configured successfully")
        socket
    } catch (e: Exception) {
        Log.e("ELM327", "Connection error: ${e.localizedMessage}")
        null
    }
}

private suspend fun configureAdapter(socket: Socket) {
    try {
        // Сброс адаптера
        val atzResponse = sendCommand(socket, "ATZ")
        Log.d("ELM327", "ATZ Response: $atzResponse")
        
        // Отключение эха
        val ateResponse = sendCommand(socket, "ATE0")
        Log.d("ELM327", "ATE0 Response: $ateResponse")
        
        // Включение заголовков
        val athResponse = sendCommand(socket, "ATH1")
        Log.d("ELM327", "ATH1 Response: $athResponse")
        
        // Автоматический выбор протокола
        val atspResponse = sendCommand(socket, "ATSP0")
        Log.d("ELM327", "ATSP0 Response: $atspResponse")
        
        // Проверка версии
        val versionResponse = sendCommand(socket, "ATI")
        Log.d("ELM327", "Version: $versionResponse")
        
        // Проверка подключения к автомобилю
        val protocolResponse = sendCommand(socket, "0100")
        Log.d("ELM327", "Protocol Check: $protocolResponse")
        
        // Проверка поддержки PIDs
        val supportedPids = sendCommand(socket, "0100")
        Log.d("ELM327", "Supported PIDs: $supportedPids")
        
        // Проверка режима работы
        val modeResponse = sendCommand(socket, "0101")
        Log.d("ELM327", "Mode Check: $modeResponse")
    } catch (e: Exception) {
        Log.e("ELM327", "Configuration error: ${e.localizedMessage}")
        throw e
    }
}

private suspend fun sendCommand(socket: Socket, command: String): String {
    val outputStream = socket.getOutputStream()
    val inputStream = socket.getInputStream()

    try {
        // Отправляем команду
    outputStream.write("$command\r\n".toByteArray())
    outputStream.flush()

        // Читаем ответ
        val response = readResponse(inputStream)
        
        // Логируем команду и ответ
        Log.d("ELM327", "Command: $command, Response: $response")
        
        return response
    } catch (e: Exception) {
        Log.e("ELM327", "Error sending command $command: ${e.localizedMessage}")
        throw e
    }
}

private suspend fun readResponse(inputStream: InputStream): String {
    val buffer = ByteArray(1024)
    val response = StringBuilder()
    var bytesRead: Int
    var timeout = 0
    val maxTimeout = 10 // Максимальное количество попыток чтения

    do {
        bytesRead = inputStream.read(buffer)
        if (bytesRead > 0) {
            response.append(String(buffer, 0, bytesRead))
        }
        timeout++
        
        // Добавляем небольшую задержку для эмулятора
        Thread.sleep(100)
        
    } while (!response.contains(">") && timeout < maxTimeout)

    if (timeout >= maxTimeout) {
        Log.w("ELM327", "Response timeout")
    }

    return response.toString().trim()
}

private suspend fun readDistanceData(
    socket: Socket,
    context: Context,
    updateStatus: (String) -> Unit,
    updateDistance: (Int) -> Unit,
    updateRPM: (Int) -> Unit,
    updateSpeed: (Int) -> Unit,
    updateEngineTemp: (Int) -> Unit,
    updateDTC: (String) -> Unit,
    updateO2Voltage: (Double) -> Unit,
    updateFuelPressure: (Double) -> Unit,
    updateIntakeTemp: (Int) -> Unit,
    updateMAF: (Double) -> Unit,
    updateThrottle: (Int) -> Unit
) {
    try {
        updateStatus("Статус: Получение данных...")
        
        // Проверяем подключение к автомобилю
        val protocolCheck = sendCommand(socket, "0100")
        Log.d("ELM327", "Protocol Check Response: $protocolCheck")
        
        if (!protocolCheck.contains("41 00")) {
            updateStatus("Ошибка: Нет ответа от автомобиля")
            return
        }
        
        // Получаем данные с задержкой между запросами
        val rpmResponse = sendCommand(socket, "010C")
        Log.d("ELM327", "RPM Raw Response: $rpmResponse")
        Thread.sleep(100)
        
        val speedResponse = sendCommand(socket, "010D")
        Log.d("ELM327", "Speed Raw Response: $speedResponse")
        Thread.sleep(100)
        
        val tempResponse = sendCommand(socket, "0105")
        Log.d("ELM327", "Temperature Raw Response: $tempResponse")
        Thread.sleep(100)
        
        val dtcResponse = sendCommand(socket, "03")
        Log.d("ELM327", "DTC Raw Response: $dtcResponse")
        Thread.sleep(100)
        
        val o2Response = sendCommand(socket, "0114")
        Log.d("ELM327", "O2 Raw Response: $o2Response")
        Thread.sleep(100)
        
        val fuelResponse = sendCommand(socket, "010A")
        Log.d("ELM327", "Fuel Raw Response: $fuelResponse")
        Thread.sleep(100)
        
        val intakeResponse = sendCommand(socket, "010F")
        Log.d("ELM327", "Intake Raw Response: $intakeResponse")
        Thread.sleep(100)
        
        val mafResponse = sendCommand(socket, "0110")
        Log.d("ELM327", "MAF Raw Response: $mafResponse")
        Thread.sleep(100)
        
        val throttleResponse = sendCommand(socket, "0111")
        Log.d("ELM327", "Throttle Raw Response: $throttleResponse")
        Thread.sleep(100)

        // Парсим и обновляем значения
        val rpm = parseRPM(rpmResponse)
        val speed = parseSpeed(speedResponse)
        val temp = parseTemperature(tempResponse)
        val dtc = parseDTC(dtcResponse)
        val o2 = parseO2Voltage(o2Response)
        val fuel = parseFuelPressure(fuelResponse)
        val intake = parseTemperature(intakeResponse)
        val maf = parseMAF(mafResponse)
        val throttle = parseThrottle(throttleResponse)

        // Логируем распарсенные значения
        Log.d("Parsed", "RPM: $rpm, Speed: $speed, Temp: $temp, DTC: $dtc")
        Log.d("Parsed", "O2: $o2, Fuel: $fuel, Intake: $intake, MAF: $maf, Throttle: $throttle")

        // Обновляем UI
        rpm?.let { updateRPM(it) }
        speed?.let { updateSpeed(it) }
        temp?.let { updateEngineTemp(it) }
        dtc.let { updateDTC(it) }
        o2?.let { updateO2Voltage(it) }
        fuel?.let { updateFuelPressure(it) }
        intake?.let { updateIntakeTemp(it) }
        maf?.let { updateMAF(it) }
        throttle?.let { updateThrottle(it) }

        // Отправляем данные на сервер
        val telemetryData = JSONObject()
        telemetryData.put("rpm", rpm ?: 0)
        telemetryData.put("speed", speed ?: 0)
        telemetryData.put("engineTemp", temp ?: 0)
        telemetryData.put("dtcCodes", dtc)
        telemetryData.put("o2Voltage", o2 ?: 0.0)
        telemetryData.put("fuelPressure", fuel ?: 0.0)
        telemetryData.put("intakeTemp", intake ?: 0)
        telemetryData.put("mafSensor", maf ?: 0.0)
        telemetryData.put("throttlePos", throttle ?: 0)

        Log.d("API", "Sending data: ${telemetryData.toString()}")
        sendToBackend(context, telemetryData)
        updateStatus("Статус: Данные отправлены")
    } catch (e: Exception) {
        Log.e("Error", "Error in readDistanceData: ${e.localizedMessage}")
        updateStatus("Ошибка: ${e.localizedMessage ?: "Неизвестная ошибка"}")
    }
}

private fun parseRPM(response: String): Int? {
    val cleanResponse = response.replace(" ", "").replace(">", "")
    Log.d("RPM", "Cleaned response: $cleanResponse")
    
    if (!cleanResponse.contains("410C")) {
        Log.d("RPM", "Invalid response format")
        return null
    }
    if (cleanResponse.length < 8) {
        Log.d("RPM", "Response too short")
        return null
    }
    
    try {
        val startIndex = cleanResponse.indexOf("410C") + 4
        val high = cleanResponse.substring(startIndex, startIndex + 2).toInt(16)
        val low = cleanResponse.substring(startIndex + 2, startIndex + 4).toInt(16)
        val rpm = ((high * 256 + low) / 4)
        Log.d("RPM", "Calculated RPM: $rpm")
        return rpm
    } catch (e: Exception) {
        Log.e("RPM", "Error parsing RPM: ${e.localizedMessage}")
        return null
    }
}

private fun parseSpeed(response: String): Int? {
    val cleanResponse = response.replace(" ", "").replace(">", "")
    Log.d("Speed", "Cleaned response: $cleanResponse")
    
    if (!cleanResponse.contains("410D")) {
        Log.d("Speed", "Invalid response format")
        return null
    }
    if (cleanResponse.length < 6) {
        Log.d("Speed", "Response too short")
        return null
    }
    
    try {
        val startIndex = cleanResponse.indexOf("410D") + 4
        val speed = cleanResponse.substring(startIndex, startIndex + 2).toInt(16)
        Log.d("Speed", "Calculated speed: $speed")
        return speed
    } catch (e: Exception) {
        Log.e("Speed", "Error parsing speed: ${e.localizedMessage}")
        return null
    }
}

private fun parseTemperature(response: String): Int? {
    val cleanResponse = response.replace(" ", "").replace(">", "")
    Log.d("Temp", "Cleaned response: $cleanResponse")
    
    if (!cleanResponse.contains("4105")) {
        Log.d("Temp", "Invalid response format")
        return null
    }
    if (cleanResponse.length < 6) {
        Log.d("Temp", "Response too short")
        return null
    }
    
    try {
        val startIndex = cleanResponse.indexOf("4105") + 4
        val temp = cleanResponse.substring(startIndex, startIndex + 2).toInt(16) - 40
        Log.d("Temp", "Calculated temperature: $temp")
        return temp
    } catch (e: Exception) {
        Log.e("Temp", "Error parsing temperature: ${e.localizedMessage}")
        return null
    }
}

private fun parseDTC(response: String): String {
    val cleanResponse = response.replace(" ", "").replace(">", "").trim()
    Log.d("DTC", "Cleaned DTC response: $cleanResponse")
    
    if (cleanResponse.isEmpty() || (!cleanResponse.contains("43") && !cleanResponse.contains("NODATA"))) {
        Log.d("DTC", "Invalid response format: $cleanResponse")
        return "[]"
    }
    
    if (cleanResponse.contains("NODATA") || cleanResponse.contains("SEARCHING") || cleanResponse == "43") {
        Log.d("DTC", "No DTC codes found")
        return "[]"
    }
    
    try {
        val dtcCodes = mutableListOf<String>()
        
        // Находим позицию "43" в ответе
        val startIndex = cleanResponse.indexOf("43")
        if (startIndex < 0) {
            Log.d("DTC", "No '43' prefix found in response")
            return "[]"
        }
        
        // Игнорируем префикс "43" и обрабатываем оставшуюся часть ответа
        var index = startIndex + 2
        
        // Обрабатываем оставшуюся часть ответа как последовательность кодов ошибок
        while (index + 4 <= cleanResponse.length) {
            val code = cleanResponse.substring(index, index + 4)
            
            // Проверяем, является ли код допустимым шестнадцатеричным значением
            if (code.all { it.isDigit() || it in 'A'..'F' || it in 'a'..'f' }) {
                // Преобразуем код в формат P-коды (P0xxx, P1xxx и т.д.)
                val firstDigit = code[0]
                val type = when (firstDigit) {
                    '0' -> "P0"
                    '1' -> "P1"
                    '2' -> "P2"
                    '3' -> "P3"
                    '4' -> "C0"
                    '5' -> "C1"
                    '6' -> "C2"
                    '7' -> "C3"
                    '8' -> "B0"
                    '9' -> "B1"
                    'A', 'a' -> "B2"
                    'B', 'b' -> "B3"
                    'C', 'c' -> "U0"
                    'D', 'd' -> "U1"
                    'E', 'e' -> "U2"
                    'F', 'f' -> "U3"
                    else -> "P0"
                }
                
                // Добавляем правильно отформатированный DTC код
                val formattedCode = type + code.substring(1)
                dtcCodes.add(formattedCode)
            } else {
                Log.d("DTC", "Invalid DTC code found: $code")
            }
            
            index += 4
        }
        
        Log.d("DTC", "Found DTC codes: $dtcCodes")
        return if (dtcCodes.isEmpty()) "[]" else JSONArray(dtcCodes).toString()
    } catch (e: Exception) {
        Log.e("DTC", "Error parsing DTC: ${e.localizedMessage}", e)
        return "[]"
    }
}

private fun parseO2Voltage(response: String): Double? {
    val cleanResponse = response.replace(" ", "").replace(">", "")
    Log.d("O2", "Cleaned response: $cleanResponse")
    
    if (!cleanResponse.contains("4114")) {
        Log.d("O2", "Invalid response format")
        return null
    }
    if (cleanResponse.length < 6) {
        Log.d("O2", "Response too short")
        return null
    }
    
    try {
        val startIndex = cleanResponse.indexOf("4114") + 4
        val voltage = cleanResponse.substring(startIndex, startIndex + 2).toInt(16) / 200.0
        Log.d("O2", "Calculated voltage: $voltage")
        return voltage
    } catch (e: Exception) {
        Log.e("O2", "Error parsing O2 voltage: ${e.localizedMessage}")
        return null
    }
}

private fun parseFuelPressure(response: String): Double? {
    val cleanResponse = response.replace(" ", "").replace(">", "")
    Log.d("Fuel", "Cleaned response: $cleanResponse")
    
    if (!cleanResponse.contains("410A")) {
        Log.d("Fuel", "Invalid response format")
        return null
    }
    if (cleanResponse.length < 6) {
        Log.d("Fuel", "Response too short")
        return null
    }
    
    try {
        val startIndex = cleanResponse.indexOf("410A") + 4
        val pressure = cleanResponse.substring(startIndex, startIndex + 2).toInt(16) * 3.0
        Log.d("Fuel", "Calculated pressure: $pressure")
        return pressure
    } catch (e: Exception) {
        Log.e("Fuel", "Error parsing fuel pressure: ${e.localizedMessage}")
        return null
    }
}

private fun parseMAF(response: String): Double? {
    val cleanResponse = response.replace(" ", "").replace(">", "")
    Log.d("MAF", "Cleaned response: $cleanResponse")
    
    if (!cleanResponse.contains("4110")) {
        Log.d("MAF", "Invalid response format")
        return null
    }
    if (cleanResponse.length < 8) {
        Log.d("MAF", "Response too short")
        return null
    }
    
    try {
        val startIndex = cleanResponse.indexOf("4110") + 4
        val high = cleanResponse.substring(startIndex, startIndex + 2).toInt(16)
        val low = cleanResponse.substring(startIndex + 2, startIndex + 4).toInt(16)
        val maf = (high * 256 + low) / 100.0
        Log.d("MAF", "Calculated MAF: $maf")
        return maf
    } catch (e: Exception) {
        Log.e("MAF", "Error parsing MAF: ${e.localizedMessage}")
        return null
    }
}

private fun parseThrottle(response: String): Int? {
    val cleanResponse = response.replace(" ", "").replace(">", "")
    Log.d("Throttle", "Cleaned response: $cleanResponse")
    
    if (!cleanResponse.contains("4111")) {
        Log.d("Throttle", "Invalid response format")
        return null
    }
    if (cleanResponse.length < 6) {
        Log.d("Throttle", "Response too short")
        return null
    }
    
    try {
        val startIndex = cleanResponse.indexOf("4111") + 4
        val throttle = cleanResponse.substring(startIndex, startIndex + 2).toInt(16) * 100 / 255
        Log.d("Throttle", "Calculated throttle: $throttle")
        return throttle
    } catch (e: Exception) {
        Log.e("Throttle", "Error parsing throttle: ${e.localizedMessage}")
        return null
    }
}

private suspend fun sendToBackend(context: Context, data: JSONObject) {
    // Оборачиваем весь сетевой код в Dispatchers.IO
    withContext(Dispatchers.IO) {
    try {
            val token = context.getSharedPreferences("prefs", Context.MODE_PRIVATE)
                .getString("jwt_token", null)
            ?: throw Exception("JWT token not found")
            
        val url = URL("http://192.168.0.121:5000/api/telemetry")
        val connection = url.openConnection() as HttpURLConnection
        
        connection.apply {
            requestMethod = "POST"
            setRequestProperty("Content-Type", "application/json")
            setRequestProperty("Authorization", "Bearer $token")
            doOutput = true
            connectTimeout = 5000
            readTimeout = 5000
            
            val outputStream: OutputStream = BufferedOutputStream(outputStream)
            outputStream.write(data.toString().toByteArray())
            outputStream.flush()
                // Закрываем outputStream, чтобы завершить запрос
                outputStream.close()
        }

        val responseCode = connection.responseCode
            if (responseCode >= 400) { // Проверяем коды ошибок (4xx, 5xx)
                val errorBody = connection.errorStream?.bufferedReader()?.use { it.readText() } ?: "No error body"
                Log.e("API", "Error sending telemetry data. Code: $responseCode, Body: $errorBody")
                // Можно выбросить более информативное исключение или обработать ошибку
                throw Exception("Server error: $responseCode - $errorBody")
            } else {
                val response = connection.inputStream.bufferedReader().use { it.readText() }
                Log.d("API", "Data sent successfully: $response")
            }

            // Закрываем соединение
            connection.disconnect()

    } catch (e: Exception) {
            Log.e("API", "Connection error during sendToBackend: ${e.message}", e)
            // Перебрасываем исключение, чтобы оно было поймано в startDataCollection
        throw e
        }
    }
}

@Composable
fun DtcCodesCard(dtcCodesValue: String) {
    if (dtcCodesValue == "[]" || dtcCodesValue.isEmpty()) {
        return
    }
    
    // Предварительно обработаем JSON вне композабельных функций
    val parsedErrorCodes = remember { mutableStateOf<List<String>>(emptyList()) }
    val parseError = remember { mutableStateOf<String?>(null) }
    
    // Эффект для обработки JSON при изменении dtcCodesValue
    LaunchedEffect(dtcCodesValue) {
        try {
            val jsonArray = JSONArray(dtcCodesValue)
            val errorCodes = mutableListOf<String>()
            for (i in 0 until jsonArray.length()) {
                errorCodes.add(jsonArray.getString(i))
            }
            parsedErrorCodes.value = errorCodes
            parseError.value = null
        } catch (e: Exception) {
            Log.e("DTC_DISPLAY", "Error parsing DTC codes: ${e.localizedMessage}")
            parseError.value = "Ошибка отображения кодов неисправностей"
            parsedErrorCodes.value = emptyList()
        }
    }
    
    Card(
        modifier = Modifier
            .fillMaxWidth()
            .padding(8.dp),
        colors = CardDefaults.cardColors(
            containerColor = MaterialTheme.colorScheme.errorContainer
        )
    ) {
        Column(
            modifier = Modifier.padding(16.dp)
        ) {
            Row(
                verticalAlignment = Alignment.CenterVertically,
                modifier = Modifier.fillMaxWidth()
            ) {
                Icon(
                    imageVector = Icons.Default.Warning,
                    contentDescription = "Warning",
                    tint = Color.White,
                    modifier = Modifier.size(24.dp)
                )
                Spacer(modifier = Modifier.width(8.dp))
                Text(
                    text = "Обнаружены коды ошибок",
                    color = Color.White,
                    fontWeight = FontWeight.Bold,
                    fontSize = 18.sp
                )
            }
            
            Spacer(modifier = Modifier.height(8.dp))
            
            // Отображаем либо ошибку, либо коды ошибок
            if (parseError.value != null) {
                Text(
                    text = parseError.value!!,
                    color = Color.White,
                    fontSize = 16.sp
                )
            } else {
                Column {
                    parsedErrorCodes.value.forEach { code ->
                        Text(
                            text = "$code - ${getErrorDescription(code)}",
                            color = Color.White,
                            fontSize = 16.sp,
                            modifier = Modifier.padding(vertical = 4.dp)
                        )
                    }
                }
                
                if (parsedErrorCodes.value.isNotEmpty()) {
                    Spacer(modifier = Modifier.height(8.dp))
                    
                    Text(
                        text = "Рекомендуется обратиться в сервисный центр для диагностики.",
                        color = Color.White,
                        fontStyle = FontStyle.Italic,
                        fontSize = 14.sp
                    )
                }
            }
        }
    }
}

// Класс для работы с ELM327 эмулятором
class Elm327Emulator(private val ip: String, private val port: Int) {
    private var socket: Socket? = null
    private var isConnected = false // Represents logical connection state (after successful commands)

    suspend fun connect(): Boolean {
        return withContext(Dispatchers.IO) {
            try {
                Log.d("ELM327", "Attempting socket connection to $ip:$port")
                socket = Socket()
                // Connect socket
                socket?.connect(InetSocketAddress(ip, port), 5000) // 5 second timeout

                // Check if socket connection was successful
                if (socket?.isConnected != true) {
                    Log.e("ELM327", "Socket connection failed or timed out.")
                    socket?.close() // Ensure socket is closed
                    socket = null
                    isConnected = false
                    return@withContext false
                }

                Log.d("ELM327", "Socket connected. Initializing ELM327...")

                // Give the emulator some time
                delay(500)

                // Send initialization commands ONLY if socket is connected
                val resetResponse = sendCommandInternal("ATZ") // Use internal send method
                Log.d("ELM327", "Reset response: $resetResponse")
                if (resetResponse.contains("ERROR")) {
                    Log.e("ELM327", "Failed during ATZ reset.")
                    disconnect()
                    return@withContext false
                }

                sendCommandInternal("ATE0") // Disable echo
                sendCommandInternal("ATSP0") // Set protocol automatically

                // Verify communication with a test command
                val testResponse = sendCommandInternal("0100") // Check supported PIDs
                Log.d("ELM327", "Test command (0100) response: $testResponse")

                // Set final connection state based on test command response
                isConnected = !testResponse.contains("NO DATA") && !testResponse.contains("ERROR")

                if (!isConnected) {
                    Log.e("ELM327", "Failed to initialize or communicate with ELM327: $testResponse")
                    disconnect() // Clean up if initialization failed
                } else {
                    Log.d("ELM327", "ELM327 emulator connected and initialized successfully.")
                }

                isConnected // Return the final connection status
            } catch (e: Exception) {
                Log.e("ELM327", "Connection or communication error: ${e.message}", e)
                disconnect() // Ensure disconnection on error
                isConnected = false
                false
            }
        }
    }

    // Internal send command function used during connection setup
    // Assumes socket is non-null and potentially connected (relies on socket state)
    private suspend fun sendCommandInternal(command: String): String {
         // Check socket status directly
        if (socket == null || socket?.isClosed == true || socket?.isConnected != true) {
             Log.e("ELM327", "sendCommandInternal: Socket not connected or closed when sending '$command'.")
             return "ERROR"
         }
        return sendCommandLogic(command) // Delegate to the actual sending logic
    }

    // Public send command function - checks the logical isConnected state first
    suspend fun sendCommand(command: String): String {
        if (!isConnected) {
             Log.w("ELM327", "sendCommand: Not logically connected (initialization might have failed or disconnected). Command '$command' blocked.")
             return "ERROR" // Block commands if not fully connected and initialized
        }
        // If logically connected, check socket status as a safeguard
        if (socket == null || socket?.isClosed == true || socket?.isConnected != true) {
             Log.e("ELM327", "sendCommand: Socket disconnected unexpectedly for command '$command'.")
             isConnected = false // Update state
             return "ERROR"
         }
        return sendCommandLogic(command)
    }

    // Shared logic for sending commands and reading responses
    private suspend fun sendCommandLogic(command: String): String {
        return withContext(Dispatchers.IO) {
            try {
                val outputStream = socket!!.getOutputStream()
                val inputStream = socket!!.getInputStream()

                // Send command
                Log.d("ELM327", "Sending command: $command")
                outputStream.write("$command\\r\\n".toByteArray())
                outputStream.flush()

                // Read response
                val buffer = ByteArray(1024)
                val response = StringBuilder()
                var bytesRead: Int
                var timeout = 0
                val maxTimeout = 15 // Increased timeout slightly

                // Basic read loop with timeout
                do {
                    // Check available bytes before blocking read
                    val availableBytes = inputStream.available()
                    if (availableBytes > 0) {
                         bytesRead = inputStream.read(buffer, 0, minOf(buffer.size, availableBytes))
                         if (bytesRead > 0) {
                            val readChunk = String(buffer, 0, bytesRead)
                            response.append(readChunk)
                            Log.v("ELM327", "Read chunk: $readChunk") // Verbose logging for response chunks
                        }
                    } else {
                        bytesRead = 0 // No bytes read if none available
                    }

                    // Break if ELM prompt '>' is received
                    if (response.contains(">")) {
                        Log.v("ELM327", "Prompt '>' detected.")
                        break
                    }

                    // Only delay if no data was read in this iteration
                    if (bytesRead <= 0) {
                        delay(100) // Wait for more data
                        timeout++
                    } else {
                        timeout = 0 // Reset timeout if data was received
                    }

                } while (timeout < maxTimeout)

                if (timeout >= maxTimeout && !response.contains(">")) {
                     Log.w("ELM327", "Response timeout for command '$command'. Response so far: $response")
                     // Consider returning a specific timeout error or partial response if needed
                }

                val result = response.toString().replace(">", "").trim() // Remove prompt and trim
                Log.d("ELM327", "Command: '$command', Full Response: '$result'")
                result

            } catch (e: Exception) {
                Log.e("ELM327", "Error during send/receive for command '$command': ${e.message}", e)
                // Attempt to handle potential connection loss
                disconnect()
                isConnected = false
                "ERROR"
            }
        }
    }

    suspend fun getDtcCodes(): List<String> {
        // No change needed here, relies on public sendCommand which checks isConnected
        // ... existing code ...
        try {
            val response = sendCommand("03")
            if (response.contains("ERROR") || response.contains("NO DATA") || !response.contains("43")) {
                return emptyList()
            }
            
            // Парсим коды ошибок
            val cleanResponse = response.replace(" ", "").replace(">", "").trim()
            val dtcCodes = mutableListOf<String>()
            
            // Находим позицию "43" в ответе
            val startIndex = cleanResponse.indexOf("43")
            if (startIndex < 0) {
                return emptyList()
            }
            
            // Обрабатываем оставшуюся часть ответа
            var index = startIndex + 2
            while (index + 4 <= cleanResponse.length) {
                val code = cleanResponse.substring(index, index + 4)
                
                // Проверяем, является ли код допустимым шестнадцатеричным значением
                if (code.all { it.isDigit() || it in 'A'..'F' || it in 'a'..'f' }) {
                    // Преобразуем код в формат P-коды (P0xxx, P1xxx и т.д.)
                    val firstDigit = code[0]
                    val type = when (firstDigit) {
                        '0' -> "P0"
                        '1' -> "P1"
                        '2' -> "P2"
                        '3' -> "P3"
                        '4' -> "C0"
                        '5' -> "C1"
                        '6' -> "C2"
                        '7' -> "C3"
                        '8' -> "B0"
                        '9' -> "B1"
                        'A', 'a' -> "B2"
                        'B', 'b' -> "B3"
                        'C', 'c' -> "U0"
                        'D', 'd' -> "U1"
                        'E', 'e' -> "U2"
                        'F', 'f' -> "U3"
                        else -> "P0"
                    }
                    
                    // Добавляем правильно отформатированный DTC код
                    val formattedCode = type + code.substring(1)
                    dtcCodes.add(formattedCode)
                }
                
                index += 4
            }
            
            return dtcCodes
        } catch (e: Exception) {
            Log.e("ELM327", "Error getting DTC codes: ${e.message}", e)
            return emptyList()
        }
    }

    fun disconnect() {
         if (socket != null) {
            Log.d("ELM327", "Disconnecting from emulator...")
             try {
                 socket?.close()
             } catch (e: Exception) {
                 Log.e("ELM327", "Error closing socket: ${e.message}", e)
             } finally {
                 socket = null
                 isConnected = false
                 Log.d("ELM327", "Socket closed and state reset.")
             }
         } else {
             Log.d("ELM327", "disconnect() called but socket was already null.")
             isConnected = false // Ensure state is false
         }
    }

    // Проверяем, поддерживается ли PID
    suspend fun isPidSupported(pid: String): Boolean {
        // No change needed here
        // ... existing code ...
        val supportedResponse = sendCommand("0100") // Example, adjust if needed
        if (supportedResponse.contains("ERROR") || supportedResponse.contains("NO DATA")) {
            return false
        }
        
        // Анализируем ответ (упрощенная проверка)
        // TODO: Add actual PID support parsing based on the response format
        return true
    }
    
    // Получаем значение оборотов двигателя
    suspend fun getRPM(): Int? {
        // No change needed here
        // ... existing code ...
        val response = sendCommand("010C")
        if (response.contains("ERROR") || response.contains("NO DATA")) {
            return null
        }
        
        try {
            val cleanResponse = response.replace(" ", "").replace(">", "").trim()
            if (!cleanResponse.contains("410C")) return null
            
            val startIndex = cleanResponse.indexOf("410C") + 4
            if (startIndex + 4 > cleanResponse.length) return null
            
            val high = cleanResponse.substring(startIndex, startIndex + 2).toInt(16)
            val low = cleanResponse.substring(startIndex + 2, startIndex + 4).toInt(16)
            return ((high * 256 + low) / 4)
        } catch (e: Exception) {
            Log.e("ELM327", "Error parsing RPM: ${e.message}", e)
            return null
        }
    }
    
    // Получаем скорость автомобиля
    suspend fun getSpeed(): Int? {
        // No change needed here
        // ... existing code ...
        val response = sendCommand("010D")
        if (response.contains("ERROR") || response.contains("NO DATA")) {
            return null
        }
        
        try {
            val cleanResponse = response.replace(" ", "").replace(">", "").trim()
            if (!cleanResponse.contains("410D")) return null
            
            val startIndex = cleanResponse.indexOf("410D") + 4
            if (startIndex + 2 > cleanResponse.length) return null
            
            return cleanResponse.substring(startIndex, startIndex + 2).toInt(16)
        } catch (e: Exception) {
            Log.e("ELM327", "Error parsing speed: ${e.message}", e)
            return null
        }
    }
}

// Функция для получения описания ошибки по коду
private fun getErrorDescription(code: String): String {
    // Сначала проверяем точные совпадения по коду
    val exactMatch = when (code) {
        // P0xxx - Топливная и воздушная системы, базовые коды
        "P0100" -> "Неисправность в цепи расходомера воздуха"
        "P0101" -> "Диапазон/функционирование расходомера воздуха"
        "P0102" -> "Низкий входной сигнал расходомера воздуха"
        "P0103" -> "Высокий входной сигнал расходомера воздуха"
        "P0104" -> "Перемежающийся сигнал расходомера воздуха"
        "P0105" -> "Неисправность датчика давления впускного коллектора"
        "P0106" -> "Диапазон/функционирование датчика давления впускного коллектора"
        "P0107" -> "Низкий входной сигнал датчика давления впускного коллектора"
        "P0108" -> "Высокий входной сигнал датчика давления впускного коллектора"
        "P0109" -> "Перемежающийся сигнал датчика давления впускного коллектора"
        "P0110" -> "Неисправность в цепи датчика температуры воздуха"
        "P0111" -> "Диапазон/функционирование датчика температуры воздуха"
        "P0112" -> "Низкий входной сигнал датчика температуры воздуха"
        "P0113" -> "Высокий входной сигнал датчика температуры воздуха"
        "P0114" -> "Перемежающийся сигнал датчика температуры воздуха"
        "P0115" -> "Неисправность в цепи датчика температуры охлаждающей жидкости"
        "P0116" -> "Диапазон/функционирование датчика температуры охлаждающей жидкости"
        "P0117" -> "Низкий входной сигнал датчика температуры охлаждающей жидкости"
        "P0118" -> "Высокий входной сигнал датчика температуры охлаждающей жидкости"
        "P0119" -> "Перемежающийся сигнал датчика температуры охлаждающей жидкости"
        "P0120" -> "Неисправность в цепи датчика положения дросселя"
        "P0121" -> "Диапазон/функционирование датчика положения дросселя"
        "P0122" -> "Низкий входной сигнал датчика положения дросселя"
        "P0123" -> "Высокий входной сигнал датчика положения дросселя"
        "P0124" -> "Перемежающийся сигнал датчика положения дросселя"
        "P0125" -> "Недостаточная температура для замкнутого цикла регулирования топлива"
        "P0130" -> "Неисправность цепи датчика кислорода (Банк 1, Датчик 1)"
        "P0131" -> "Низкий уровень сигнала в цепи датчика кислорода (Банк 1, Датчик 1)"
        "P0132" -> "Высокий уровень сигнала в цепи датчика кислорода (Банк 1, Датчик 1)"
        "P0133" -> "Медленный отклик датчика кислорода (Банк 1, Датчик 1)"
        "P0134" -> "Отсутствие активности датчика кислорода (Банк 1, Датчик 1)"
        "P0135" -> "Неисправность цепи нагревателя датчика кислорода (Банк 1, Датчик 1)"
        "P0136" -> "Неисправность цепи датчика кислорода (Банк 1, Датчик 2)"

        // P03xx - Система зажигания и пропуски зажигания
        "P0300" -> "Случайные/множественные пропуски зажигания"
        "P0301" -> "Пропуски зажигания в цилиндре 1"
        "P0302" -> "Пропуски зажигания в цилиндре 2"
        "P0303" -> "Пропуски зажигания в цилиндре 3"
        "P0304" -> "Пропуски зажигания в цилиндре 4"
        "P0305" -> "Пропуски зажигания в цилиндре 5"
        "P0306" -> "Пропуски зажигания в цилиндре 6"
        "P0307" -> "Пропуски зажигания в цилиндре 7"
        "P0308" -> "Пропуски зажигания в цилиндре 8"

        // P04xx - Система дополнительного контроля выбросов
        "P0400" -> "Неисправность системы рециркуляции выхлопных газов"
        "P0401" -> "Недостаточный поток системы рециркуляции выхлопных газов"
        "P0402" -> "Чрезмерный поток системы рециркуляции выхлопных газов"
        "P0403" -> "Неисправность в цепи системы рециркуляции выхлопных газов"
        "P0404" -> "Диапазон/функционирование системы рециркуляции выхлопных газов"
        "P0405" -> "Низкий входной сигнал датчика A положения клапана рециркуляции"
        "P0406" -> "Высокий входной сигнал датчика A положения клапана рециркуляции"

        // P05xx - Система холостого хода и скорости автомобиля
        "P0500" -> "Датчик скорости автомобиля неисправен"
        "P0501" -> "Диапазон/функционирование датчика скорости автомобиля"
        "P0502" -> "Низкий входной сигнал датчика скорости автомобиля"
        "P0503" -> "Прерывистый/нерегулярный сигнал датчика скорости автомобиля"
        "P0504" -> "Корреляция выключателей тормоза A/B"
        "P0505" -> "Неисправность системы контроля холостого хода"

        // P06xx - Компьютер и вспомогательные цепи
        "P0600" -> "Неисправность связи последовательной шины"
        "P0601" -> "Внутренняя ошибка памяти блока управления"
        "P0602" -> "Ошибка программирования блока управления"
        "P0603" -> "Ошибка постоянной памяти блока управления"
        "P0604" -> "Ошибка оперативной памяти блока управления"
        "P0605" -> "Ошибка ROM теста блока управления"
        "P0606" -> "Процессор блока управления ECM/PCM"
        "P0607" -> "Ошибка работоспособности блока управления"

        // P07xx - Трансмиссия и раздаточная коробка
        "P0700" -> "Неисправность в системе управления трансмиссией"
        "P0701" -> "Диапазон/функционирование системы управления трансмиссией"
        "P0702" -> "Электрическая неисправность системы управления трансмиссией"
        "P0703" -> "Неисправность в цепи выключателя B тормоза"
        "P0704" -> "Неисправность в цепи выключателя сцепления"
        "P0705" -> "Неисправность в цепи датчика диапазона трансмиссии"

        // P08xx - Трансмиссия и раздаточная коробка (продолжение)
        "P0800" -> "Проблема с сигналом управления раздаточной коробкой"
        "P0801" -> "Проблема с цепью реверса раздаточной коробки"
        "P0802" -> "Проблема с цепью управления раздаточной коробкой"
        "P0803" -> "Неисправность в цепи соленоида повышающей передачи"
        "P0804" -> "Неисправность в цепи индикатора повышающей передачи"

        // P09xx - Входные/выходные сигналы контроля трансмиссии
        "P0900" -> "Неисправность в цепи включения сцепления"
        "P0901" -> "Неисправность в цепи включения сцепления - диапазон/функционирование"
        "P0902" -> "Неисправность в цепи включения сцепления - низкий сигнал"
        "P0903" -> "Неисправность в цепи включения сцепления - высокий сигнал"

        // Коды неисправностей шасси (C-коды)
        "C0035" -> "Передний левый датчик скорости - неисправность цепи"
        "C0040" -> "Передний правый датчик скорости - неисправность цепи"
        "C0045" -> "Задний левый датчик скорости - неисправность цепи"
        "C0050" -> "Задний правый датчик скорости - неисправность цепи"
        "C0121" -> "Неисправность в цепи клапана переднего левого антиблокировочного тормоза"
        "C0122" -> "Неисправность в цепи клапана переднего правого антиблокировочного тормоза"
        "C0123" -> "Неисправность в цепи клапана заднего левого антиблокировочного тормоза"
        "C0124" -> "Неисправность в цепи клапана заднего правого антиблокировочного тормоза"
        "C0200" -> "Неисправность цепи привода заднего левого колеса"
        "C0205" -> "Неисправность цепи привода заднего правого колеса"

        // Коды неисправностей кузова (B-коды)
        "B0001" -> "Неисправность модуля подушки безопасности"
        "B0026" -> "Сработала подушка безопасности водителя"
        "B0027" -> "Сработала подушка безопасности пассажира"
        "B0050" -> "Неисправность модуля управления подушками безопасности"
        "B1000" -> "Проблема с коммуникационной шиной"
        "B1500" -> "Проблема с центральным замком"
        "B1600" -> "Проблема с модулем управления сиденьями"

        // Коды неисправностей сети (U-коды)
        "U0001" -> "CAN-шина выключена - высокая скорость"
        "U0100" -> "Потеря связи с ECM/PCM"
        "U0101" -> "Потеря связи с модулем управления трансмиссией"
        "U0121" -> "Потеря связи с модулем ABS"
        "U0131" -> "Потеря связи с модулем электроусилителя руля"
        "U0155" -> "Потеря связи с панелью приборов"
        "U0164" -> "Потеря связи с модулем системы кондиционирования"
        "U0300" -> "Внутренняя неисправность модуля управления"
        "U0301" -> "Несовместимость версии программного обеспечения"
        "U1000" -> "Ошибка SCP (J1850)"
        "U1001" -> "Потеря связи с SCP (J1850)"

        else -> null
    }

    // Если точное совпадение не найдено, проверяем по префиксу
    if (exactMatch != null) {
        return exactMatch
    } else {
        return when {
            code.startsWith("P00") -> "Проблема с топливной и воздушной системами"
            code.startsWith("P01") -> "Проблема с измерением расхода воздуха/топлива"
            code.startsWith("P02") -> "Проблема с топливной системой или форсунками"
            code.startsWith("P03") -> "Пропуски зажигания или проблема с системой зажигания"
            code.startsWith("P04") -> "Проблема с системой рециркуляции выхлопных газов (EGR)"
            code.startsWith("P05") -> "Проблема с системой контроля скорости холостого хода"
            code.startsWith("P06") -> "Проблема с компьютером или электрической цепью"
            code.startsWith("P07") -> "Проблема с управлением трансмиссией"
            code.startsWith("P08") -> "Проблема с трансмиссией или раздаточной коробкой"
            code.startsWith("P09") -> "Проблема с входными/выходными сигналами трансмиссии"
            code.startsWith("P10") -> "Проблема с системой впрыска (производитель)"
            code.startsWith("P11") -> "Проблема с системой воздухозабора (производитель)"
            code.startsWith("P12") -> "Проблема с топливной системой (производитель)"
            code.startsWith("P13") -> "Проблема с системой зажигания (производитель)"
            code.startsWith("P2") -> "Расширенные OBD-II коды"
            code.startsWith("P3") -> "Расширенные OBD-II коды (производитель)"
            code.startsWith("C0") -> "Проблема с шасси - тормозная система, подвеска"
            code.startsWith("C1") -> "Проблема с шасси (производитель)"
            code.startsWith("B0") -> "Проблема с кузовом - подушки безопасности, центр. замок"
            code.startsWith("B1") -> "Проблема с кузовом (производитель)"
            code.startsWith("U0") -> "Проблема с коммуникационной сетью автомобиля"
            code.startsWith("U1") -> "Проблема с сетью (производитель)"
            else -> "Неизвестная ошибка"
        }
    }
}