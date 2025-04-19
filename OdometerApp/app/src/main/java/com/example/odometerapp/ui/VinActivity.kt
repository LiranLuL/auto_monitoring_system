package com.example.odometerapp.ui

import android.os.Bundle
import android.view.View
import android.widget.Toast
import androidx.activity.viewModels
import androidx.appcompat.app.AppCompatActivity
import com.example.odometerapp.databinding.ActivityVinBinding
import com.example.odometerapp.viewmodel.VinViewModel

class VinActivity : AppCompatActivity() {
    private lateinit var binding: ActivityVinBinding
    private val viewModel: VinViewModel by viewModels()

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        binding = ActivityVinBinding.inflate(layoutInflater)
        setContentView(binding.root)

        setupObservers()
        setupListeners()
    }

    private fun setupObservers() {
        viewModel.token.observe(this) { token ->
            if (token != null) {
                // Сохраняем токен в SharedPreferences
                getSharedPreferences("sensor_prefs", MODE_PRIVATE)
                    .edit()
                    .putString("sensor_token", token)
                    .apply()

                Toast.makeText(this, "Токен успешно получен", Toast.LENGTH_SHORT).show()
                
                // Возвращаем просто finish()
                finish()
            }
        }

        viewModel.error.observe(this) { error ->
            if (error != null) {
                Toast.makeText(this, error, Toast.LENGTH_LONG).show()
            }
        }

        viewModel.isLoading.observe(this) { isLoading ->
            binding.progressBar.visibility = if (isLoading) View.VISIBLE else View.GONE
            binding.buttonGetToken.isEnabled = !isLoading
        }
    }

    private fun setupListeners() {
        binding.buttonGetToken.setOnClickListener {
            val vin = binding.editTextVin.text.toString().uppercase()
            
            if (viewModel.validateVin(vin)) {
                viewModel.getTokenByVin(vin)
            } else {
                binding.editTextVin.error = "Неверный формат VIN"
            }
        }

        binding.editTextVin.setOnFocusChangeListener { _, hasFocus ->
            if (!hasFocus) {
                val vin = binding.editTextVin.text.toString()
                if (vin.isNotEmpty() && !viewModel.validateVin(vin)) {
                    binding.editTextVin.error = "Неверный формат VIN"
                }
            }
        }
    }
}