package com.example.odometer

import android.content.Context
import android.util.Log
import androidx.compose.runtime.mutableStateOf
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import org.json.JSONObject
import java.net.HttpURLConnection
import java.net.URL

/**
 * Service class for handling vehicle analysis data and notifications
 */
class VehicleAnalysisService(private val context: Context) {
    
    // Latest analysis results
    private val _analysisData = MutableStateFlow<VehicleAnalysis?>(null)
    val analysisData: StateFlow<VehicleAnalysis?> = _analysisData.asStateFlow()
    
    // Recommendations
    private val _recommendations = MutableStateFlow<List<String>>(emptyList())
    val recommendations: StateFlow<List<String>> = _recommendations.asStateFlow()
    
    // Has new notifications
    private val _hasNewNotifications = MutableStateFlow(false)
    val hasNewNotifications: StateFlow<Boolean> = _hasNewNotifications.asStateFlow()
    
    // Loading state
    private val _isLoading = MutableStateFlow(false)
    val isLoading: StateFlow<Boolean> = _isLoading.asStateFlow()
    
    // Error state
    private val _errorMessage = MutableStateFlow<String?>(null)
    val errorMessage: StateFlow<String?> = _errorMessage.asStateFlow()
    
    // Default API base URL in case we can't get it from resources
    private val DEFAULT_API_BASE_URL = "http://192.168.56.1:5001/api"
    
    /**
     * Fetch the latest analysis data from the server
     */
    fun fetchLatestAnalysis() {
        val token = context.getSharedPreferences("prefs", Context.MODE_PRIVATE).getString("jwt_token", null)
        if (token == null) {
            _errorMessage.value = "Требуется авторизация"
            return
        }
        
        _isLoading.value = true
        _errorMessage.value = null
        
        CoroutineScope(Dispatchers.IO).launch {
            try {
                // Get the vehicle ID from preferences
                val vehicleId = context.getSharedPreferences("prefs", Context.MODE_PRIVATE).getString("vehicle_id", null)
                if (vehicleId == null) {
                    _errorMessage.value = "Не найден ID автомобиля"
                    _isLoading.value = false
                    return@launch
                }
                
                // Get the API base URL or use default
                val serverUrl = try {
                    context.getString(context.resources.getIdentifier("api_base_url", "string", context.packageName))
                } catch (e: Exception) {
                    DEFAULT_API_BASE_URL
                }
                
                val url = URL("$serverUrl/analysis/vehicle/$vehicleId/latest")
                
                val connection = url.openConnection() as HttpURLConnection
                connection.requestMethod = "GET"
                connection.setRequestProperty("Content-Type", "application/json")
                connection.setRequestProperty("Authorization", "Bearer $token")
                
                val responseCode = connection.responseCode
                
                if (responseCode == HttpURLConnection.HTTP_OK) {
                    val response = connection.inputStream.bufferedReader().use { it.readText() }
                    val jsonResponse = JSONObject(response)
                    
                    if (jsonResponse.has("analysis")) {
                        val analysisJson = jsonResponse.getJSONObject("analysis")
                        val analysis = VehicleAnalysis(
                            id = analysisJson.optInt("id", 0),
                            vehicleId = analysisJson.optString("vehicle_id", ""),
                            engineHealth = analysisJson.optInt("engine_health", 0),
                            oilHealth = analysisJson.optInt("oil_health", 0),
                            tiresHealth = analysisJson.optInt("tires_health", 0),
                            brakesHealth = analysisJson.optInt("brakes_health", 0),
                            createdAt = analysisJson.optString("created_at", "")
                        )
                        
                        _analysisData.value = analysis
                        generateRecommendations(analysis)
                        _hasNewNotifications.value = true
                    }
                } else {
                    val errorResponse = connection.errorStream?.bufferedReader()?.use { it.readText() } ?: "Unknown error"
                    _errorMessage.value = "Ошибка: $responseCode - $errorResponse"
                }
            } catch (e: Exception) {
                Log.e("VehicleAnalysis", "Error fetching analysis: ${e.message}", e)
                _errorMessage.value = "Ошибка: ${e.message}"
            } finally {
                _isLoading.value = false
            }
        }
    }
    
