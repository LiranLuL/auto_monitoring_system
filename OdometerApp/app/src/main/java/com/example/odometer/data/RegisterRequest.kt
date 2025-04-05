package com.example.odometer.data

data class RegisterRequest(
    val email: String,
    val password: String,
    val vin: String,
    val username: String
) 