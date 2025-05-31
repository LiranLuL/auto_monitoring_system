const authController = require('../../src/controllers/authController');
const User = require('../../src/models/user');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

jest.mock('../../src/models/user');
jest.mock('bcrypt');
jest.mock('jsonwebtoken');

describe('AuthController', () => {
  let req, res;

  beforeEach(() => {
    jest.clearAllMocks();
    
    req = {
      body: {},
      user: {}
    };
    
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis()
    };
  });

  describe('register', () => {
    it('должен успешно регистрировать нового пользователя', async () => {
      const userData = {
        email: 'test@example.com',
        username: 'testuser',
        password: 'password123',
        vin: 'TEST123VIN456789'
      };
      
      req.body = userData;
      
      const mockUser = {
        id: 1,
        email: userData.email,
        username: userData.username,
        role: 'user',
        vehicles: [{ vin: userData.vin }]
      };
      
      User.findByEmail.mockResolvedValue(null);
      User.findByUsername.mockResolvedValue(null);
      User.create.mockResolvedValue(mockUser);
      User.findById.mockResolvedValue(mockUser);
      jwt.sign.mockReturnValue('mock-token');
      jwt.decode.mockReturnValue({ id: 1, email: userData.email, role: 'user' });

      await authController.register(req, res);

      expect(User.findByEmail).toHaveBeenCalledWith(userData.email);
      expect(User.findByUsername).toHaveBeenCalledWith(userData.username);
      expect(User.create).toHaveBeenCalledWith(userData);
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Пользователь успешно зарегистрирован',
        token: 'mock-token',
        user: mockUser
      });
    });

    it('должен возвращать ошибку при существующем email', async () => {
      req.body = {
        email: 'existing@example.com',
        username: 'newuser',
        password: 'password123'
      };
      
      User.findByEmail.mockResolvedValue({ id: 1, email: req.body.email });

      await authController.register(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Пользователь с таким email уже существует'
      });
    });

    it('должен возвращать ошибку при существующем username', async () => {
      req.body = {
        email: 'new@example.com',
        username: 'existinguser',
        password: 'password123'
      };
      
      User.findByEmail.mockResolvedValue(null);
      User.findByUsername.mockResolvedValue({ id: 1, username: req.body.username });

      await authController.register(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Пользователь с таким именем уже существует'
      });
    });

    it('должен обрабатывать ошибки базы данных', async () => {
      req.body = {
        email: 'test@example.com',
        username: 'testuser',
        password: 'password123'
      };
      
      const dbError = new Error('Database connection error');
      User.findByEmail.mockRejectedValue(dbError);

      await authController.register(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Ошибка при регистрации пользователя',
        error: dbError.message
      });
    });
  });

  describe('registerTechnician', () => {
    it('должен успешно регистрировать техника', async () => {
      const technicianData = {
        email: 'tech@example.com',
        username: 'technician1',
        password: 'password123'
      };
      
      req.body = technicianData;
      
      const mockTechnician = {
        id: 2,
        email: technicianData.email,
        username: technicianData.username,
        role: 'technician'
      };
      
      User.findByEmail.mockResolvedValue(null);
      User.findByUsername.mockResolvedValue(null);
      User.create.mockResolvedValue(mockTechnician);
      User.findById.mockResolvedValue(mockTechnician);
      jwt.sign.mockReturnValue('mock-tech-token');
      jwt.decode.mockReturnValue({ id: 2, email: technicianData.email, role: 'technician' });

      await authController.registerTechnician(req, res);

      expect(User.create).toHaveBeenCalledWith({
        ...technicianData,
        role: 'technician'
      });
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Техник успешно зарегистрирован',
        token: 'mock-tech-token',
        user: mockTechnician
      });
    });
  });

  describe('login', () => {
    it('должен успешно авторизовать пользователя', async () => {
      req.body = {
        email: 'user@example.com',
        password: 'correctpassword'
      };
      
      const mockUser = {
        id: 1,
        email: req.body.email,
        username: 'testuser',
        password: 'hashedpassword',
        role: 'user',
        vehicles: [{ vin: 'TEST123' }]
      };
      
      User.findByEmail.mockResolvedValue(mockUser);
      User.verifyPassword.mockResolvedValue(true);
      User.findById.mockResolvedValue(mockUser);
      jwt.sign.mockReturnValue('mock-auth-token');
      jwt.decode.mockReturnValue({ id: 1, email: mockUser.email, role: 'user' });

      await authController.login(req, res);

      expect(User.findByEmail).toHaveBeenCalledWith(req.body.email);
      expect(User.verifyPassword).toHaveBeenCalledWith(req.body.password, mockUser.password);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Успешный вход в систему',
        token: 'mock-auth-token',
        user: {
          id: mockUser.id,
          email: mockUser.email,
          username: mockUser.username,
          role: mockUser.role,
          vehicles: mockUser.vehicles
        }
      });
    });

    it('должен отклонять неверный email', async () => {
      req.body = {
        email: 'nonexistent@example.com',
        password: 'password'
      };
      
      User.findByEmail.mockResolvedValue(null);

      await authController.login(req, res);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Неверный email или пароль'
      });
    });

    it('должен отклонять неверный пароль', async () => {
      req.body = {
        email: 'user@example.com',
        password: 'wrongpassword'
      };
      
      const mockUser = {
        id: 1,
        email: req.body.email,
        password: 'hashedpassword'
      };
      
      User.findByEmail.mockResolvedValue(mockUser);
      User.verifyPassword.mockResolvedValue(false);

      await authController.login(req, res);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Неверный email или пароль'
      });
    });
  });

  describe('getCurrentUser', () => {
    it('должен возвращать данные текущего пользователя', async () => {
      req.user = { id: 1 };
      
      const mockUser = {
        id: 1,
        email: 'user@example.com',
        username: 'testuser',
        role: 'user',
        vehicles: [{ vin: 'TEST123' }]
      };
      
      User.findById.mockResolvedValue(mockUser);

      await authController.getCurrentUser(req, res);

      expect(User.findById).toHaveBeenCalledWith(1);
      expect(res.json).toHaveBeenCalledWith({
        user: mockUser
      });
    });

    it('должен возвращать 404 если пользователь не найден', async () => {
      req.user = { id: 999 };
      User.findById.mockResolvedValue(null);

      await authController.getCurrentUser(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Пользователь не найден'
      });
    });
  });
});