    /**
     * Request a new analysis from the server
     */
    fun requestAnalysis() {
        val token = context.getSharedPreferences("prefs", Context.MODE_PRIVATE).getString("jwt_token", null)
        if (token == null) {
            _errorMessage.value = "Требуется авторизация"
            return
        }
        
        _isLoading.value = true
        _errorMessage.value = null
        
        CoroutineScope(Dispatchers.IO).launch {
            try {
                // Get the vehicle ID from preferences
                val vehicleId = context.getSharedPreferences("prefs", Context.MODE_PRIVATE).getString("vehicle_id", null)
                if (vehicleId == null) {
                    _errorMessage.value = "Не найден ID автомобиля"
                    _isLoading.value = false
                    return@launch
                }
                
                // Get the API base URL or use default
                val serverUrl = try {
                    context.getString(context.resources.getIdentifier("api_base_url", "string", context.packageName))
                } catch (e: Exception) {
                    DEFAULT_API_BASE_URL
                }
                
                val url = URL("$serverUrl/analysis/vehicle/$vehicleId/analyze")
                
                val connection = url.openConnection() as HttpURLConnection
                connection.requestMethod = "POST"
                connection.setRequestProperty("Content-Type", "application/json")
                connection.setRequestProperty("Authorization", "Bearer $token")
                connection.doOutput = true
                
                // Send empty POST request body
                connection.outputStream.bufferedWriter().use { it.write("{}") }
                
                val responseCode = connection.responseCode
                
                if (responseCode == HttpURLConnection.HTTP_OK) {
                    val response = connection.inputStream.bufferedReader().use { it.readText() }
                    val jsonResponse = JSONObject(response)
                    
                    if (jsonResponse.has("results")) {
                        // Fetch the latest analysis to update the UI
                        fetchLatestAnalysis()
                    } else {
                        _errorMessage.value = "Сервер вернул неожиданный ответ"
                    }
                } else {
                    val errorResponse = connection.errorStream?.bufferedReader()?.use { it.readText() } ?: "Unknown error"
                    _errorMessage.value = "Ошибка: $responseCode - $errorResponse"
                }
            } catch (e: Exception) {
                Log.e("VehicleAnalysis", "Error requesting analysis: ${e.message}", e)
                _errorMessage.value = "Ошибка: ${e.message}"
            } finally {
                _isLoading.value = false
            }
        }
    }
    
    /**
     * Mark notifications as read
     */
    fun markNotificationsAsRead() {
        _hasNewNotifications.value = false
    }
    
    /**
     * Generate recommendations based on the analysis
     */
    private fun generateRecommendations(analysis: VehicleAnalysis) {
        val recommendations = mutableListOf<String>()
        
        // Engine recommendations
        when {
            analysis.engineHealth < 30 -> {
                recommendations.add("Срочно обратитесь в сервис для диагностики двигателя")
                recommendations.add("Избегайте длительных поездок и высоких нагрузок")
            }
            analysis.engineHealth < 50 -> {
                recommendations.add("Рекомендуется диагностика двигателя при следующем ТО")
                recommendations.add("Следите за температурой двигателя и расходом топлива")
            }
        }
        
        // Oil recommendations
        when {
            analysis.oilHealth < 20 -> {
                recommendations.add("Требуется срочная замена масла")
                recommendations.add("Проверьте на наличие утечек масла")
            }
            analysis.oilHealth < 40 -> {
                recommendations.add("Запланируйте замену масла в ближайшее время")
            }
        }
        
        // Tires recommendations
        when {
            analysis.tiresHealth < 20 -> {
                recommendations.add("Срочная замена или проверка давления в шинах")
                recommendations.add("Проверьте шины на наличие повреждений или износа")
            }
            analysis.tiresHealth < 40 -> {
                recommendations.add("Проверьте давление в шинах и их состояние")
                recommendations.add("При следующем ТО рекомендуется балансировка колес")
            }
        }
        
        // Brakes recommendations
        when {
            analysis.brakesHealth < 15 -> {
                recommendations.add("Срочная диагностика тормозной системы")
                recommendations.add("Возможно требуется замена тормозных колодок или дисков")
            }
            analysis.brakesHealth < 40 -> {
                recommendations.add("Проверьте состояние тормозных колодок при следующем ТО")
            }
        }
        
        _recommendations.value = recommendations
    }
}

/**
 * Data class for vehicle analysis data
 */
data class VehicleAnalysis(
    val id: Int,
    val vehicleId: String,
    val engineHealth: Int,
    val oilHealth: Int,
    val tiresHealth: Int,
    val brakesHealth: Int,
    val createdAt: String
) {
    val overallHealth: Int
        get() = (engineHealth + oilHealth + tiresHealth + brakesHealth) / 4
    
    val engineStatus: String
        get() = when {
            engineHealth < 30 -> "Критическое"
            engineHealth < 50 -> "Требует внимания"
            else -> "Нормальное"
        }
    
    val oilStatus: String
        get() = when {
            oilHealth < 20 -> "Критическое"
            oilHealth < 40 -> "Требует внимания"
            else -> "Нормальное"
        }
    
    val tiresStatus: String
        get() = when {
            tiresHealth < 20 -> "Критическое"
            tiresHealth < 40 -> "Требует внимания"
            else -> "Нормальное"
        }
    
    val brakesStatus: String
        get() = when {
            brakesHealth < 15 -> "Критическое"
            brakesHealth < 40 -> "Требует внимания"
            else -> "Нормальное"
        }
    
    val overallStatus: String
        get() = when {
            overallHealth < 30 -> "Критическое"
            overallHealth < 50 -> "Требует внимания"
            else -> "Нормальное"
        }
} 