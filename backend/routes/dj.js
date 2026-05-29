const express = require('express');
const router = express.Router();
const { PythonShell } = require('python-shell');
const Song = require('../models/Song');

async function getRecommendations(userId, limit = 5) {
    try {
        const options = {
            mode: 'text',
            pythonOptions: ['-u'],
            scriptPath: './services',
            args: [userId]
        };
        
        const results = await PythonShell.run('recommend.py', options);
        const recommendedIds = JSON.parse(results[0]);
        
        if (recommendedIds && recommendedIds.length > 0) {
            const songs = [];
            for (let id of recommendedIds.slice(0, limit)) {
                const song = await Song.findById(id);
                if (song) songs.push(song);
            }
            if (songs.length > 0) return songs;
        }
        
        // Fallback to random songs
        const songs = await Song.find();
        const shuffled = songs.sort(() => 0.5 - Math.random());
        return shuffled.slice(0, limit);
        
    } catch (error) {
        console.error('Recommendation error:', error);
        const songs = await Song.find();
        const shuffled = songs.sort(() => 0.5 - Math.random());
        return shuffled.slice(0, limit);
    }
}

router.get('/next/:userId', async (req, res) => {
    try {
        const userId = req.params.userId;
        const recommendations = await getRecommendations(userId, 5);
        
        res.json({
            success: true,
            recommendations: recommendations.map(song => ({
                id: song._id,
                title: song.title,
                artist: song.artist,
                fileUrl: song.fileUrl,
                coverUrl: song.coverUrl
            }))
        });
    } catch (error) {
        console.error('DJ error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

module.exports = router;