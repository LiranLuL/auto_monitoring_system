package com.example.odometerapp.api

import retrofit2.Response
import retrofit2.http.*

interface ApiService {
    @GET("vehicles/vin/{vin}/sensor-token")
    suspend fun getSensorTokenByVin(@Path("vin") vin: String): Response<TokenResponse>

    @POST("elm327-data")
    @Headers("Content-Type: application/json")
    suspend fun sendSensorData(
        @Header("X-Sensor-Token") token: String,
        @Body data: SensorData
    ): Response<SensorResponse>
}

data class TokenResponse(
    val token: String
)

data class SensorResponse(
    val sensorData: SensorData,
    val healthData: HealthData
)

data class SensorData(
    val rpm: Int,
    val engineTemp: Double,
    val oilPressure: Double,
    val tirePressure: Double,
    val brakePadWear: Double
)

data class HealthData(
    val engineHealth: Double,
    val oilHealth: Double,
    val tiresHealth: Double,
    val brakesHealth: Double
)