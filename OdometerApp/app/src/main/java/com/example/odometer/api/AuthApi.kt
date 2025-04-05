package com.example.odometer.api

import com.example.odometer.data.AuthResponse
import com.example.odometer.data.LoginRequest
import com.example.odometer.data.RegisterRequest
import retrofit2.Call
import retrofit2.http.Body
import retrofit2.http.POST

interface AuthApi {
    @POST("/auth/login")
    fun login(@Body request: LoginRequest): Call<AuthResponse>

    @POST("/auth/register")
    fun register(@Body request: RegisterRequest): Call<AuthResponse>
} 