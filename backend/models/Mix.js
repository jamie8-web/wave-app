const mongoose = require('mongoose');

const mixSchema = new mongoose.Schema({
  title: { type: String, required: true },
  artist: { type: String, required: true },
  fileUrl: { type: String, required: true },
  coverUrl: { type: String, default: '' },
  lyrics: { type: String, default: '' },
  uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  plays: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Mix', mixSchema);