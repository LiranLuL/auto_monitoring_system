const jwt = require('jsonwebtoken');
const dotenv = require('dotenv');

dotenv.config();

const auth = {
  verifyToken: (req, res, next) => {
    const authHeader = req.headers['authorization'];

    if (!authHeader) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const token = authHeader.replace('Bearer ', '');
    console.log('Processing token in middleware');
    
    jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
      if (err) {
        console.error('Token verification error:', err);
        return res.status(401).json({ error: 'Invalid token' });
      }
      
      console.log('Token verified, decoded payload:', decoded);
      
      req.userId = decoded.userId;
      req.vin = decoded.vin;
      req.role = decoded.role;
      
      console.log('Request context set:', { 
        userId: req.userId, 
        vin: req.vin, 
        role: req.role 
      });
      
      next();
    });
  },

  checkRole: (roles) => {
    return (req, res, next) => {
      if (!req.userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      if (!roles.includes(req.role)) {
        return res.status(403).json({ error: 'Access denied' });
      }

      next();
    };
  }
};

module.exports = auth; 