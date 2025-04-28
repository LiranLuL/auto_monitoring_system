package com.example.odometer

import android.content.Intent
import android.os.Bundle
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
import com.example.odometer.data.LoginRequest
import com.example.odometerapp.R
import retrofit2.Call
import retrofit2.Callback
import retrofit2.Response
import androidx.compose.material3.Surface
import androidx.compose.ui.graphics.Color

class LoginActivity : AppCompatActivity() {
    @OptIn(ExperimentalMaterial3Api::class)
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_login)

        findViewById<ComposeView>(R.id.compose_view).setContent {
            var email by remember { mutableStateOf("") }
            var username by remember { mutableStateOf("") }
            var password by remember { mutableStateOf("") }
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
                    Text("Вход", style = MaterialTheme.typography.headlineLarge)

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

                    if (error.isNotEmpty()) {
                        Spacer(modifier = Modifier.height(8.dp))
                        Text(error, color = MaterialTheme.colorScheme.error)
                    }

                    Spacer(modifier = Modifier.height(16.dp))

                    Button(
                        onClick = {
                            isLoading = true
                            error = ""
                            val loginRequest = LoginRequest(email, password, username)
                            ApiService.authApi.login(loginRequest)
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
                                                // Переходим на главный экран
                                                startActivity(Intent(this@LoginActivity, MainActivity::class.java))
                                                finish()
                                            } else {
                                                error = "Получен пустой токен"
                                            }
                                        } else {
                                            error = "Ошибка входа: ${response.code()}"
                                        }
                                    }

                                    override fun onFailure(call: Call<AuthResponse>, t: Throwable) {
                                        isLoading = false
                                        error = "Ошибка сети: ${t.localizedMessage}"
                                    }
                                })
                        },
                        enabled = !isLoading,
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Text("Войти")
                    }
                    
                    Spacer(modifier = Modifier.height(8.dp))
                    
                    Button(
                        onClick = {
                            startActivity(Intent(this@LoginActivity, RegisterActivity::class.java))
                        },
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Text("Регистрация")
                    }
                }
            }
        }
    }
} 