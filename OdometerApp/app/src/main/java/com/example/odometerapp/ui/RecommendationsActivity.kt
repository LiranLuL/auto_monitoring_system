package com.example.odometerapp.ui

import android.content.Context
import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.ImageView
import android.widget.ProgressBar
import android.widget.TextView
import android.widget.Toast
import androidx.activity.viewModels
import androidx.appcompat.app.AppCompatActivity
import androidx.cardview.widget.CardView
import androidx.core.content.ContextCompat
import androidx.lifecycle.Observer
import androidx.recyclerview.widget.LinearLayoutManager
import androidx.recyclerview.widget.RecyclerView
import com.example.odometerapp.R
import com.example.odometerapp.api.VehicleAnalysis
import com.example.odometerapp.databinding.ActivityRecommendationsBinding
import com.example.odometerapp.viewmodel.RecommendationsViewModel
import com.google.android.material.floatingactionbutton.FloatingActionButton

class RecommendationsActivity : AppCompatActivity() {
    private lateinit var binding: ActivityRecommendationsBinding
    private val viewModel: RecommendationsViewModel by viewModels()
    private lateinit var recommendationsAdapter: RecommendationsAdapter
    private lateinit var systemHealthAdapter: SystemHealthAdapter

    private var vehicleId: String? = null
    private var authToken: String? = null

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        binding = ActivityRecommendationsBinding.inflate(layoutInflater)
        setContentView(binding.root)
        
        // Устанавливаем заголовок
        title = "Техническое обслуживание"
        supportActionBar?.setDisplayHomeAsUpEnabled(true)
        supportActionBar?.elevation = 0f
        window.statusBarColor = ContextCompat.getColor(this, R.color.purple_700)

        vehicleId = intent.getStringExtra("VEHICLE_ID")
        
        if (vehicleId == null) {
            val prefs = getSharedPreferences("sensor_prefs", Context.MODE_PRIVATE)
            vehicleId = prefs.getString("vehicle_id", "DEFAULT_VIN")
        }
        
        val sharedPreferences = getSharedPreferences("prefs", Context.MODE_PRIVATE)
        authToken = sharedPreferences.getString("jwt_token", null)
        
        if (authToken == null) {
            authToken = "demo_token"
        }

        setupRecyclerViews()
        setupObservers()
        setupListeners()
        
