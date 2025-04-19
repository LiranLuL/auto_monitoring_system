package com.example.odometer

import android.Manifest
import android.bluetooth.BluetoothAdapter
import android.bluetooth.BluetoothDevice
import android.bluetooth.BluetoothManager
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.content.pm.PackageManager
import android.os.Build
import android.os.Bundle
import android.util.Log
import android.widget.ArrayAdapter
import android.widget.ListView
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity
import androidx.core.app.ActivityCompat
import androidx.core.content.ContextCompat

class BluetoothSelection : AppCompatActivity() {
    private var bluetoothAdapter: BluetoothAdapter? = null
    private lateinit var deviceList: ListView
    private lateinit var deviceListAdapter: ArrayAdapter<String>
    private val deviceListItems = ArrayList<String>()
    private val discoveredDevices = ArrayList<BluetoothDevice>()
    private var receiver: BroadcastReceiver? = null
    private var isFinishing = false

    companion object {
        private const val REQUEST_ENABLE_BT = 1
        private const val REQUEST_PERMISSIONS = 2
        private const val TAG = "BluetoothSelection"
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        Log.d(TAG, "onCreate: Starting activity")
        
        // Проверяем токен для диагностики
        var token = getSharedPreferences("prefs", Context.MODE_PRIVATE).getString("jwt_token", null)
        Log.d(TAG, "JWT token exists in SharedPreferences: ${token != null}")
        
        // Если токена нет в SharedPreferences, пытаемся получить его из Intent
        if (token == null) {
            token = intent.getStringExtra("token")
            Log.d(TAG, "JWT token from intent: ${token != null}")
            
            // Если получили токен из Intent, сохраняем его в SharedPreferences
            if (token != null) {
                getSharedPreferences("prefs", Context.MODE_PRIVATE).edit().putString("jwt_token", token).apply()
                Log.d(TAG, "Saved token from intent to SharedPreferences")
            }
        }
        
        try {
            setContentView(com.example.odometerapp.R.layout.activity_bluetooth_device_selection)
            Log.d(TAG, "Layout set successfully")
            
            // Включаем кнопку "Назад" в ActionBar
            supportActionBar?.setDisplayHomeAsUpEnabled(true)
            supportActionBar?.title = "Выбор Bluetooth устройства"
            
            setupDeviceList()
            setupBluetoothAdapter()
        } catch (e: Exception) {
            Log.e(TAG, "Error in onCreate: ${e.message}", e)
            Toast.makeText(this, "Ошибка инициализации: ${e.message}", Toast.LENGTH_LONG).show()
            // Не закрываем активность при ошибке, чтобы пользователь мог видеть сообщение
        }
    }

    private fun setupDeviceList() {
        try {
            deviceList = findViewById(com.example.odometerapp.R.id.deviceList)
            deviceListAdapter = ArrayAdapter(this, android.R.layout.simple_list_item_1, deviceListItems)
            deviceList.adapter = deviceListAdapter
            
            deviceList.setOnItemClickListener { _, _, position, _ ->
                if (position < discoveredDevices.size) {
                    val selectedDevice = discoveredDevices[position]
                    Toast.makeText(this, "Выбрано устройство: ${selectedDevice.name ?: "Неизвестное устройство"}", Toast.LENGTH_SHORT).show()
                    // Здесь можно добавить логику для использования выбранного устройства
                    // Не закрываем активность после выбора
                }
            }
            
            Log.d(TAG, "ListView setup complete")
        } catch (e: Exception) {
            Log.e(TAG, "Error setting up device list: ${e.message}", e)
            Toast.makeText(this, "Ошибка настройки списка: ${e.message}", Toast.LENGTH_LONG).show()
        }
    }
    
    private fun setupBluetoothAdapter() {
        try {
            val bluetoothManager = getSystemService(Context.BLUETOOTH_SERVICE) as BluetoothManager
            bluetoothAdapter = bluetoothManager.adapter
            Log.d(TAG, "Bluetooth adapter: ${bluetoothAdapter != null}")

            if (bluetoothAdapter == null) {
                Toast.makeText(this, "Устройство не поддерживает Bluetooth", Toast.LENGTH_LONG).show()
                // Не закрываем активность, показываем пустой список
                deviceListItems.add("Bluetooth не поддерживается на этом устройстве")
                deviceListAdapter.notifyDataSetChanged()
            } else {
                checkPermissionsAndStartDiscovery()
            }
        } catch (e: Exception) {
            Log.e(TAG, "Error setting up Bluetooth adapter: ${e.message}", e)
            Toast.makeText(this, "Ошибка Bluetooth: ${e.message}", Toast.LENGTH_LONG).show()
            // Показываем сообщение об ошибке в списке
            deviceListItems.add("Ошибка Bluetooth: ${e.message}")
            deviceListAdapter.notifyDataSetChanged()
        }
    }

