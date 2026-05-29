const express = require('express');
const multer = require('multer');
const path = require('path');
const Artist = require('../models/Artist');
const Song = require('../models/Song');
const Mix = require('../models/Mix');
const { protect } = require('../middleware/auth');
const { isAdmin } = require('../middleware/admin');
const router = express.Router();

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'uploads/covers/'),
  filename: (req, file, cb) => cb(null, 'artist-' + Date.now() + path.extname(file.originalname))
});
const upload = multer({ storage, limits: { fileSize: 10000000 } });

// GET ALL ARTISTS
router.get('/', async (req, res) => {
  try {
    const artists = await Artist.find().sort({ createdAt: -1 });
    res.json(artists);
  } catch (error) { res.json([]); }
});

// GET SINGLE ARTIST
router.get('/:id', async (req, res) => {
  try {
    const artist = await Artist.findById(req.params.id);
    if (!artist) return res.status(404).json({ error: 'Not found' });
    res.json(artist);
  } catch (error) { res.json({}); }
});

// CREATE ARTIST
router.post('/', protect, isAdmin, upload.single('image'), async (req, res) => {
  try {
    const { name, genre, bio } = req.body;
    if (!name) return res.status(400).json({ error: 'Artist name required' });
    const exists = await Artist.findOne({ name: name.trim() });
    if (exists) return res.status(400).json({ error: 'Artist already exists' });
    const artist = await Artist.create({ name: name.trim(), genre: genre || '', bio: bio || '', image: req.file ? `/uploads/covers/${req.file.filename}` : '', createdBy: req.userId });
    res.status(201).json({ message: 'Artist created!', artist });
  } catch (error) { res.status(500).json({ error: 'Create failed: ' + error.message }); }
});

// UPDATE ARTIST
router.put('/:id', protect, isAdmin, upload.single('image'), async (req, res) => {
  try {
    const artist = await Artist.findById(req.params.id);
    if (!artist) return res.status(404).json({ error: 'Not found' });
    const { name, genre, bio } = req.body;
    if (name) artist.name = name;
    if (genre) artist.genre = genre;
    if (bio) artist.bio = bio;
    if (req.file) artist.image = `/uploads/covers/${req.file.filename}`;
    await artist.save();
    res.json({ message: 'Updated!', artist });
  } catch (error) { res.status(500).json({ error: 'Update failed' }); }
});

// DELETE ARTIST
router.delete('/:id', protect, isAdmin, async (req, res) => {
  try {
    const artist = await Artist.findById(req.params.id);
    if (!artist) return res.status(404).json({ error: 'Not found' });
    await artist.deleteOne();
    res.json({ message: 'Deleted' });
  } catch (error) { res.status(500).json({ error: 'Delete failed' }); }
});

// SEARCH ARTISTS
router.get('/search/:query', async (req, res) => {
  try {
    const artists = await Artist.find({ name: { $regex: req.params.query, $options: 'i' } }).limit(10);
    res.json(artists);
  } catch (error) { res.json([]); }
});

// GET ARTIST SONGS
router.get('/:id/songs', async (req, res) => {
  try {
    const artist = await Artist.findById(req.params.id);
    if (!artist) return res.json([]);
    const songs = await Song.find({ artist: artist.name });
    const mixes = await Mix.find({ artist: artist.name });
    res.json([...songs, ...mixes]);
  } catch (error) { res.json([]); }
});

module.exports = router;