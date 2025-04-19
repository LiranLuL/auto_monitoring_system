package com.example.odometer
import android.content.Intent
import android.os.Bundle
import android.util.Log
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

// Используем локальную версию BluetoothDeviceSelectionActivity
// import com.example.odometerapp.BluetoothDeviceSelectionActivity

class MainActivity : ComponentActivity() {
    private var dataCollectionJob: Job? = null
    
    // Объявляем StateFlow переменные внутри класса MainActivity
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
    
    private val _fuelPressureValue = MutableStateFlow(0.0)
    val fuelPressureValue: StateFlow<Double> = _fuelPressureValue.asStateFlow()
    
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
    
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        // Проверяем наличие токена
        val token = getSharedPreferences("prefs", Context.MODE_PRIVATE).getString("jwt_token", null)
        if (token == null) {
            // Если токена нет, перенаправляем на экран логина
            startActivity(Intent(this, LoginActivity::class.java))
            finish()
            return
        }

        setContent {
            OdometerApp(this@MainActivity)
        }
    }
    
    override fun onDestroy() {
        super.onDestroy()
        stopDataCollection()
    }
    
    fun startDataCollection() {
        dataCollectionJob?.cancel()
        _collectingStatus.value = "Статус: Запуск сбора данных..."
        
        dataCollectionJob = CoroutineScope(Dispatchers.IO).launch {
            try {
                val socket = connectToElm327("192.168.0.121", 35000)
                if (socket != null) {
                    try {
                        _collectingStatus.value = "Статус: Подключено. Сбор данных..."
                        while (isActive) {
                            collectAndSendData(socket)
                            delay(10000) // 10 секунд между отправками
                        }
                    } finally {
                        try {
                            socket.close()
                            _collectingStatus.value = "Статус: Соединение закрыто"
                        } catch (e: Exception) {
                            Log.e("Socket", "Error closing socket: ${e.localizedMessage}")
                            _collectingStatus.value = "Статус: Ошибка при закрытии соединения"
                        }
                    }
                } else {
                    _collectingStatus.value = "Статус: Не удалось подключиться"
                }
            } catch (e: Exception) {
                Log.e("DataCollection", "Error in data collection: ${e.localizedMessage}")
                _collectingStatus.value = "Статус: Ошибка - ${e.localizedMessage}"
            }
        }
    }
    
    fun stopDataCollection() {
        dataCollectionJob?.cancel()
        dataCollectionJob = null
        _collectingStatus.value = "Статус: Остановлено"
    }
    
    private suspend fun collectAndSendData(socket: Socket) {
        try {
            // Обновляем статус на главном потоке
            withContext(Dispatchers.Main) {
                _collectingStatus.value = "Статус: Получение данных..."
            }
            
            // Получаем данные с задержкой между запросами
            val rpmResponse = sendCommand(socket, "010C")
            delay(100)
            
            val speedResponse = sendCommand(socket, "010D")
            delay(100)
            
            val tempResponse = sendCommand(socket, "0105")
            delay(100)
            
            val dtcResponse = sendCommand(socket, "03")
            delay(100)
            
            val o2Response = sendCommand(socket, "0114")
            delay(100)
            
            val fuelResponse = sendCommand(socket, "010A")
            delay(100)
            
            val intakeResponse = sendCommand(socket, "010F")
            delay(100)
            
            val mafResponse = sendCommand(socket, "0110")
            
            val throttleResponse = sendCommand(socket, "0111")
            
            // Парсим значения
            val rpm = parseRPM(rpmResponse)
            val speed = parseSpeed(speedResponse)
            val temp = parseTemperature(tempResponse)
            val dtc = parseDTC(dtcResponse)
            val o2 = parseO2Voltage(o2Response)
            val fuel = parseFuelPressure(fuelResponse)
            val intake = parseTemperature(intakeResponse)
            val maf = parseMAF(mafResponse)
            val throttle = parseThrottle(throttleResponse)

            // Вычисляем здоровье компонентов на основе полученных данных
            val engineHealth = calculateEngineHealth(rpm, temp, dtc)
            val oilHealth = calculateOilHealth(rpm, temp)
            val tiresHealth = calculateTiresHealth(speed)
            val brakesHealth = calculateBrakesHealth(speed)

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
            
            telemetryData.put("engineHealth", engineHealth)
            telemetryData.put("oilHealth", oilHealth)
            telemetryData.put("tiresHealth", tiresHealth)
            telemetryData.put("brakesHealth", brakesHealth)

            Log.d("API", "Sending data: ${telemetryData.toString()}")
            sendToBackend(this, telemetryData)
            
            // Обновляем UI значения на главном потоке
            withContext(Dispatchers.Main) {
                updateUIValues(
                    rpm ?: 0,
                    speed ?: 0,
                    temp ?: 0,
                    dtc,
                    o2 ?: 0.0,
                    fuel ?: 0.0,
                    intake ?: 0,
                    maf ?: 0.0,
                    throttle ?: 0,
                    engineHealth,
                    oilHealth,
                    tiresHealth,
                    brakesHealth
                )
                
                // Явно указываем, что сбор данных завершен
                _collectingStatus.value = "Статус: Данные получены (${System.currentTimeMillis()})"
            }
        } catch (e: Exception) {
            Log.e("Error", "Error in collectAndSendData: ${e.localizedMessage}")
            withContext(Dispatchers.Main) {
                _collectingStatus.value = "Статус: Ошибка - ${e.localizedMessage}"
            }
        }
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
    
    // Метод для обновления всех значений UI
    private fun updateUIValues(
        rpm: Int,
        speed: Int,
        engineTemp: Int,
        dtcCodes: String,
        o2Voltage: Double,
        fuelPressure: Double,
        intakeTemp: Int,
        mafSensor: Double,
        throttlePos: Int,
        engineHealth: Int,
        oilHealth: Int,
        tiresHealth: Int,
        brakesHealth: Int
    ) {
        // Обновляем значения StateFlow
        _rpmValue.value = rpm
        _speedValue.value = speed
        _engineTempValue.value = engineTemp
        _dtcCodesValue.value = dtcCodes
        _o2VoltageValue.value = o2Voltage
        _fuelPressureValue.value = fuelPressure
        _intakeTempValue.value = intakeTemp
        _mafSensorValue.value = mafSensor
        _throttlePosValue.value = throttlePos
        _engineHealthValue.value = engineHealth
        _oilHealthValue.value = oilHealth
        _tiresHealthValue.value = tiresHealth
        _brakesHealthValue.value = brakesHealth
        
        // Логируем обновление для отладки
        Log.d("UI_UPDATE", "UI values updated: rpm=$rpm, speed=$speed")
    }
    
    // ... остальные методы класса ...
}

