require('dotenv').config();
const express = require('express');
const cors = require('cors');
const connectDB = require('./config/db');
const path = require('path');

console.log('Starting server...');
console.log('PORT:', process.env.PORT || 5000);

const authRoutes = require('./routes/auth');
const songRoutes = require('./routes/songs');
const artistRoutes = require('./routes/artists');
const aiRoutes = require('./routes/ai');
const playlistRoutes = require('./routes/playlists');
const djRoutes = require('./routes/dj');

console.log('Routes loaded');

const app = express();

console.log('Connecting to MongoDB...');
connectDB();

app.use(cors({
    origin: '*',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

app.options('*', cors());

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use(express.static(path.join(__dirname, 'public')));

console.log('Setting up routes...');

app.use('/api/auth', authRoutes);
app.use('/api/songs', songRoutes);
app.use('/api/artists', artistRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/playlists', playlistRoutes);
app.use('/api/dj', djRoutes);

app.get('/api/health', (req, res) => {
    res.json({ status: 'OK', message: '🌊 Wave API is running!' });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`🌊 Wave Server: http://localhost:${PORT}`);
});