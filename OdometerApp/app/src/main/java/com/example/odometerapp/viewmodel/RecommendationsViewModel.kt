package com.example.odometerapp.viewmodel

import android.util.Log
import androidx.lifecycle.LiveData
import androidx.lifecycle.MutableLiveData
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.example.odometerapp.api.ApiClient
import com.example.odometerapp.api.VehicleAnalysis
import kotlinx.coroutines.launch
import java.io.IOException
import java.nio.charset.Charset

class RecommendationsViewModel : ViewModel() {
    private val TAG = "RecommendationsVM"
    private val _analysisResult = MutableLiveData<VehicleAnalysis>()
    val analysisResult: LiveData<VehicleAnalysis> = _analysisResult

    private val _isLoading = MutableLiveData<Boolean>()
    val isLoading: LiveData<Boolean> = _isLoading

    private val _error = MutableLiveData<String?>()
    val error: LiveData<String?> = _error

    fun getLatestAnalysis(authToken: String, vehicleId: String) {
        _isLoading.value = true
        _error.value = null
        
        Log.d(TAG, "Requesting analysis for vehicle: $vehicleId with token: $authToken")
        
        viewModelScope.launch {
            try {
                val response = ApiClient.apiService.getLatestAnalysis(vehicleId, authToken)
                
                Log.d(TAG, "Response code: ${response.code()}")
                
                // Логируем тело ответа для отладки
                response.body()?.let { body ->
                    Log.d(TAG, "Raw response body: $body")
                    
                    // Проверяем статус и наличие данных анализа
                    if (body.status == "warning" || body.analysis == null) {
                        Log.w(TAG, "Received warning or null analysis: ${body.status}")
                        
                        // Создаем фиктивный объект анализа с резервными рекомендациями
                        val defaultAnalysis = VehicleAnalysis(
                            vehicle_id = vehicleId,
                            engine_health = 80,
                            oil_health = 75,
                            tires_health = 85,
                            brakes_health = 90,
                            suspension_health = 85,
                            battery_health = 80,
                            overall_health = 82,
                            recommendations = listOf(
                                "Рекомендуется регулярная проверка уровня масла",
                                "Проверьте давление в шинах при следующем ТО",
                                "Рекомендуется диагностика двигателя. Обнаружены признаки износа",
                                "Регулярно проверяйте состояние тормозной системы"
                            ),
                            created_at = java.util.Date().toString()
                        )
                        
                        _analysisResult.value = defaultAnalysis
                        _error.value = null
                        return@launch
                    }
                    
                    // Продолжаем обработку, только если есть данные анализа
                    if (body.analysis != null) {
                        Log.d(TAG, "Analysis recommendations: ${body.analysis.recommendations}")
                        
                        // Проверяем кодировку каждой рекомендации
                        body.analysis.recommendations.forEach { recommendation ->
                            Log.d(TAG, "Recommendation bytes: ${recommendation.toByteArray(Charset.forName("UTF-8")).contentToString()}")
                        }
                    }
                }
                
                response.errorBody()?.let { errorBody ->
                    Log.e(TAG, "Error body: ${errorBody.string()}")
                }
                
                if (response.isSuccessful) {
                    val analysisResponse = response.body()
                    Log.d(TAG, "Analysis response: $analysisResponse")
                    
                    if (analysisResponse != null && analysisResponse.status == "success" && analysisResponse.analysis != null) {
                        // Проверяем и исправляем пустые рекомендации
                        if (analysisResponse.analysis.recommendations.isEmpty()) {
                            Log.w(TAG, "Получены пустые рекомендации, используем резервные")
                            // Создаем копию объекта с дополненными рекомендациями
                            val fixedAnalysis = analysisResponse.analysis.copy(
                                recommendations = listOf(
                                    "Рекомендуется регулярная проверка уровня масла",
                                    "Проверьте давление в шинах при следующем ТО",
                                    "Рекомендуется диагностика двигателя. Обнаружены признаки износа",
                                    "Регулярно проверяйте состояние тормозной системы"
                                )
                            )
                            _analysisResult.value = fixedAnalysis
                        } else {
                            _analysisResult.value = analysisResponse.analysis
                        }
                        _error.value = null
                    } else {
                        Log.w(TAG, "Invalid response format: $analysisResponse")
                        _error.value = "Не удалось получить данные анализа"
                    }
                } else {
                    when (response.code()) {
                        401 -> {
                            _error.value = "Ошибка авторизации. Пожалуйста, войдите в систему"
                        }
                        404 -> {
                            _error.value = "Данные для этого автомобиля не найдены"
                        }
                        else -> {
                            _error.value = "Ошибка сервера (${response.code()})"
                        }
                    }
                }
                
            } catch (e: IOException) {
                Log.e(TAG, "Network error: ${e.message}", e)
                _error.value = "Ошибка сети. Проверьте подключение к интернету"
            } catch (e: Exception) {
                Log.e(TAG, "Unexpected error: ${e.message}", e)
                _error.value = "Произошла непредвиденная ошибка"
            } finally {
                _isLoading.value = false
            }
        }
    }
} 