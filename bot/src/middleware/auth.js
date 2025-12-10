import jwt from 'jsonwebtoken';
import logger from '../utils/logger.js';

const authMiddleware = (req, res, next) => {
  try {
    // Check for API key in header (for GitHub Actions)
    const apiKey = req.headers['x-api-key'];
    if (apiKey && apiKey === process.env.API_KEY) {
      req.authType = 'api-key';
      return next();
    }

    // Check for Bearer token (for admin dashboard)
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const token = authHeader.substring(7);
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    req.user = decoded;
    req.authType = 'jwt';

    next();
  } catch (error) {
    logger.error('Authentication error:', error);

    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ error: 'Invalid token' });
    }

    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expired' });
    }

    res.status(500).json({ error: 'Authentication error' });
  }
};

export default authMiddleware;