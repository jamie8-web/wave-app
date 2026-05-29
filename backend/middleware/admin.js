const User = require('../models/User');

const isAdmin = async (req, res, next) => {
    try {
        const user = await User.findById(req.userId || req.user?._id);
        if (!user) return res.status(401).json({ error: 'User not found' });
        if (user.role !== 'admin' && user.role !== 'superadmin') return res.status(403).json({ error: 'Admin access required' });
        req.user = user;
        next();
    } catch (error) { res.status(500).json({ error: 'Server error' }); }
};

const isSuperAdmin = async (req, res, next) => {
    try {
        const user = await User.findById(req.userId || req.user?._id);
        if (!user) return res.status(401).json({ error: 'User not found' });
        if (user.role !== 'superadmin') return res.status(403).json({ error: 'Super admin access required' });
        req.user = user;
        next();
    } catch (error) { res.status(500).json({ error: 'Server error' }); }
};

module.exports = { isAdmin, isSuperAdmin };