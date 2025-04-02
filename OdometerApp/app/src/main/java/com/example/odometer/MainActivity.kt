package com.example.odometer
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
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
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

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContent {
            OdometerApp()
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun OdometerApp() {
    var connectionStatus by remember { mutableStateOf("Статус: Не подключено") }
    var distanceValue by remember { mutableStateOf(0) }
    var rpmValue by remember { mutableStateOf(0) }
    var speedValue by remember { mutableStateOf(0) }
    var engineTempValue by remember { mutableStateOf(0) }
    var dtcCodesValue by remember { mutableStateOf("") }
    var o2VoltageValue by remember { mutableStateOf(0.0) }
    var fuelPressureValue by remember { mutableStateOf(0.0) }
    var intakeTempValue by remember { mutableStateOf(0) }
    var mafSensorValue by remember { mutableStateOf(0.0) }
    var throttlePosValue by remember { mutableStateOf(0) }
    
    val coroutineScope = remember { CoroutineScope(Dispatchers.IO) }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(16.dp),
        horizontalAlignment = Alignment.CenterHorizontally
    ) {
        Button(
            onClick = {
                coroutineScope.launch {
                    try {
                        val socket = connectToElm327("192.168.0.121", 35000)
                        if (socket != null) {
                            socket.use { s ->
                            readDistanceData(
                                    socket = s,
                                updateStatus = { connectionStatus = it },
                                    updateDistance = { distanceValue = it },
                                    updateRPM = { rpmValue = it },
                                    updateSpeed = { speedValue = it },
                                    updateEngineTemp = { engineTempValue = it },
                                    updateDTC = { dtcCodesValue = it },
                                    updateO2Voltage = { o2VoltageValue = it },
                                    updateFuelPressure = { fuelPressureValue = it },
                                    updateIntakeTemp = { intakeTempValue = it },
                                    updateMAF = { mafSensorValue = it },
                                    updateThrottle = { throttlePosValue = it }
                                )
                            }
                        } else {
                            connectionStatus = "Ошибка: Не удалось подключиться"
                        }
                    } catch (e: Exception) {
                        connectionStatus = "Ошибка: ${e.localizedMessage}"
                    }
                }
            },
            modifier = Modifier.padding(8.dp)
        ) {
            Text("Получить данные")
        }

        Spacer(modifier = Modifier.height(24.dp))

        Text(
            text = connectionStatus,
            style = MaterialTheme.typography.bodyLarge,
            modifier = Modifier.padding(8.dp)
        )

        Spacer(modifier = Modifier.height(16.dp))

        // Отображение всех параметров
        Text(
            text = "RPM: $rpmValue",
            style = MaterialTheme.typography.bodyLarge,
            modifier = Modifier.padding(4.dp)
        )
        Text(
            text = "Скорость: $speedValue км/ч",
            style = MaterialTheme.typography.bodyLarge,
            modifier = Modifier.padding(4.dp)
        )
        Text(
            text = "Температура двигателя: $engineTempValue°C",
            style = MaterialTheme.typography.bodyLarge,
            modifier = Modifier.padding(4.dp)
        )
        Text(
            text = "Коды ошибок: ${dtcCodesValue.replace("[", "").replace("]", "").replace("\"", "")}",
            style = MaterialTheme.typography.bodyLarge,
            modifier = Modifier.padding(4.dp)
        )
        Text(
            text = "Напряжение O2: $o2VoltageValue В",
            style = MaterialTheme.typography.bodyLarge,
            modifier = Modifier.padding(4.dp)
        )
        Text(
            text = "Давление топлива: $fuelPressureValue кПа",
            style = MaterialTheme.typography.bodyLarge,
            modifier = Modifier.padding(4.dp)
        )
        Text(
            text = "Температура впуска: $intakeTempValue°C",
            style = MaterialTheme.typography.bodyLarge,
            modifier = Modifier.padding(4.dp)
        )
        Text(
            text = "MAF: $mafSensorValue г/с",
            style = MaterialTheme.typography.bodyLarge,
            modifier = Modifier.padding(4.dp)
        )
        Text(
            text = "Положение дросселя: $throttlePosValue%",
            style = MaterialTheme.typography.bodyLarge,
            modifier = Modifier.padding(4.dp)
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
        val data = JSONObject().apply {
            put("vehicleId", "TEST123")
            put("rpm", rpm ?: 0)
            put("speed", speed ?: 0)
            put("engineTemp", temp ?: 0)
            put("dtcCodes", dtc)
            put("o2Voltage", o2 ?: 0.0)
            put("fuelPressure", fuel ?: 0.0)
            put("intakeTemp", intake ?: 0)
            put("mafSensor", maf ?: 0.0)
            put("throttlePos", throttle ?: 0)
        }

        Log.d("API", "Sending data: ${data.toString()}")
        sendToBackend(data)
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
        val rpm = (high * 256 + low) / 4
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

private suspend fun sendToBackend(data: JSONObject) {
    try {
        val url = URL("http://192.168.0.121:5000/api/elm327-data")
        val connection = url.openConnection() as HttpURLConnection
        
        connection.apply {
            requestMethod = "POST"
            setRequestProperty("Content-Type", "application/json")
            doOutput = true
            connectTimeout = 5000
            readTimeout = 5000
            
            val outputStream: OutputStream = BufferedOutputStream(outputStream)
            outputStream.write(data.toString().toByteArray())
            outputStream.flush()
        }

        Log.d("API", "Response code: ${connection.responseCode}")
        when (connection.responseCode) {
            HttpURLConnection.HTTP_CREATED -> {
                val response = connection.inputStream.bufferedReader().use { it.readText() }
                Log.d("API", "Data sent successfully: $response")
            }
            else -> {
                val errorStream = connection.errorStream?.bufferedReader()?.use { it.readText() }
                Log.e("API", "Error: ${connection.responseCode}, Response: $errorStream")
            }
        }
    } catch (e: Exception) {
        Log.e("API", "Connection error: ${e.localizedMessage}")
        throw e
    }
}