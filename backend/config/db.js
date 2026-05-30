const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    const mongoURI = process.env.MONGODB_URI;
    console.log('Connecting to MongoDB...');
    await mongoose.connect(mongoURI);
    console.log('✅ MongoDB Connected: wave');
    return true;
  } catch (error) {
    console.error('❌ MongoDB Error:', error.message);
    throw error;
  }
};

module.exports = connectDB;