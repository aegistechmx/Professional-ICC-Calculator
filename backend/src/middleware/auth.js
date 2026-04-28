const jwt = require('jsonwebtoken');

// Simple auth middleware for development
// In production, this should validate against a proper user system
const auth = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader) {
      // For development, allow requests without auth
      if (process.env.NODE_ENV === 'development') {
        req.user = { id: 'dev-user', email: 'dev@example.com' };
        return next();
      }
      return res.status(401).json({ error: 'No authorization header' });
    }

    const token = authHeader.split(' ')[1];
    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      // For development, allow requests with invalid tokens
      req.user = { id: 'dev-user', email: 'dev@example.com' };
      return next();
    }
    return res.status(401).json({ error: 'Invalid token' });
  }
};

module.exports = auth;
