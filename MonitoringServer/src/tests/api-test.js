// Добавим проверку ответа для теста 5
// Тест 5: Несуществующий автомобиль
console.log('Test 5: Nonexistent vehicle');
try {
  await axios.get(`${API_URL}/vehicle-health/NONEXISTENT`);
} catch (error) {
  if (error.response.status === 404) {
    console.log('✓ Nonexistent vehicle handling test passed\n');
  } else {
    throw new Error('Unexpected status code');
  }
} 