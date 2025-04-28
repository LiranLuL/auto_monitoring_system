package com.example.odometerapp.viewmodel

import androidx.lifecycle.LiveData
import androidx.lifecycle.MutableLiveData
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.example.odometerapp.api.ApiClient
import kotlinx.coroutines.launch

class VinViewModel : ViewModel() {
    private val _token = MutableLiveData<String>()
    val token: LiveData<String> = _token

    private val _error = MutableLiveData<String>()
    val error: LiveData<String> = _error

    private val _isLoading = MutableLiveData<Boolean>()
    val isLoading: LiveData<Boolean> = _isLoading

    fun getTokenByVin(vin: String) {
        viewModelScope.launch {
            try {
                _isLoading.value = true
                val response = ApiClient.apiService.getSensorTokenByVin(vin)
                
                if (response.isSuccessful) {
                    _token.value = response.body()?.token
                } else {
                    _error.value = when (response.code()) {
                        404 -> "Автомобиль с таким VIN не найден"
                        500 -> "Ошибка сервера"
                        else -> "Неизвестная ошибка"
                    }
                }
            } catch (e: Exception) {
                _error.value = "Ошибка сети: ${e.message}"
            } finally {
                _isLoading.value = false
            }
        }
    }

    fun validateVin(vin: String): Boolean {
        return vin.length == 17 && vin.matches(Regex("[A-HJ-NPR-Z0-9]{17}"))
    }
}