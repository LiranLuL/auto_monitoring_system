package com.example.odometerapp.api

import android.util.Log
import okhttp3.OkHttpClient
import okhttp3.logging.HttpLoggingInterceptor
import retrofit2.Retrofit
import retrofit2.converter.gson.GsonConverterFactory
import java.util.concurrent.TimeUnit
import com.google.gson.GsonBuilder
import okhttp3.MediaType.Companion.toMediaType
import java.nio.charset.Charset
import okhttp3.ResponseBody
import okhttp3.ResponseBody.Companion.toResponseBody
import okio.Buffer

object ApiClient {
    private const val TAG = "ApiClient"
    private const val BASE_URL = "http://192.168.0.121:5001/api/"

    private val loggingInterceptor = HttpLoggingInterceptor { message ->
        Log.d(TAG, message)
    }.apply {
        level = HttpLoggingInterceptor.Level.BODY
    }

    private val gson = GsonBuilder()
        .setLenient()
        .create()

    private val okHttpClient = OkHttpClient.Builder()
        .addInterceptor(loggingInterceptor)
        .addInterceptor { chain ->
            val request = chain.request()
            val response = chain.proceed(request)
            
            // Проверяем, что ответ содержит JSON
            if (response.header("Content-Type")?.contains("application/json") == true) {
                val contentType = "application/json; charset=utf-8".toMediaType()
                val body = response.body
                val source = body?.source()
                source?.request(Long.MAX_VALUE)
                val buffer = source?.buffer
                val charset = Charset.forName("UTF-8")
                
                if (buffer != null) {
                    val json = buffer.clone().readString(charset)
                    val responseBody = json.toResponseBody(contentType)
                    return@addInterceptor response.newBuilder()
                        .body(responseBody)
                        .build()
                }
            }
            response
        }
        .connectTimeout(30, TimeUnit.SECONDS)
        .readTimeout(30, TimeUnit.SECONDS)
        .writeTimeout(30, TimeUnit.SECONDS)
        .build()

    private val retrofit = Retrofit.Builder()
        .baseUrl(BASE_URL)
        .client(okHttpClient)
        .addConverterFactory(GsonConverterFactory.create(gson))
        .build()

    val apiService: ApiService = retrofit.create(ApiService::class.java)
}