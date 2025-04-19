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
import android.os.Bundle
import android.widget.ArrayAdapter
import android.widget.ListView
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity
import androidx.core.app.ActivityCompat
import androidx.core.content.ContextCompat
import com.example.odometerapp.R

class BluetoothDeviceSelectionActivity : AppCompatActivity() {
    private var bluetoothAdapter: BluetoothAdapter? = null
    private lateinit var deviceList: ListView
    private lateinit var deviceListAdapter: ArrayAdapter<String>
    private val deviceListItems = ArrayList<String>()
    private val discoveredDevices = ArrayList<BluetoothDevice>()
    private var receiver: BroadcastReceiver? = null

    companion object {
        private const val REQUEST_ENABLE_BT = 1
        private const val REQUEST_PERMISSIONS = 2
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_bluetooth_device_selection)

        deviceList = findViewById(R.id.deviceList)
        deviceListAdapter = ArrayAdapter(this, android.R.layout.simple_list_item_1, deviceListItems)
        deviceList.adapter = deviceListAdapter

        val bluetoothManager = getSystemService(Context.BLUETOOTH_SERVICE) as BluetoothManager
        bluetoothAdapter = bluetoothManager.adapter

        if (bluetoothAdapter == null) {
            Toast.makeText(this, "Устройство не поддерживает Bluetooth", Toast.LENGTH_LONG).show()
            finish()
            return
        }

        deviceList.setOnItemClickListener { _, _, position, _ ->
            if (position < discoveredDevices.size) {
                val selectedDevice = discoveredDevices[position]
                if (ActivityCompat.checkSelfPermission(
                        this,
                        Manifest.permission.BLUETOOTH_CONNECT
                    ) != PackageManager.PERMISSION_GRANTED
                ) {
                    // TODO: Consider calling
                    //    ActivityCompat#requestPermissions
                    // here to request the missing permissions, and then overriding
                    //   public void onRequestPermissionsResult(int requestCode, String[] permissions,
                    //                                          int[] grantResults)
                    // to handle the case where the user grants the permission. See the documentation
                    // for ActivityCompat#requestPermissions for more details.
                    return@setOnItemClickListener
                }
                Toast.makeText(this, "Выбрано устройство: ${selectedDevice.name ?: "Неизвестное устройство"}", Toast.LENGTH_SHORT).show()
                finish()
            }
        }

        checkPermissionsAndStartDiscovery()
    }

    private fun checkPermissionsAndStartDiscovery() {
        val permissions = arrayOf(
            Manifest.permission.BLUETOOTH_SCAN,
            Manifest.permission.BLUETOOTH_CONNECT,
            Manifest.permission.ACCESS_FINE_LOCATION,
            Manifest.permission.BLUETOOTH_ADMIN
        )

        val permissionsToRequest = permissions.filter {
            ContextCompat.checkSelfPermission(this, it) != PackageManager.PERMISSION_GRANTED
        }.toTypedArray()

        if (permissionsToRequest.isNotEmpty()) {
            ActivityCompat.requestPermissions(this, permissionsToRequest, REQUEST_PERMISSIONS)
        } else {
            startBluetoothDiscovery()
        }
    }

    private fun startBluetoothDiscovery() {
        bluetoothAdapter?.let { adapter ->
            if (adapter.isEnabled) {
                if (ActivityCompat.checkSelfPermission(
                        this,
                        Manifest.permission.BLUETOOTH_SCAN
                    ) == PackageManager.PERMISSION_GRANTED
                ) {
                    receiver = object : BroadcastReceiver() {
                        override fun onReceive(context: Context, intent: Intent) {
                            when(intent.action) {
                                BluetoothDevice.ACTION_FOUND -> {
                                    val device: BluetoothDevice? = intent.getParcelableExtra(BluetoothDevice.EXTRA_DEVICE)
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
                                    Toast.makeText(context, "Поиск завершен", Toast.LENGTH_SHORT).show()
                                }
                            }
                        }
                    }

                    val filter = IntentFilter(BluetoothDevice.ACTION_FOUND)
                    val filter2 = IntentFilter(BluetoothAdapter.ACTION_DISCOVERY_FINISHED)
                    registerReceiver(receiver, filter)
                    registerReceiver(receiver, filter2)

                    adapter.startDiscovery()
                    Toast.makeText(this, "Поиск устройств...", Toast.LENGTH_SHORT).show()
                }
            } else {
                val enableBtIntent = Intent(BluetoothAdapter.ACTION_REQUEST_ENABLE)
                startActivityForResult(enableBtIntent, REQUEST_ENABLE_BT)
            }
        }
    }

    override fun onRequestPermissionsResult(
        requestCode: Int,
        permissions: Array<out String>,
        grantResults: IntArray
    ) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults)
        if (requestCode == REQUEST_PERMISSIONS) {
            if (grantResults.all { it == PackageManager.PERMISSION_GRANTED }) {
                startBluetoothDiscovery()
            } else {
                Toast.makeText(this, "Необходимы разрешения для поиска Bluetooth устройств", Toast.LENGTH_SHORT).show()
                finish()
            }
        }
    }

    override fun onActivityResult(requestCode: Int, resultCode: Int, data: Intent?) {
        super.onActivityResult(requestCode, resultCode, data)
        if (requestCode == REQUEST_ENABLE_BT) {
            if (resultCode == RESULT_OK) {
                startBluetoothDiscovery()
            } else {
                Toast.makeText(this, "Для поиска устройств необходимо включить Bluetooth", Toast.LENGTH_SHORT).show()
                finish()
            }
        }
    }

    override fun onDestroy() {
        super.onDestroy()
        try {
            receiver?.let { unregisterReceiver(it) }
        } catch (e: Exception) {
        }
        bluetoothAdapter?.let { adapter ->
            if (ActivityCompat.checkSelfPermission(
                    this,
                    Manifest.permission.BLUETOOTH_SCAN
                ) == PackageManager.PERMISSION_GRANTED
            ) {
                adapter.cancelDiscovery()
            }
        }
    }
} 