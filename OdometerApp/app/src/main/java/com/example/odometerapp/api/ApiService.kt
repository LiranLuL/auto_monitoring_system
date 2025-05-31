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
    
    @GET("analysis/latest/{vehicleId}")
    suspend fun getLatestAnalysis(
        @Path("vehicleId") vehicleId: String,
        @Header("Authorization") authToken: String
    ): Response<AnalysisResponse>
    
    @GET("emulator/recommendations/{vehicleId}")
    suspend fun getEmulatedRecommendations(
        @Path("vehicleId") vehicleId: String
    ): Response<AnalysisResponse>
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

data class AnalysisResponse(
    val status: String,
    val analysis: VehicleAnalysis
)

data class VehicleAnalysis(
    val vehicle_id: String,
    val engine_health: Int,
    val oil_health: Int,
    val tires_health: Int,
    val brakes_health: Int,
    val suspension_health: Int,
    val battery_health: Int,
    val overall_health: Int,
    val recommendations: List<String>,
    val created_at: String
)