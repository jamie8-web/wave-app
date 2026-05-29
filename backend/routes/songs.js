const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const mm = require('music-metadata');
const Song = require('../models/Song');
const Mix = require('../models/Mix');
const User = require('../models/User');
const Artist = require('../models/Artist');
const { protect } = require('../middleware/auth');
const { isAdmin, isSuperAdmin } = require('../middleware/admin');
const router = express.Router();

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    if (file.fieldname === 'audio') cb(null, 'uploads/music/');
    else if (file.fieldname === 'lyrics') cb(null, 'uploads/lyrics/');
    else cb(null, 'uploads/covers/');
  },
  filename: (req, file, cb) => { cb(null, Date.now() + '-' + file.originalname); }
});

const upload = multer({ storage, limits: { fileSize: 500000000 } });
const mixUpload = multer({ storage, limits: { fileSize: 2000000000 } });

try { if (!fs.existsSync('uploads/lyrics')) fs.mkdirSync('uploads/lyrics', { recursive: true }); } catch(e) {}

// ============ METADATA EXTRACTION (AI BULK UPLOAD) ============
router.post('/extract-metadata', protect, isAdmin, upload.single('audio'), async (req, res) => {
    try {
        if (!req.file) {
            return res.json({ title: '', artist: '' });
        }
        
        const metadata = await mm.parseFile(req.file.path);
        
        // Clean up the temp file
        fs.unlink(req.file.path, () => {});
        
        let title = metadata.common.title || '';
        let artist = metadata.common.artist || '';
        
        // If no title, try to get from filename
        if (!title && req.file.originalname) {
            title = req.file.originalname.replace(/\.[^/.]+$/, '');
        }
        
        res.json({
            title: title,
            artist: artist,
            album: metadata.common.album || '',
            year: metadata.common.year || '',
            genre: metadata.common.genre ? metadata.common.genre[0] : ''
        });
    } catch (error) {
        console.error('Metadata extraction error:', error.message);
        res.json({ 
            title: req.file ? req.file.originalname.replace(/\.[^/.]+$/, '') : '',
            artist: '',
            error: error.message
        });
    }
});

// GET ALL PUBLIC SONGS
router.get('/', async (req, res) => {
  try {
    const songs = await Song.find({ isPublic: true }).sort({ createdAt: -1 }).limit(50).populate('uploadedBy', 'username avatar');
    res.json(songs);
  } catch (error) { res.json([]); }
});

// GET ALL MIXES
router.get('/mixes', async (req, res) => {
  try {
    const mixes = await Mix.find().sort({ createdAt: -1 }).limit(30);
    res.json(mixes);
  } catch (error) { res.json([]); }
});

// SEARCH
router.get('/search', async (req, res) => {
  try {
    const { q } = req.query;
    if (!q || q.trim() === '') {
      const songs = await Song.find({ isPublic: true }).sort({ createdAt: -1 }).limit(30);
      return res.json(songs);
    }
    const songs = await Song.find({ isPublic: true, $or: [{ title: { $regex: q, $options: 'i' } }, { artist: { $regex: q, $options: 'i' } }] }).sort({ createdAt: -1 }).limit(30);
    res.json(songs);
  } catch (error) { res.json([]); }
});

// GET SINGLE SONG
router.get('/:id', async (req, res) => {
  try {
    let song = await Song.findById(req.params.id).populate('uploadedBy', 'username avatar');
    if (!song) song = await Mix.findById(req.params.id);
    if (!song) return res.status(404).json({ error: 'Not found' });
    song.plays += 1; await song.save();
    res.json(song);
  } catch (error) { res.json({}); }
});

// GET MY UPLOADS
router.get('/my-songs', protect, async (req, res) => {
  try {
    const songs = await Song.find({ uploadedBy: req.userId }).sort({ createdAt: -1 });
    const mixes = await Mix.find({ uploadedBy: req.userId }).sort({ createdAt: -1 });
    res.json([...songs, ...mixes]);
  } catch (error) { res.json([]); }
});

// GET ARTIST SONGS
router.get('/artist/:name/songs', async (req, res) => {
  try {
    const songs = await Song.find({ artist: req.params.name, isPublic: true }).sort({ createdAt: -1 });
    const mixes = await Mix.find({ artist: req.params.name }).sort({ createdAt: -1 });
    res.json([...songs, ...mixes]);
  } catch (error) { res.json([]); }
});

