package com.example.odometerapp

import android.content.Intent
import android.os.Bundle
import android.widget.Button
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity

class MainActivity : AppCompatActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_main)

        // Закомментируем код, вызывающий ошибку, т.к. эта Activity
        // вероятно, больше не используется как основной экран
        /*
        val btnStartCollection = findViewById<Button>(R.id.btnStartCollection)
        btnStartCollection.setOnClickListener {
            Toast.makeText(this, "Начало сбора данных...", Toast.LENGTH_SHORT).show()
        }
        */

        // Логика для кнопки Bluetooth удалена, т.к. она теперь в VinActivity
    }
} 