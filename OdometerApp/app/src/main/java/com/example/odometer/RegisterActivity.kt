package com.example.odometer

import android.content.Intent
import android.os.Bundle
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity
import androidx.compose.foundation.layout.*
import androidx.compose.material3.Button
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.material3.TextField
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.ComposeView
import androidx.compose.ui.unit.dp
import androidx.compose.ui.text.input.PasswordVisualTransformation
import com.example.odometer.api.ApiService
import com.example.odometer.data.AuthResponse
import com.example.odometer.data.RegisterRequest
import com.example.odometerapp.R
import retrofit2.Call
import retrofit2.Callback
import retrofit2.Response
import androidx.compose.material3.Surface
import androidx.compose.ui.graphics.Color

class RegisterActivity : AppCompatActivity() {
    @OptIn(ExperimentalMaterial3Api::class)
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_register)

        findViewById<ComposeView>(R.id.compose_view).setContent {
            var email by remember { mutableStateOf("") }
            var username by remember { mutableStateOf("") }
            var password by remember { mutableStateOf("") }
            var confirmPassword by remember { mutableStateOf("") }
            var vin by remember { mutableStateOf("") }
            var error by remember { mutableStateOf("") }
            var isLoading by remember { mutableStateOf(false) }

            Surface(
                modifier = Modifier.fillMaxSize(),
                color = MaterialTheme.colorScheme.background
            ) {
                Column(
                    modifier = Modifier
                        .fillMaxSize()
                        .padding(16.dp),
                    horizontalAlignment = Alignment.CenterHorizontally
                ) {
                    Text("Регистрация", style = MaterialTheme.typography.headlineLarge)

                    Spacer(modifier = Modifier.height(16.dp))

                    TextField(
                        value = email,
                        onValueChange = { email = it },
                        label = { Text("Email") },
                        modifier = Modifier.fillMaxWidth()
                    )

                    Spacer(modifier = Modifier.height(8.dp))

                    TextField(
                        value = username,
                        onValueChange = { username = it },
                        label = { Text("Имя пользователя") },
                        modifier = Modifier.fillMaxWidth()
                    )

                    Spacer(modifier = Modifier.height(8.dp))

                    TextField(
                        value = password,
                        onValueChange = { password = it },
                        label = { Text("Пароль") },
                        visualTransformation = PasswordVisualTransformation(),
                        modifier = Modifier.fillMaxWidth()
                    )

                    Spacer(modifier = Modifier.height(8.dp))

                    TextField(
                        value = confirmPassword,
                        onValueChange = { confirmPassword = it },
                        label = { Text("Подтвердите пароль") },
                        visualTransformation = PasswordVisualTransformation(),
                        modifier = Modifier.fillMaxWidth()
                    )

                    Spacer(modifier = Modifier.height(8.dp))

                    TextField(
                        value = vin,
                        onValueChange = { vin = it.uppercase() },
                        label = { Text("VIN автомобиля") },
                        modifier = Modifier.fillMaxWidth()
                    )

                    if (error.isNotEmpty()) {
                        Spacer(modifier = Modifier.height(8.dp))
                        Text(error, color = MaterialTheme.colorScheme.error)
                    }

                    Spacer(modifier = Modifier.height(16.dp))

                    Button(
                        onClick = {
                            if (validateInputs(email, password, confirmPassword, vin, username)) {
                                isLoading = true
                                error = ""
                                
                                val registerRequest = RegisterRequest(email, password, vin, username)
                                ApiService.authApi.register(registerRequest)
                                    .enqueue(object : Callback<AuthResponse> {
                                        override fun onResponse(call: Call<AuthResponse>, response: Response<AuthResponse>) {
                                            isLoading = false
                                            if (response.isSuccessful) {
                                                val token = response.body()?.token
                                                if (token != null) {
                                                    // Сохраняем токен в SharedPreferences
                                                    getSharedPreferences("prefs", MODE_PRIVATE).edit()
                                                        .putString("jwt_token", token)
                                                        .apply()
                                                        
                                                    // Сохраняем VIN в sensor_prefs для использования в рекомендациях
                                                    getSharedPreferences("sensor_prefs", MODE_PRIVATE).edit()
                                                        .putString("vehicle_id", vin)
                                                        .apply()
                                                        
                                                    // Переходим на главный экран
                                                    startActivity(Intent(this@RegisterActivity, MainActivity::class.java))
                                                    finish()
                                                } else {
                                                    error = "Пустой токен получен"
                                                }
                                            } else {
                                                error = "Ошибка регистрации: ${response.code()}"
                                            }
                                        }

                                        override fun onFailure(call: Call<AuthResponse>, t: Throwable) {
                                            isLoading = false
                                            error = "Ошибка сети: ${t.localizedMessage}"
                                        }
                                    })
                            }
                        },
                        enabled = !isLoading,
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Text("Зарегистрироваться")
                    }
                    
                    Spacer(modifier = Modifier.height(8.dp))

                    Button(
                        onClick = {
                            startActivity(Intent(this@RegisterActivity, LoginActivity::class.java))
                            finish()
                        },
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Text("Уже есть аккаунт? Войти")
                    }
                }
            }
        }
    }

    private fun validateInputs(email: String, password: String, confirmPassword: String, vin: String, username: String): Boolean {
        if (email.isEmpty() || !android.util.Patterns.EMAIL_ADDRESS.matcher(email).matches()) {
            Toast.makeText(this, "Введите корректный email", Toast.LENGTH_SHORT).show()
            return false
        }

        if (username.isEmpty()) {
            Toast.makeText(this, "Введите имя пользователя", Toast.LENGTH_SHORT).show()
            return false
        }

        if (password.isEmpty() || password.length < 6) {
            Toast.makeText(this, "Пароль должен содержать минимум 6 символов", Toast.LENGTH_SHORT).show()
            return false
        }

        if (password != confirmPassword) {
            Toast.makeText(this, "Пароли не совпадают", Toast.LENGTH_SHORT).show()
            return false
        }

        if (vin.isEmpty() || vin.length != 17) {
            Toast.makeText(this, "VIN должен содержать 17 символов", Toast.LENGTH_SHORT).show()
            return false
        }

        return true
    }
} 