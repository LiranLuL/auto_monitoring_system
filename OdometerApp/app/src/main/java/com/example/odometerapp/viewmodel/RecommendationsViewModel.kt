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
    
    // Flag to control whether to use the emulator endpoint
    private val useEmulator = true

    fun getLatestAnalysis(authToken: String, vehicleId: String) {
        _isLoading.value = true
        _error.value = null
        
        Log.d(TAG, "Requesting analysis for vehicle: $vehicleId with token: $authToken")
        
        viewModelScope.launch {
            try {
                val response = if (useEmulator) {
                    // Using emulator endpoint (no auth required)
                    Log.d(TAG, "Using emulator endpoint")
                    ApiClient.apiService.getEmulatedRecommendations(vehicleId)
                } else {
                    // Using regular endpoint with authentication
                    ApiClient.apiService.getLatestAnalysis(vehicleId, authToken)
                }
                
                Log.d(TAG, "Response code: ${response.code()}")
                
                // Логируем тело ответа для отладки
                response.body()?.let { body ->
                    Log.d(TAG, "Raw response body: $body")
                    
                    // Проверяем кодировку каждой рекомендации, если они есть
                    body.analysis?.recommendations?.forEach { recommendation ->
                        Log.d(TAG, "Recommendation bytes: ${recommendation.toByteArray(Charset.forName("UTF-8")).contentToString()}")
                    }
                }
                
                response.errorBody()?.let { errorBody ->
                    Log.e(TAG, "Error body: ${errorBody.string()}")
                }
                
                if (response.isSuccessful) {
                    val analysisResponse = response.body()
                    Log.d(TAG, "Analysis response: $analysisResponse")
                    
                    // Check for successful status and non-null analysis data
                    if (analysisResponse != null && analysisResponse.status == "success" && analysisResponse.analysis != null) {
                        // Analysis data is valid, pass it to the observer
                        _analysisResult.value = analysisResponse.analysis
                        _error.value = null
                    } else {
                        // Handle cases where status is not 'success', or analysis is null, or response format is unexpected
                        val errorMsg = analysisResponse ?: "Invalid response format or missing analysis data."
                        Log.w(TAG, "Analysis fetch failed or invalid: Status=${analysisResponse?.status}, Message='$errorMsg'")
                        _error.value = "Не удалось получить данные анализа: $errorMsg"
                        _analysisResult.value = null // Clear previous results if any
                    }
                } else {
                    // Handle non-2xx responses
                    val errorMsg = response.errorBody()?.string() ?: "Unknown error"
                    Log.e(TAG, "API Error Response (${response.code()}): $errorMsg")
                    when (response.code()) {
                        401 -> _error.value = "Ошибка авторизации. Пожалуйста, войдите в систему"
                        404 -> _error.value = "Данные для этого автомобиля не найдены"
                        500 -> _error.value = "Внутренняя ошибка сервера при получении анализа." // More specific message for 500
                        else -> _error.value = "Ошибка сервера (${response.code()})"
                    }
                     _analysisResult.value = null // Clear previous results if any
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