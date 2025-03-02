package com.example.odometer
import android.os.Bundle
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
import java.io.InputStream
import java.io.OutputStream
import java.net.InetSocketAddress
import java.net.Socket

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
                    val socket = connectToElm327("192.168.0.101", 35000).apply {
                        this?.use {
                            readDistanceData(
                                socket = it,
                                updateStatus = { connectionStatus = it },
                                updateDistance = { distanceValue = it }
                            )
                        } ?: run {
                            connectionStatus = "Ошибка: Не удалось подключиться"
                        }
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

        Text(
            text = "Пробег после сброса: $distanceValue км",
            style = MaterialTheme.typography.displayMedium,
            modifier = Modifier.padding(8.dp)
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
        null
    }
}

private suspend fun configureAdapter(socket: Socket) {
    sendCommand(socket, "ATZ")   // Сброс адаптера
    sendCommand(socket, "ATE0")  // Отключение эха
    sendCommand(socket, "ATH1")  // Включение заголовков
    sendCommand(socket, "ATSP0") // Автоматический выбор протокола
}

private suspend fun readDistanceData(
    socket: Socket,
    updateStatus: (String) -> Unit,
    updateDistance: (Int) -> Unit
) {
    try {
        val response = sendCommand(socket, "0131")
        updateStatus("Статус: Получен ответ - $response")

        parseDistanceResponse(response)?.let {
            updateDistance(it)
            updateStatus("Статус: Данные обновлены")
        } ?: run {
            updateStatus("Ошибка: Неверный формат ответа")
        }

    } catch (e: Exception) {
        updateStatus("Ошибка: ${e.localizedMessage ?: "Неизвестная ошибка"}")
    }
}

private fun parseDistanceResponse(response: String): Int? {
    val cleanResponse = response
        .replace(" ", "")
        .replace(">", "")
        .replace("\r", "")
        .replace("\n", "")

    return when {
        cleanResponse.length >= 8 -> {
            // Берем 2 байта после 4131
            val byteA = cleanResponse.substring(4, 6).toInt(16)
            val byteB = cleanResponse.substring(6, 8).toInt(16)

            // Формула (A*256) + B
            (byteA * 256) + byteB
        }
        else -> null
    }
}

private suspend fun sendCommand(socket: Socket, command: String): String {
    val outputStream = socket.getOutputStream()
    val inputStream = socket.getInputStream()

    outputStream.write("$command\r\n".toByteArray())
    outputStream.flush()

    return readResponse(inputStream)
}

private suspend fun readResponse(inputStream: InputStream): String {
    val buffer = ByteArray(1024)
    val response = StringBuilder()
    var bytesRead: Int

    do {
        bytesRead = inputStream.read(buffer)
        if (bytesRead > 0) {
            response.append(String(buffer, 0, bytesRead))
        }
    } while (!response.contains(">") && bytesRead >= 0)

    return response.toString()
}