// Удаляем глобальные переменные состояния
// private var uiRpmValue = mutableStateOf(0)
// private var uiSpeedValue = mutableStateOf(0)
// ... и т.д.

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun OdometerApp(mainActivity: MainActivity) {
    // Используем collectAsState для подписки на StateFlow
    val connectionStatus by mainActivity.collectingStatus.collectAsState()
    val rpmValue by mainActivity.rpmValue.collectAsState()
    val speedValue by mainActivity.speedValue.collectAsState()
    val engineTempValue by mainActivity.engineTempValue.collectAsState()
    val dtcCodesValue by mainActivity.dtcCodesValue.collectAsState()
    val o2VoltageValue by mainActivity.o2VoltageValue.collectAsState()
    val fuelPressureValue by mainActivity.fuelPressureValue.collectAsState()
    val intakeTempValue by mainActivity.intakeTempValue.collectAsState()
    val mafSensorValue by mainActivity.mafSensorValue.collectAsState()
    val throttlePosValue by mainActivity.throttlePosValue.collectAsState()
    val engineHealthValue by mainActivity.engineHealthValue.collectAsState()
    val oilHealthValue by mainActivity.oilHealthValue.collectAsState()
    val tiresHealthValue by mainActivity.tiresHealthValue.collectAsState()
    val brakesHealthValue by mainActivity.brakesHealthValue.collectAsState()
    
    var isCollecting by remember { mutableStateOf(false) }
    val context = LocalContext.current
    
    // Эффект для отслеживания статуса сбора данных
    LaunchedEffect(connectionStatus) {
        isCollecting = connectionStatus.contains("Сбор данных") || 
                       connectionStatus.contains("Получение данных")
    }

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
                            isCollecting = false
                        } else {
                            mainActivity.startDataCollection()
                            isCollecting = true
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
        Text(
                                            text = "$speedValue км/ч",
                                            style = MaterialTheme.typography.headlineMedium,
                                            color = MaterialTheme.colorScheme.primary
                                        )
                                    }
                                    
                                    Column {
        Text(
                                            text = "Обороты",
                                            style = MaterialTheme.typography.bodyMedium
        )
        Text(
                                            text = "$rpmValue об/мин",
                                            style = MaterialTheme.typography.headlineMedium,
                                            color = MaterialTheme.colorScheme.primary
                                        )
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
        Text(
                                    text = "Здоровье компонентов",
                                    style = MaterialTheme.typography.titleMedium,
                                    modifier = Modifier.padding(bottom = 8.dp)
                                )
                                
                                HealthIndicator("Двигатель", engineHealthValue)
                                HealthIndicator("Масло", oilHealthValue)
                                HealthIndicator("Шины", tiresHealthValue)
                                HealthIndicator("Тормоза", brakesHealthValue)
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
        Text(
                                            text = "$engineTempValue°C",
                                            style = MaterialTheme.typography.titleLarge,
                                            color = when {
                                                engineTempValue > 105 -> MaterialTheme.colorScheme.error
                                                engineTempValue > 95 -> MaterialTheme.colorScheme.error.copy(alpha = 0.7f)
                                                else -> MaterialTheme.colorScheme.primary
                                            }
                                        )
                                    }
                                    
                                    Column {
        Text(
                                            text = "Впускной коллектор",
                                            style = MaterialTheme.typography.bodyMedium
                                        )
                                        Text(
                                            text = "$intakeTempValue°C",
                                            style = MaterialTheme.typography.titleLarge,
                                            color = MaterialTheme.colorScheme.primary
                                        )
                                    }
                                }
                            }
                        }
                    }
                    
                    // Дополнительные датчики
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
                                    text = "Дополнительные датчики",
                                    style = MaterialTheme.typography.titleMedium,
                                    modifier = Modifier.padding(bottom = 8.dp)
                                )
                                
                                SensorValueRow("O₂ датчик", "$o2VoltageValue В")
                                SensorValueRow("Давление топлива", "$fuelPressureValue кПа")
                                SensorValueRow("MAF сенсор", "$mafSensorValue г/с")
                                SensorValueRow("Положение дросселя", "$throttlePosValue%")
                            }
                        }
                    }
                    
                    // Коды ошибок
                    item {
                        if (dtcCodesValue != "[]") {
                            ElevatedCard(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .padding(4.dp),
                                colors = CardDefaults.elevatedCardColors(
                                    containerColor = MaterialTheme.colorScheme.errorContainer
                                )
                            ) {
                                Column(
                                    modifier = Modifier.padding(16.dp)
                                ) {
                                    Text(
                                        text = "Коды ошибок",
                                        style = MaterialTheme.typography.titleMedium,
                                        color = MaterialTheme.colorScheme.onErrorContainer,
                                        modifier = Modifier.padding(bottom = 8.dp)
                                    )
                                    
                                    Text(
                                        text = dtcCodesValue.replace("[", "").replace("]", "").replace("\"", ""),
            style = MaterialTheme.typography.bodyLarge,
                                        color = MaterialTheme.colorScheme.onErrorContainer
                                    )
                                }
                            }
                        }
                    }
                }
            }
        }
    }
}

