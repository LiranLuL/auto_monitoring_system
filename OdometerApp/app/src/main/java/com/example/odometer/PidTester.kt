package com.example.odometer

import android.util.Log
import java.io.BufferedReader
import java.io.InputStreamReader
import java.io.PrintWriter
import java.net.Socket

/**
 * Класс для тестирования поддерживаемых PID-кодов эмулятора ELM327
 */
object PidTester {
    private const val TAG = "PidTester"
    
    // Основной метод для тестирования поддерживаемых PID
    fun testSupportedPIDs(ipAddress: String, port: Int): String {
        val sb = StringBuilder()
        sb.append("Проверка поддерживаемых PID кодов\n\n")
        
        try {
            // Создаем сокет для подключения к эмулятору ELM327
            val socket = Socket(ipAddress, port)
            val out = PrintWriter(socket.getOutputStream(), true)
            val reader = BufferedReader(InputStreamReader(socket.getInputStream()))
            
            // Сброс и инициализация адаптера
            out.println("ATZ") // Сброс адаптера
            readResponse(reader)
            
            out.println("ATE0") // Отключение эха
            readResponse(reader)
            
            out.println("ATL0") // Отключение повторяющихся заголовков
            readResponse(reader)
            
            out.println("ATSP0") // Авто-выбор протокола
            readResponse(reader)
            
            // Проверка поддерживаемых модов (сервисов)
            out.println("0100") // Проверка поддерживаемых PID в моде 01
            val pidsMode01 = readResponse(reader)
            sb.append("Поддерживаемые PID в режиме 01 (текущие данные):\n")
            sb.append(decodeSupportedPids(pidsMode01, "01"))
            sb.append("\n\n")
            
            // Проверяем поддерживаемые режимы
            out.println("011C") // Стандарт OBD
            val obdStandard = readResponse(reader)
            sb.append("Поддерживаемый стандарт OBD: $obdStandard\n\n")
            
            // Проверяем конкретные PID, которые нас интересуют
            val pidsToTest = listOf(
                "0101" to "Статус монитора",
                "0104" to "Расчетная нагрузка двигателя",
                "0105" to "Температура охлаждающей жидкости",
                "010C" to "Обороты двигателя (RPM)",
                "010D" to "Скорость автомобиля",
                "010F" to "Температура впускного воздуха",
                "0110" to "Расход воздуха (MAF)",
                "0111" to "Положение дроссельной заслонки",
                "0114" to "Кислородный датчик 1",
                "011F" to "Время работы с запуска двигателя"
            )
            
            sb.append("Проверка конкретных PID:\n")
            for ((pid, description) in pidsToTest) {
                out.println(pid)
                val response = readResponse(reader)
                val supported = !response.contains("NO DATA") && !response.contains("ERROR") && response.trim().isNotEmpty()
                sb.append("$pid - $description: ${if (supported) "Поддерживается" else "Не поддерживается"}")
                
                if (supported) {
                    sb.append(" (значение: $response)")
                }
                
                sb.append("\n")
            }
            
            // Закрываем соединение
            socket.close()
            
        } catch (e: Exception) {
            Log.e(TAG, "Ошибка при проверке PID: ${e.message}")
            sb.append("Ошибка: ${e.message}")
        }
        
        return sb.toString()
    }
    
    // Чтение ответа из сокета
    private fun readResponse(reader: BufferedReader): String {
        val response = StringBuilder()
        var line: String?
        
        try {
            // Задержка перед чтением
            Thread.sleep(100)
            
            // Читаем все строки из буфера
            while (reader.ready()) {
                line = reader.readLine()
                if (line != null && line.isNotEmpty()) {
                    response.append(line).append("\n")
                }
            }
        } catch (e: Exception) {
            Log.e(TAG, "Ошибка при чтении ответа: ${e.message}")
        }
        
        return response.toString().trim()
    }
    
    // Декодирование поддерживаемых PID из ответа
    private fun decodeSupportedPids(response: String, mode: String): String {
        if (response.contains("NO DATA") || response.contains("ERROR") || response.trim().isEmpty()) {
            return "Нет поддерживаемых PID или ошибка"
        }
        
        val sb = StringBuilder()
        
        // Пример ответа: "41 00 BE 1F B8 10"
        // 41 - успешный ответ на запрос режима 01
        // 00 - запрошенный PID (00)
        // BE 1F B8 10 - битовая маска поддерживаемых PID
        
        try {
            val parts = response.split(" ")
            if (parts.size >= 3) {
                // Начинаем с индекса 2, пропуская код ответа и запрошенный PID
                for (i in 2 until parts.size) {
                    val value = parts[i].toInt(16)
                    for (bit in 7 downTo 0) {
                        if ((value and (1 shl bit)) != 0) {
                            val pidNumber = (i - 2) * 8 + (7 - bit) + 1
                            sb.append("$mode${String.format("%02X", pidNumber)}\n")
                        }
                    }
                }
            }
        } catch (e: Exception) {
            Log.e(TAG, "Ошибка при декодировании PID: ${e.message}")
            return "Ошибка при декодировании: ${e.message}"
        }
        
        return sb.toString()
    }
} 