        loadAnalysisData()
    }
    
    private fun loadAnalysisData() {
        binding.progressBarLoading.visibility = View.VISIBLE
        binding.textViewNoData.visibility = View.GONE
        viewModel.getLatestAnalysis("Bearer $authToken", vehicleId!!)
    }
    
    private fun setupListeners() {
        binding.fabRefresh.setOnClickListener {
            // Показать анимацию загрузки и получить новые данные
            binding.progressBarLoading.visibility = View.VISIBLE
            loadAnalysisData()
            
            // Показать уведомление
            Toast.makeText(this, "Обновление данных...", Toast.LENGTH_SHORT).show()
        }
    }

    private fun setupRecyclerViews() {
        recommendationsAdapter = RecommendationsAdapter(emptyList())
        binding.recyclerViewRecommendations.apply {
            layoutManager = LinearLayoutManager(this@RecommendationsActivity)
            adapter = recommendationsAdapter
        }

        systemHealthAdapter = SystemHealthAdapter(emptyList())
        binding.recyclerViewSystems.apply {
            layoutManager = LinearLayoutManager(this@RecommendationsActivity, 
                LinearLayoutManager.VERTICAL, false)
            adapter = systemHealthAdapter
        }
    }

    private fun setupObservers() {
        viewModel.analysisResult.observe(this, Observer { analysis ->
            updateUI(analysis)
            binding.progressBarLoading.visibility = View.GONE
        })

        viewModel.isLoading.observe(this, Observer { isLoading ->
            binding.progressBarLoading.visibility = if (isLoading) View.VISIBLE else View.GONE
        })

        viewModel.error.observe(this, Observer { errorMsg ->
            if (errorMsg != null) {
                Toast.makeText(this, errorMsg, Toast.LENGTH_LONG).show()
                binding.textViewNoData.visibility = View.VISIBLE
                binding.progressBarLoading.visibility = View.GONE
            } else {
                binding.textViewNoData.visibility = View.GONE
            }
        })
    }

    private fun updateUI(analysis: VehicleAnalysis) {
        // Устанавливаем значение прогресса
        val overallHealth = analysis.overall_health
        binding.progressBarOverall.progress = overallHealth
        binding.textViewOverallValue.text = "${overallHealth}%"
        
        // Устанавливаем цвет прогресс-бара в зависимости от уровня здоровья
        val colorRes = getColorForHealth(overallHealth)
        binding.progressBarOverall.progressTintList = ContextCompat.getColorStateList(this, colorRes)
        
        // Устанавливаем статус и его цвет
        val (statusText, statusColor) = when {
            overallHealth < 50 -> Pair("Критическое", R.color.health_critical)
            overallHealth < 70 -> Pair("Требует внимания", R.color.health_warning)
            else -> Pair("Хорошее", R.color.health_good)
        }
        
        binding.textViewOverallStatus.text = statusText
        binding.textViewOverallStatus.setTextColor(ContextCompat.getColor(this, statusColor))
        
        // Подложка прогресс-бара всегда светло-пурпурная
        binding.progressBarOverall.progressBackgroundTintList = 
            ContextCompat.getColorStateList(this, R.color.purple_200)

        val systemItems = listOf(
            SystemHealth("Двигатель", analysis.engine_health),
            SystemHealth("Масло", analysis.oil_health),
            SystemHealth("Шины", analysis.tires_health),
            SystemHealth("Тормоза", analysis.brakes_health),
            SystemHealth("Подвеска", analysis.suspension_health),
            SystemHealth("Аккумулятор", analysis.battery_health)
        )
        systemHealthAdapter.updateItems(systemItems)
        
        // Hide no data message if we have recommendations
        binding.textViewNoData.visibility = 
            if (analysis.recommendations.isEmpty()) View.VISIBLE else View.GONE
        
        // Преобразуем рекомендации в более информативные объекты
        val enhancedRecommendations = analysis.recommendations.map { recommendation ->
            val category = when {
                recommendation.contains("двигател", ignoreCase = true) -> "Двигатель"
                recommendation.contains("масл", ignoreCase = true) -> "Масло"
                recommendation.contains("шин", ignoreCase = true) -> "Шины"
                recommendation.contains("тормоз", ignoreCase = true) -> "Тормоза"
                recommendation.contains("подвеск", ignoreCase = true) -> "Подвеска"
                recommendation.contains("аккумулятор", ignoreCase = true) -> "Аккумулятор"
                recommendation.contains("батаре", ignoreCase = true) -> "Аккумулятор"
                else -> "Общее"
            }
            
            val priority = when {
                recommendation.contains("срочн", ignoreCase = true) || 
                recommendation.contains("критич", ignoreCase = true) || 
                recommendation.contains("немедленно", ignoreCase = true) || 
                recommendation.contains("требуется", ignoreCase = true) -> Priority.HIGH
                recommendation.contains("рекомендуется", ignoreCase = true) || 
                recommendation.contains("следует", ignoreCase = true) -> Priority.MEDIUM
                else -> Priority.LOW
            }
            
            EnhancedRecommendation(recommendation, category, priority)
        }
        
        recommendationsAdapter.updateItems(enhancedRecommendations)
    }

    private fun getColorForHealth(health: Int): Int {
        return when {
            health < 50 -> R.color.health_critical
            health < 70 -> R.color.health_warning
            else -> R.color.health_good
        }
    }

    override fun onSupportNavigateUp(): Boolean {
        onBackPressed()
        return true
    }
}

// Приоритет рекомендации
enum class Priority {
    LOW, MEDIUM, HIGH
}

// Расширенная модель рекомендации
data class EnhancedRecommendation(
    val text: String,
    val category: String,
    val priority: Priority
)