// UPLOAD SONG (Regular user)
router.post('/upload', protect, upload.fields([
  { name: 'audio', maxCount: 1 }, { name: 'cover', maxCount: 1 }, { name: 'lyrics', maxCount: 1 }
]), async (req, res) => {
  try {
    const { title, album, genre } = req.body;
    if (!req.files || !req.files.audio) return res.status(400).json({ error: 'Audio file required' });
    const user = await User.findById(req.userId);
    let lyrics = '';
    if (req.files.lyrics) lyrics = fs.readFileSync(req.files.lyrics[0].path, 'utf8');
    const isDJ = user.username.toLowerCase().startsWith('dj');
    if (isDJ) {
      await Mix.create({ title, artist: user.username, fileUrl: `/uploads/music/${req.files.audio[0].filename}`, coverUrl: req.files.cover ? `/uploads/covers/${req.files.cover[0].filename}` : '', lyrics, uploadedBy: req.userId });
    } else {
      await Song.create({ title, artist: user.username, album: album || 'Single', genre: genre || 'Other', fileUrl: `/uploads/music/${req.files.audio[0].filename}`, coverUrl: req.files.cover ? `/uploads/covers/${req.files.cover[0].filename}` : '', lyrics, uploadedBy: req.userId });
    }
    res.status(201).json({ message: 'Uploaded!' });
  } catch (error) { res.status(500).json({ error: 'Upload failed' }); }
});

// UPDATE SONG
router.put('/:id', protect, upload.fields([
  { name: 'lyrics', maxCount: 1 }, { name: 'cover', maxCount: 1 }
]), async (req, res) => {
  try {
    let song = await Song.findById(req.params.id);
    if (!song) song = await Mix.findById(req.params.id);
    if (!song) return res.status(404).json({ error: 'Not found' });
    const user = await User.findById(req.userId);
    if (song.uploadedBy.toString() !== req.userId && user.role === 'user') return res.status(403).json({ error: 'Not authorized' });
    const { title, album, genre } = req.body;
    if (title) song.title = title;
    if (album) song.album = album;
    if (genre) song.genre = genre;
    if (req.files?.cover) song.coverUrl = `/uploads/covers/${req.files.cover[0].filename}`;
    if (req.files?.lyrics) song.lyrics = fs.readFileSync(req.files.lyrics[0].path, 'utf8');
    await song.save();
    res.json({ message: 'Updated!', song });
  } catch (error) { res.status(500).json({ error: 'Update failed' }); }
});
// Update song lyrics only
router.put('/:id/lyrics', protect, upload.single('lyrics'), async (req, res) => {
    try {
        let song = await Song.findById(req.params.id);
        if (!song) song = await Mix.findById(req.params.id);
        if (!song) return res.status(404).json({ error: 'Song not found' });
        
        const user = await User.findById(req.userId);
        if (song.uploadedBy.toString() !== req.userId && user.role === 'user') {
            return res.status(403).json({ error: 'Not authorized' });
        }
        
        if (req.file && req.file.path) {
            const fs = require('fs');
            song.lyrics = fs.readFileSync(req.file.path, 'utf8');
            await song.save();
            res.json({ message: 'Lyrics updated!', song });
        } else {
            res.status(400).json({ error: 'No lyrics file provided' });
        }
    } catch (error) {
        res.status(500).json({ error: 'Update failed' });
    }
});
// DELETE SONG
router.delete('/:id', protect, async (req, res) => {
  try {
    let song = await Song.findById(req.params.id);
    if (!song) song = await Mix.findById(req.params.id);
    if (!song) return res.status(404).json({ error: 'Not found' });
    const user = await User.findById(req.userId);
    if (song.uploadedBy.toString() !== req.userId && user.role === 'user') return res.status(403).json({ error: 'Not authorized' });
    const artist = await Artist.findOne({ name: song.artist });
    if (artist) { artist.songs = artist.songs.filter(s => s.toString() !== req.params.id); await artist.save(); }
    await song.deleteOne();
    res.json({ message: 'Deleted' });
  } catch (error) { res.status(500).json({ error: 'Delete failed' }); }
});

// ============ ADMIN ROUTES ============

// AUTOCOMPLETE
router.get('/admin/search-artists/:query', protect, isAdmin, async (req, res) => {
  try {
    const artists = await Artist.find({ name: { $regex: req.params.query, $options: 'i' } }).select('name image').limit(10);
    res.json(artists);
  } catch (error) { res.json([]); }
});

