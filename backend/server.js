require('dotenv').config();
const express = require('express');
const cors = require('cors');
const connectDB = require('./config/db');

const app = express();

// Manual CORS headers
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    if (req.method === 'OPTIONS') {
        return res.sendStatus(200);
    }
    next();
});

app.use(express.json());

// Health endpoint
app.get('/api/health', (req, res) => {
    res.json({ status: 'OK', message: 'Server is running!' });
});

// Auth routes
app.use('/api/auth', require('./routes/auth'));

connectDB().then(() => {
    const PORT = process.env.PORT || 5000;
    console.log(`PORT from env: ${process.env.PORT}`);
    console.log(`Using PORT: ${PORT}`);
    app.listen(PORT, '0.0.0.0', () => {
        console.log(`🌊 Server running on port ${PORT}`);
    });
}).catch(err => {
    console.error('MongoDB connection failed:', err);
    process.exit(1);
});