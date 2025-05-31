// Увеличиваем timeout для тестов
jest.setTimeout(10000);

// Очищаем все моки после каждого теста
afterEach(() => {
  jest.clearAllMocks();
});

// Глобальная настройка для обработки ошибок в консоли
global.console = {
  ...console,
  // Отключаем вывод ошибок в консоль при тестах
  error: jest.fn(),
  // Отключаем вывод предупреждений в консоль при тестах
  warn: jest.fn(),
  // Сохраняем информационные сообщения
  log: console.log,
  info: console.info,
}; 