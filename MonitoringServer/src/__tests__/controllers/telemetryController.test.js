const telemetryController = require('../../src/controllers/telemetryController');
const db = require('../../src/db');

jest.mock('../../src/db');

describe('TelemetryController', () => {
  let req, res;

  beforeEach(() => {
    jest.clearAllMocks();
    
    req = {
      body: {},
      user: {
        id: 1,
        role: 'user',
        vehicles: [{ vin: 'TEST123VIN456789' }]
      }
    };
    
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis()
    };
  });

  describe('saveTelemetry', () => {
    it('должен сохранять телеметрические данные для авторизованного пользователя', async () => {
      const telemetryData = {
        rpm: 2500,
        speed: 60,
        engineTemp: 85,
        dtcCodes: '[]',
        o2Voltage: 0.5,
        fuelPressure: 350,
        intakeTemp: 25,
        mafSensor: 15.5,
        throttlePos: 30,
        engineHealth: 95,
        oilHealth: 90,
        tiresHealth: 88,
        brakesHealth: 92
      };
      
      req.body = telemetryData;
      
      db.query.mockResolvedValueOnce({ rows: [{ id: 1 }] })
        .mockResolvedValueOnce({ rows: [{ id: 101 }] });

      await telemetryController.saveTelemetry(req, res);

      expect(db.query).toHaveBeenCalledWith(
        'SELECT id FROM user_vehicles WHERE vin = $1',
        ['TEST123VIN456789']
      );
      
      expect(db.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO telemetry_data'),
        expect.arrayContaining([
          1,
          telemetryData.rpm,
          telemetryData.speed,
          telemetryData.engineTemp
        ])
      );
      
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Телеметрические данные успешно сохранены',
        id: 101
      });
    });

    it('должен отклонять запрос от пользователя без роли user', async () => {
      req.user.role = 'technician';

      await telemetryController.saveTelemetry(req, res);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Доступ запрещен. Только пользователи могут отправлять телеметрию.'
      });
    });

    it('должен отклонять запрос если VIN не найден в токене', async () => {
      req.user.vehicles = [];

      await telemetryController.saveTelemetry(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        message: 'VIN не найден в токене. Пожалуйста, зарегистрируйте автомобиль.'
      });
    });

    it('должен отклонять запрос если автомобиль не найден в базе', async () => {
      db.query.mockResolvedValueOnce({ rows: [] });

      await telemetryController.saveTelemetry(req, res);

      expect(res.status).toHaveBeenCalledWith(405);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Автомобиль не найден в базе данных.'
      });
    });

    it('должен обрабатывать ошибки базы данных', async () => {
      const dbError = new Error('Database connection failed');
      db.query.mockRejectedValue(dbError);

      await telemetryController.saveTelemetry(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Ошибка при сохранении телеметрических данных',
        error: dbError.message
      });
    });
  });

  describe('getTelemetry', () => {
    it('должен возвращать последние телеметрические данные', async () => {
      const mockTelemetryData = {
        id: 1,
        vehicle_id: 1,
        rpm: 2500,
        speed: 60,
        engine_temp: 85,
        created_at: '2024-01-01T12:00:00Z'
      };
      
      db.query.mockResolvedValueOnce({ rows: [{ id: 1 }] })
        .mockResolvedValueOnce({ rows: [mockTelemetryData] });

      await telemetryController.getTelemetry(req, res);

      expect(db.query).toHaveBeenCalledWith(
        expect.stringContaining('SELECT * FROM telemetry_data'),
        [1]
      );
      
      expect(res.json).toHaveBeenCalledWith(mockTelemetryData);
    });

    it('должен возвращать 404 если данные не найдены', async () => {
      db.query.mockResolvedValueOnce({ rows: [{ id: 1 }] })
        .mockResolvedValueOnce({ rows: [] });

      await telemetryController.getTelemetry(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Телеметрические данные не найдены.'
      });
    });
  });
});