@Composable
fun HealthIndicator(label: String, value: Int) {
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
                color = when {
                    value < 50 -> MaterialTheme.colorScheme.error
                    value < 70 -> MaterialTheme.colorScheme.error.copy(alpha = 0.7f)
                    value < 90 -> MaterialTheme.colorScheme.primary.copy(alpha = 0.7f)
                    else -> MaterialTheme.colorScheme.primary
                }
            )
        }
        
        LinearProgressIndicator(
            progress = value / 100f,
            modifier = Modifier
                .fillMaxWidth()
                .height(8.dp),
            color = when {
                value < 50 -> MaterialTheme.colorScheme.error
                value < 70 -> MaterialTheme.colorScheme.error.copy(alpha = 0.7f)
                value < 90 -> MaterialTheme.colorScheme.primary.copy(alpha = 0.7f)
                else -> MaterialTheme.colorScheme.primary
            },
            trackColor = MaterialTheme.colorScheme.surfaceVariant
        )
    }
}

@Composable
fun SensorValueRow(label: String, value: String) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .padding(vertical = 4.dp),
        horizontalArrangement = Arrangement.SpaceBetween
    ) {
        Text(
            text = label,
            style = MaterialTheme.typography.bodyMedium
        )
        Text(
            text = value,
            style = MaterialTheme.typography.bodyMedium,
            fontWeight = FontWeight.Bold
        )
    }
}

