require('dotenv').config();
const express = require('express');
const cors = require('cors');
const connectDB = require('./config/db');

const app = express();

// CORS
app.use(cors({ origin: '*', credentials: true }));
app.options('*', cors());

app.use(express.json());

// Health endpoint
app.get('/api/health', (req, res) => {
    res.json({ status: 'OK', message: 'Server is running!' });
});

// Connect to MongoDB then start server
connectDB().then(() => {
    const PORT = process.env.PORT || 5000;
    app.listen(PORT, () => {
        console.log(`🌊 Server running on port ${PORT}`);
    });
}).catch(err => {
    console.error('MongoDB connection failed:', err);
    process.exit(1);
});