class SystemHealthAdapter(private var items: List<SystemHealth>) : 
    RecyclerView.Adapter<SystemHealthAdapter.ViewHolder>() {
    
    class ViewHolder(view: View) : RecyclerView.ViewHolder(view) {
        val systemName: TextView = view.findViewById(R.id.textViewSystemName)
        val progressBar: ProgressBar = view.findViewById(R.id.progressBarSystem)
        val systemValue: TextView = view.findViewById(R.id.textViewSystemValue)
    }
    
    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): ViewHolder {
        val view = LayoutInflater.from(parent.context)
            .inflate(R.layout.item_system_health, parent, false)
        return ViewHolder(view)
    }
    
    override fun onBindViewHolder(holder: ViewHolder, position: Int) {
        val item = items[position]
        val context = holder.itemView.context
        holder.systemName.text = item.name
        holder.progressBar.progress = item.health
        holder.systemValue.text = "${item.health}%"
        
        // Установим прогресс тинт в зависимости от уровня здоровья
        val colorRes = getHealthColorForProgress(item.health)
        holder.progressBar.progressTintList = ContextCompat.getColorStateList(context, colorRes)
        
        // А для подложки всегда используем светло-пурпурный
        holder.progressBar.progressBackgroundTintList = 
            ContextCompat.getColorStateList(context, R.color.purple_200)
    }
    
    private fun getHealthColorForProgress(health: Int): Int {
        return when {
            health < 50 -> R.color.health_critical
            health < 70 -> R.color.health_warning
            else -> R.color.health_good
        }
    }
    
    override fun getItemCount() = items.size
    
    fun updateItems(newItems: List<SystemHealth>) {
        this.items = newItems
        notifyDataSetChanged()
    }
}

class RecommendationsAdapter(private var items: List<EnhancedRecommendation>) : 
    RecyclerView.Adapter<RecommendationsAdapter.ViewHolder>() {
    
    class ViewHolder(view: View) : RecyclerView.ViewHolder(view) {
        val recommendationText: TextView = view.findViewById(R.id.textViewRecommendation)
        val categoryText: TextView = view.findViewById(R.id.textViewCategory)
        val priorityText: TextView = view.findViewById(R.id.textViewPriority)
        val bulletIcon: ImageView = view.findViewById(R.id.imageViewBullet)
        val categoryBar: View = view.findViewById(R.id.viewCategoryBar)
    }
    
    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): ViewHolder {
        val view = LayoutInflater.from(parent.context)
            .inflate(R.layout.item_recommendation, parent, false)
        return ViewHolder(view)
    }
    
    override fun onBindViewHolder(holder: ViewHolder, position: Int) {
        val item = items[position]
        val context = holder.itemView.context
        
        // Устанавливаем текст рекомендации
        holder.recommendationText.text = item.text
        
        // Устанавливаем категорию
        holder.categoryText.text = item.category
        
        // Устанавливаем приоритет
        val priorityText = when(item.priority) {
            Priority.HIGH -> "Приоритет: Высокий"
            Priority.MEDIUM -> "Приоритет: Средний"
            Priority.LOW -> "Приоритет: Низкий"
        }
        holder.priorityText.text = priorityText
        
        // Устанавливаем иконку в зависимости от приоритета
        val icon = when (item.priority) {
            Priority.HIGH -> R.drawable.ic_warning
            Priority.MEDIUM -> R.drawable.ic_info
            Priority.LOW -> R.drawable.ic_check
        }
        holder.bulletIcon.setImageResource(icon)
        holder.bulletIcon.setColorFilter(
            ContextCompat.getColor(context, R.color.purple_500)
        )
        
        // Устанавливаем цвет полосы категории
        val colorRes = when (item.priority) {
            Priority.HIGH -> R.color.health_critical
            Priority.MEDIUM -> R.color.health_warning
            Priority.LOW -> R.color.health_good
        }
        
        val color = ContextCompat.getColor(context, colorRes)
        holder.categoryBar.setBackgroundColor(color)
    }
    
    override fun getItemCount() = items.size
    
    fun updateItems(newItems: List<EnhancedRecommendation>) {
        this.items = newItems
        notifyDataSetChanged()
    }
}

data class SystemHealth(val name: String, val health: Int) 