// CHECK ARTIST
router.get('/admin/check-artist/:username', protect, isAdmin, async (req, res) => {
  try {
    const artist = await Artist.findOne({ name: req.params.username }).select('name image genre bio');
    if (artist) {
      const songCount = await Song.countDocuments({ artist: artist.name }) + await Mix.countDocuments({ artist: artist.name });
      res.json({ exists: true, artist: { ...artist.toObject(), songCount } });
    } else { res.json({ exists: false }); }
  } catch (error) { res.json({ exists: false }); }
});

// CREATE ARTIST
router.post('/admin/create-artist', protect, isAdmin, upload.fields([{ name: 'avatar', maxCount: 1 }]), async (req, res) => {
  try {
    const { username, genre, bio } = req.body;
    if (!username || !username.trim()) return res.status(400).json({ error: 'Artist name required' });
    const cleanName = username.trim();
    const exists = await Artist.findOne({ name: cleanName });
    if (exists) return res.status(400).json({ error: 'Artist already exists' });
    const artist = await Artist.create({ name: cleanName, genre: genre || '', bio: bio || '', image: req.files?.avatar ? `/uploads/covers/${req.files.avatar[0].filename}` : '', createdBy: req.userId });
    res.status(201).json({ message: 'Artist created!', artist });
  } catch (error) { res.status(500).json({ error: 'Create failed' }); }
});

// ADMIN UPLOAD SONG
router.post('/admin/upload', protect, isAdmin, upload.fields([
  { name: 'audio', maxCount: 1 }, { name: 'cover', maxCount: 1 }, { name: 'lyrics', maxCount: 1 }
]), async (req, res) => {
  try {
    const { title, artist } = req.body;
    if (!req.files || !req.files.audio) return res.status(400).json({ error: 'Audio file required' });
    if (!artist) return res.status(400).json({ error: 'Artist name required' });
    
    let artistUser = await User.findOne({ username: artist });
    if (!artistUser) artistUser = await User.create({ username: artist, role: 'artist' });
    let lyrics = '';
    if (req.files.lyrics) lyrics = fs.readFileSync(req.files.lyrics[0].path, 'utf8');
    const isDJ = artist.toLowerCase().startsWith('dj');
    let savedItem;
    const songData = { title, artist, fileUrl: `/uploads/music/${req.files.audio[0].filename}`, coverUrl: req.files.cover ? `/uploads/covers/${req.files.cover[0].filename}` : '', lyrics, uploadedBy: artistUser._id };
    if (isDJ) { savedItem = await Mix.create(songData); }
    else { savedItem = await Song.create(songData); }
    const artistDoc = await Artist.findOne({ name: artist });
    if (artistDoc && savedItem) { artistDoc.songs.push(savedItem._id); await artistDoc.save(); }
    console.log('✅ Uploaded:', title, 'by', artist);
    res.status(201).json({ message: 'Uploaded!', song: savedItem });
  } catch (error) { console.error('Upload error:', error); res.status(500).json({ error: 'Upload failed' }); }
});

// ADMIN MIX UPLOAD - 2GB
router.post('/admin/upload-mix', protect, isAdmin, mixUpload.fields([
  { name: 'audio', maxCount: 1 }, { name: 'cover', maxCount: 1 }, { name: 'lyrics', maxCount: 1 }
]), async (req, res) => {
  try {
    const { title, artist } = req.body;
    if (!req.files || !req.files.audio) return res.status(400).json({ error: 'Audio file required' });
    if (!artist) return res.status(400).json({ error: 'Artist name required' });
    let artistUser = await User.findOne({ username: artist });
    if (!artistUser) artistUser = await User.create({ username: artist, role: 'artist' });
    let lyrics = '';
    if (req.files.lyrics) lyrics = fs.readFileSync(req.files.lyrics[0].path, 'utf8');
    const savedItem = await Mix.create({ title, artist, fileUrl: `/uploads/music/${req.files.audio[0].filename}`, coverUrl: req.files.cover ? `/uploads/covers/${req.files.cover[0].filename}` : '', lyrics, uploadedBy: artistUser._id });
    const artistDoc = await Artist.findOne({ name: artist });
    if (artistDoc) { artistDoc.songs.push(savedItem._id); await artistDoc.save(); }
    console.log('✅ Mix uploaded:', title, 'by', artist);
    res.status(201).json({ message: 'Mix uploaded!', song: savedItem });
  } catch (error) { console.error('Mix upload error:', error); res.status(500).json({ error: 'Upload failed' }); }
});

module.exports = router;