    private fun checkPermissionsAndStartDiscovery() {
        try {
            val permissions = mutableListOf(
                Manifest.permission.BLUETOOTH_ADMIN,
                Manifest.permission.ACCESS_FINE_LOCATION,
                Manifest.permission.ACCESS_COARSE_LOCATION
            )
            
            // Добавляем новые разрешения только для Android 12 и выше
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                permissions.add(Manifest.permission.BLUETOOTH_SCAN)
                permissions.add(Manifest.permission.BLUETOOTH_CONNECT)
            }

            val permissionsToRequest = permissions.filter {
                ContextCompat.checkSelfPermission(this, it) != PackageManager.PERMISSION_GRANTED
            }.toTypedArray()

            if (permissionsToRequest.isNotEmpty()) {
                Log.d(TAG, "Requesting permissions: ${permissionsToRequest.joinToString()}")
                ActivityCompat.requestPermissions(this, permissionsToRequest, REQUEST_PERMISSIONS)
            } else {
                Log.d(TAG, "All permissions granted, starting discovery")
                startBluetoothDiscovery()
            }
        } catch (e: Exception) {
            Log.e(TAG, "Error checking permissions: ${e.message}", e)
            Toast.makeText(this, "Ошибка проверки разрешений: ${e.message}", Toast.LENGTH_LONG).show()
            // Показываем сообщение об ошибке в списке
            deviceListItems.add("Ошибка разрешений: ${e.message}")
            deviceListAdapter.notifyDataSetChanged()
        }
    }

    private fun startBluetoothDiscovery() {
        try {
            bluetoothAdapter?.let { adapter ->
                Log.d(TAG, "Bluetooth enabled: ${adapter.isEnabled}")
                if (adapter.isEnabled) {
                    // Показываем сообщение о начале поиска в списке
                    deviceListItems.clear()
                    deviceListItems.add("Поиск устройств...")
                    deviceListAdapter.notifyDataSetChanged()
                    
                    if (isBluetoothScanPermissionGranted()) {
                        setupBluetoothDiscovery(adapter)
                    }
                } else {
                    Log.d(TAG, "Bluetooth not enabled, requesting to enable")
                    val enableBtIntent = Intent(BluetoothAdapter.ACTION_REQUEST_ENABLE)
                    startActivityForResult(enableBtIntent, REQUEST_ENABLE_BT)
                }
            }
        } catch (e: Exception) {
            Log.e(TAG, "Error starting discovery: ${e.message}", e)
            Toast.makeText(this, "Ошибка запуска поиска: ${e.message}", Toast.LENGTH_LONG).show()
            // Показываем сообщение об ошибке в списке
            deviceListItems.clear()
            deviceListItems.add("Ошибка запуска поиска: ${e.message}")
            deviceListAdapter.notifyDataSetChanged()
        }
    }
    
    private fun isBluetoothScanPermissionGranted(): Boolean {
        return if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            ActivityCompat.checkSelfPermission(this, Manifest.permission.BLUETOOTH_SCAN) == PackageManager.PERMISSION_GRANTED
        } else {
            ActivityCompat.checkSelfPermission(this, Manifest.permission.BLUETOOTH_ADMIN) == PackageManager.PERMISSION_GRANTED &&
            ActivityCompat.checkSelfPermission(this, Manifest.permission.ACCESS_FINE_LOCATION) == PackageManager.PERMISSION_GRANTED
        }
    }
    
    private fun setupBluetoothDiscovery(adapter: BluetoothAdapter) {
        try {
            // Отменяем текущий поиск, если он уже запущен
            if (isBluetoothScanPermissionGranted() && adapter.isDiscovering) {
                adapter.cancelDiscovery()
            }
            
            receiver = object : BroadcastReceiver() {
                override fun onReceive(context: Context, intent: Intent) {
                    when(intent.action) {
                        BluetoothDevice.ACTION_FOUND -> {
                            if (deviceListItems.size == 1 && deviceListItems[0] == "Поиск устройств...") {
                                deviceListItems.clear()
                            }
                            
                            val device: BluetoothDevice? = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
                                intent.getParcelableExtra(BluetoothDevice.EXTRA_DEVICE, BluetoothDevice::class.java)
                            } else {
                                @Suppress("DEPRECATION")
                                intent.getParcelableExtra(BluetoothDevice.EXTRA_DEVICE)
                            }
                            
                            Log.d(TAG, "Device found: ${device?.name ?: "Unknown"} - ${device?.address}")
                            device?.let {
                                if (!discoveredDevices.contains(it)) {
                                    discoveredDevices.add(it)
                                    val deviceName = it.name ?: "Неизвестное устройство"
                                    val deviceAddress = it.address
                                    deviceListItems.add("$deviceName\n$deviceAddress")
                                    deviceListAdapter.notifyDataSetChanged()
                                }
                            }
                        }
                        BluetoothAdapter.ACTION_DISCOVERY_FINISHED -> {
                            Log.d(TAG, "Discovery finished")
                            if (deviceListItems.isEmpty()) {
                                deviceListItems.add("Устройства не найдены")
                                deviceListAdapter.notifyDataSetChanged()
                            }
                            Toast.makeText(context, "Поиск завершен", Toast.LENGTH_SHORT).show()
                        }
                    }
                }
            }

            val filter = IntentFilter(BluetoothDevice.ACTION_FOUND)
            val filter2 = IntentFilter(BluetoothAdapter.ACTION_DISCOVERY_FINISHED)
            registerReceiver(receiver, filter)
            registerReceiver(receiver, filter2)

            if (isBluetoothScanPermissionGranted()) {
                adapter.startDiscovery()
                Log.d(TAG, "Started discovery")
            } else {
                deviceListItems.clear()
                deviceListItems.add("Нет разрешений для поиска Bluetooth устройств")
                deviceListAdapter.notifyDataSetChanged()
            }
            
            Toast.makeText(this, "Поиск устройств...", Toast.LENGTH_SHORT).show()
        } catch (e: Exception) {
            Log.e(TAG, "Error setting up discovery: ${e.message}", e)
            deviceListItems.clear()
            deviceListItems.add("Ошибка настройки поиска: ${e.message}")
            deviceListAdapter.notifyDataSetChanged()
        }
    }

    override fun onRequestPermissionsResult(
        requestCode: Int,
        permissions: Array<out String>,
        grantResults: IntArray
    ) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults)
        try {
            if (requestCode == REQUEST_PERMISSIONS) {
                if (grantResults.isNotEmpty() && grantResults.all { it == PackageManager.PERMISSION_GRANTED }) {
                    Log.d(TAG, "All permissions granted")
                    startBluetoothDiscovery()
                } else {
                    Log.d(TAG, "Some permissions denied")
                    Toast.makeText(this, "Необходимы разрешения для поиска Bluetooth устройств", Toast.LENGTH_SHORT).show()
                    // Показываем сообщение об отсутствии разрешений в списке
                    deviceListItems.clear()
                    deviceListItems.add("Отсутствуют необходимые разрешения для поиска устройств")
                    deviceListAdapter.notifyDataSetChanged()
                }
            }
        } catch (e: Exception) {
            Log.e(TAG, "Error in permission result: ${e.message}", e)
        }
    }

    override fun onActivityResult(requestCode: Int, resultCode: Int, data: Intent?) {
        super.onActivityResult(requestCode, resultCode, data)
        try {
            Log.d(TAG, "onActivityResult: request=$requestCode, result=$resultCode")
            if (requestCode == REQUEST_ENABLE_BT) {
                if (resultCode == RESULT_OK) {
                    startBluetoothDiscovery()
                } else {
                    Toast.makeText(this, "Для поиска устройств необходимо включить Bluetooth", Toast.LENGTH_SHORT).show()
                    // Показываем сообщение о необходимости включения Bluetooth в списке
                    deviceListItems.clear()
                    deviceListItems.add("Bluetooth не включен")
                    deviceListAdapter.notifyDataSetChanged()
                }
            }
        } catch (e: Exception) {
            Log.e(TAG, "Error in activity result: ${e.message}", e)
        }
    }

    override fun onDestroy() {
        try {
            Log.d(TAG, "onDestroy")
            try {
                receiver?.let { unregisterReceiver(it) }
            } catch (e: Exception) {
                Log.e(TAG, "Error unregistering receiver: ${e.message}")
            }
            
            try {
                bluetoothAdapter?.let { adapter ->
                    if (isBluetoothScanPermissionGranted() && adapter.isDiscovering) {
                        adapter.cancelDiscovery()
                        Log.d(TAG, "Discovery cancelled")
                    }
                }
            } catch (e: Exception) {
                Log.e(TAG, "Error cancelling discovery: ${e.message}")
            }
        } catch (e: Exception) {
            Log.e(TAG, "Error in onDestroy: ${e.message}", e)
        } finally {
            super.onDestroy()
        }
    }

    override fun onSupportNavigateUp(): Boolean {
        onBackPressed()
        return true
    }
    
    @Deprecated("Deprecated in Java")
    override fun onBackPressed() {
        Log.d(TAG, "onBackPressed called")
        super.onBackPressed()
    }
} 