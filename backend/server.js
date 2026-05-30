require('dotenv').config();
const express = require('express');
const cors = require('cors');
const connectDB = require('./config/db');
const path = require('path');
const fs = require('fs');

// Ensure upload directories exist
const uploadDirs = ['uploads/music', 'uploads/covers', 'uploads/lyrics'];
uploadDirs.forEach(dir => {
    const dirPath = path.join(__dirname, dir);
    if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
        console.log(`Created directory: ${dir}`);
    }
});

const app = express();

// CORS
app.use(cors({ origin: '*', credentials: true }));
app.options('*', cors());

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Log all requests for debugging
app.use((req, res, next) => {
    console.log(`${req.method} ${req.url}`);
    next();
});

// Static files
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use(express.static(path.join(__dirname, 'public')));

// Health endpoint
app.get('/api/health', (req, res) => {
    res.json({ status: 'OK', message: 'Server is running!' });
});

// API Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/songs', require('./routes/songs'));
app.use('/api/artists', require('./routes/artists'));
app.use('/api/ai', require('./routes/ai'));
app.use('/api/playlists', require('./routes/playlists'));
app.use('/api/dj', require('./routes/dj'));

// Catch-all for undefined routes
app.use('*', (req, res) => {
    res.status(404).json({ error: `Route ${req.originalUrl} not found` });
});

// Connect to MongoDB then start server
connectDB().then(() => {
    const PORT = process.env.PORT;
    console.log(`PORT from env: ${PORT}`);
    app.listen(PORT, '0.0.0.0', () => {
        console.log(`🌊 Server running on port ${PORT}`);
    });
}).catch(err => {
    console.error('MongoDB connection failed:', err);
    process.exit(1);
});