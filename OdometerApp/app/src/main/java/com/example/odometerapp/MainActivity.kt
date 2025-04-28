package com.example.odometerapp

import android.content.Context
import android.content.Intent
import android.os.Bundle
import android.widget.Button
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity
import com.example.odometerapp.ui.RecommendationsActivity

class MainActivity : AppCompatActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_main)

        setupButtons()
    }
    
    private fun setupButtons() {
        // Button to connect to Bluetooth device
        val btnConnectDevice = findViewById<Button>(R.id.btnConnectDevice)
        btnConnectDevice.setOnClickListener {
            val intent = Intent(this, BluetoothDeviceSelectionActivity::class.java)
            startActivity(intent)
        }
        
        // Button to view recommendations
        val btnViewRecommendations = findViewById<Button>(R.id.btnViewRecommendations)
        btnViewRecommendations.setOnClickListener {
            // Получаем VIN из SharedPreferences
            val sharedPreferences = getSharedPreferences("sensor_prefs", Context.MODE_PRIVATE)
            val vehicleId = sharedPreferences.getString("vehicle_id", "DEFAULT_VIN")
            
            val intent = Intent(this, RecommendationsActivity::class.java)
            intent.putExtra("VEHICLE_ID", vehicleId)
            startActivity(intent)
        }
    }
} 