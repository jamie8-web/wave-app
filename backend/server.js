require('dotenv').config();
const express = require('express');
const cors = require('cors');
const connectDB = require('./config/db');

const app = express();

app.use(cors());
app.use(express.json());

app.get('/api/health', (req, res) => {
    res.json({ status: 'OK', message: 'Server is running!' });
});

app.use('/api/auth', require('./routes/auth'));

connectDB().then(() => {
    // Let Railway assign the port - don't hardcode 5000
    const PORT = process.env.PORT;
    console.log(`PORT from env: ${PORT}`);
    app.listen(PORT, '0.0.0.0', () => {
        console.log(`🌊 Server running on port ${PORT}`);
    });
}).catch(err => {
    console.error('MongoDB connection failed:', err);
    process.exit(1);
});