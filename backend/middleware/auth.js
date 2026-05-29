const jwt = require('jsonwebtoken');

const protect = async (req, res, next) => {
    try {
        let token;
        
        // Check for token in Authorization header
        if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
            token = req.headers.authorization.split(' ')[1];
        }
        
        // Check if token exists
        if (!token) {
            return res.status(401).json({ error: 'Not authorized, no token' });
        }
        
        // Verify token
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'wave_secret_key_2024');
        
        // Attach userId to request
        req.userId = decoded.id;
        next();
    } catch (error) {
        console.error('Auth middleware error:', error.message);
        return res.status(401).json({ error: 'Not authorized, token failed' });
    }
};

module.exports = { protect };