private suspend fun connectToElm327(ip: String, port: Int): Socket? {
    return try {
        Socket().apply {
            connect(InetSocketAddress(ip, port), 5000)
            configureAdapter(this)
        }
    } catch (e: Exception) {
        Log.e("Socket", "Connection error: ${e.localizedMessage}")
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
    val cleanResponse = response.replace(" ", "").replace(">", "")
    Log.d("DTC", "Cleaned response: $cleanResponse")
    
    if (!cleanResponse.contains("43")) {
        Log.d("DTC", "Invalid response format")
        return "[]"
    }
    if (cleanResponse.length < 6) {
        Log.d("DTC", "Response too short")
        return "[]"
    }
    
    try {
        val startIndex = cleanResponse.indexOf("43") + 2
        val countStr = cleanResponse.substring(startIndex, startIndex + 2)
        if (!countStr.all { it.isDigit() || it in 'A'..'F' }) {
            Log.d("DTC", "Invalid count format")
            return "[]"
        }
        
        val count = countStr.toInt(16)
        if (count == 0) {
            Log.d("DTC", "No DTC codes")
            return "[]"
        }
        
        val dtcCodes = mutableListOf<String>()
        for (i in 0 until count) {
            val codeStart = startIndex + 2 + i * 4
            if (codeStart + 4 <= cleanResponse.length) {
                val code = cleanResponse.substring(codeStart, codeStart + 4)
                if (code.all { it.isDigit() || it in 'A'..'F' }) {
                    dtcCodes.add(code)
                }
            }
        }
        Log.d("DTC", "Found DTC codes: $dtcCodes")
        return JSONArray(dtcCodes).toString()
    } catch (e: Exception) {
        Log.e("DTC", "Error parsing DTC: ${e.localizedMessage}")
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
    try {
        val token = context.getSharedPreferences("prefs", Context.MODE_PRIVATE).getString("jwt_token", null)
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
        }

        val responseCode = connection.responseCode
        if (responseCode != 200) {
            throw Exception("Error sending telemetry data. Response code: $responseCode")
        }

                val response = connection.inputStream.bufferedReader().use { it.readText() }
                Log.d("API", "Data sent successfully: $response")
    } catch (e: Exception) {
        Log.e("API", "Connection error: ${e.localizedMessage}")
        throw e
    }
}