const mongoose = require('mongoose');

const songSchema = new mongoose.Schema({
  title: { type: String, required: true },
  artist: { type: String, required: true },
  album: { type: String, default: 'Single' },
  genre: { type: String, default: 'Other' },
  fileUrl: { type: String, required: true },
  coverUrl: { type: String, default: '' },
  lyrics: { type: String, default: '' },
  uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  plays: { type: Number, default: 0 },
  isPublic: { type: Boolean, default: true }
}, { timestamps: true });

module.exports = mongoose.model('Song', songSchema);