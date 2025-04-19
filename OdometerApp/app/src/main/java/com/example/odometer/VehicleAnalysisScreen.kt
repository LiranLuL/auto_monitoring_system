package com.example.odometer

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import kotlinx.coroutines.launch

/**
 * UI Screen for displaying vehicle analysis results
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun VehicleAnalysisScreen(
    onBackPressed: () -> Unit
) {
    val context = LocalContext.current
    val coroutineScope = rememberCoroutineScope()
    
    // Initialize the analysis service
    val analysisService = remember { VehicleAnalysisService(context) }
    
    // Collect state flows as state
    val analysisData by analysisService.analysisData.collectAsState()
    val recommendations by analysisService.recommendations.collectAsState()
    val isLoading by analysisService.isLoading.collectAsState()
    val errorMessage by analysisService.errorMessage.collectAsState()
    
    // Fetch data on screen creation
    LaunchedEffect(Unit) {
        analysisService.fetchLatestAnalysis()
    }
    
    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Анализ состояния автомобиля") },
                navigationIcon = {
                    IconButton(onClick = onBackPressed) {
                        // Back arrow icon would go here
                        Text("<")
                    }
                }
            )
        }
    ) { paddingValues ->
        Box(
            modifier = Modifier
                .fillMaxSize()
                .padding(paddingValues)
        ) {
            if (isLoading) {
                CircularProgressIndicator(
                    modifier = Modifier
                        .size(50.dp)
                        .align(Alignment.Center)
                )
            } else if (errorMessage != null) {
                Column(
                    modifier = Modifier
                        .fillMaxSize()
                        .padding(16.dp),
                    horizontalAlignment = Alignment.CenterHorizontally,
                    verticalArrangement = Arrangement.Center
                ) {
                    Text(
                        text = errorMessage ?: "Неизвестная ошибка",
                        color = MaterialTheme.colorScheme.error
                    )
                    Spacer(modifier = Modifier.height(16.dp))
                    Button(
                        onClick = { coroutineScope.launch { analysisService.fetchLatestAnalysis() } }
                    ) {
                        Text("Повторить")
                    }
                }
            } else if (analysisData == null) {
                Column(
                    modifier = Modifier
                        .fillMaxSize()
                        .padding(16.dp),
                    horizontalAlignment = Alignment.CenterHorizontally,
                    verticalArrangement = Arrangement.Center
                ) {
                    Text("Нет данных анализа. Запустите анализ вашего автомобиля.")
                    Spacer(modifier = Modifier.height(16.dp))
                    Button(
                        onClick = { coroutineScope.launch { analysisService.requestAnalysis() } }
                    ) {
                        Text("Запустить анализ")
                    }
                }
            } else {
                // Analysis data is available
                LazyColumn(
                    modifier = Modifier
                        .fillMaxSize()
                        .padding(16.dp)
                ) {
                    // Overall health section
                    item {
                        Text(
                            text = "Общее состояние",
                            fontSize = 20.sp,
                            fontWeight = FontWeight.Bold
                        )
                        Spacer(modifier = Modifier.height(8.dp))
                        HealthScoreCard(
                            title = "Общая оценка",
                            score = analysisData?.overallHealth ?: 0,
                            status = analysisData?.overallStatus ?: "Неизвестно"
                        )
                        Spacer(modifier = Modifier.height(16.dp))
                    }
                    
                    // Component health section
                    item {
                        Text(
                            text = "Состояние компонентов",
                            fontSize = 20.sp,
                            fontWeight = FontWeight.Bold
                        )
                        Spacer(modifier = Modifier.height(8.dp))
                    }
                    
                    // Engine health
                    item {
                        HealthScoreCard(
                            title = "Двигатель",
                            score = analysisData?.engineHealth ?: 0,
                            status = analysisData?.engineStatus ?: "Неизвестно"
                        )
                        Spacer(modifier = Modifier.height(8.dp))
                    }
                    
                    // Oil health
                    item {
                        HealthScoreCard(
                            title = "Масло",
                            score = analysisData?.oilHealth ?: 0,
                            status = analysisData?.oilStatus ?: "Неизвестно"
                        )
                        Spacer(modifier = Modifier.height(8.dp))
                    }
                    
                    // Tires health
                    item {
                        HealthScoreCard(
                            title = "Шины",
                            score = analysisData?.tiresHealth ?: 0,
                            status = analysisData?.tiresStatus ?: "Неизвестно"
                        )
                        Spacer(modifier = Modifier.height(8.dp))
                    }
                    
                    // Brakes health
                    item {
                        HealthScoreCard(
                            title = "Тормоза",
                            score = analysisData?.brakesHealth ?: 0,
                            status = analysisData?.brakesStatus ?: "Неизвестно"
                        )
                        Spacer(modifier = Modifier.height(16.dp))
                    }
                    
                    // Recommendations section
                    if (recommendations.isNotEmpty()) {
                        item {
                            Text(
                                text = "Рекомендации",
                                fontSize = 20.sp,
                                fontWeight = FontWeight.Bold
                            )
                            Spacer(modifier = Modifier.height(8.dp))
                        }
                        
                        items(recommendations) { recommendation ->
                            RecommendationItem(recommendation)
                            Spacer(modifier = Modifier.height(4.dp))
                        }
                        
                        item {
                            Spacer(modifier = Modifier.height(16.dp))
                        }
                    }
                    
                    // Analysis date
                    item {
                        Text(
                            text = "Дата анализа: ${analysisData?.createdAt?.substring(0, 10) ?: "Неизвестно"}",
                            fontSize = 14.sp,
                            color = Color.Gray
                        )
                        Spacer(modifier = Modifier.height(16.dp))
                    }
                    
                    // Action button
                    item {
                        Button(
                            onClick = { coroutineScope.launch { analysisService.requestAnalysis() } },
                            modifier = Modifier.fillMaxWidth()
                        ) {
                            Text("Обновить анализ")
                        }
                        Spacer(modifier = Modifier.height(32.dp))
                    }
                }
            }
        }
    }
}

/**
 * Card component to display health score
 */
@Composable
fun HealthScoreCard(
    title: String,
    score: Int,
    status: String
) {
    val backgroundColor = when (status) {
        "Критическое" -> Color(0xFFFDE8E8)
        "Требует внимания" -> Color(0xFFFEF3C7)
        else -> Color(0xFFDCFCE7)
    }
    
    val textColor = when (status) {
        "Критическое" -> Color(0xFFDC2626)
        "Требует внимания" -> Color(0xFFD97706)
        else -> Color(0xFF059669)
    }
    
    Card(
        modifier = Modifier
            .fillMaxWidth()
            .padding(vertical = 4.dp)
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .background(backgroundColor)
                .padding(16.dp),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Column {
                Text(
                    text = title,
                    fontWeight = FontWeight.Bold
                )
                Text(
                    text = status,
                    color = textColor
                )
            }
            
            Box(
                modifier = Modifier
                    .size(60.dp)
                    .background(Color.White, shape = MaterialTheme.shapes.medium),
                contentAlignment = Alignment.Center
            ) {
                Text(
                    text = score.toString(),
                    fontSize = 24.sp,
                    fontWeight = FontWeight.Bold,
                    color = textColor
                )
            }
        }
    }
}

/**
 * Item to display a recommendation
 */
@Composable
fun RecommendationItem(recommendation: String) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .padding(vertical = 4.dp),
        verticalAlignment = Alignment.Top
    ) {
        Text(
            text = "•",
            modifier = Modifier.padding(end = 8.dp, top = 2.dp),
            fontWeight = FontWeight.Bold
        )
        Text(text = recommendation)
    }
} 