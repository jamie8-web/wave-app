const express = require('express');
const https = require('https');
const router = express.Router();

// Proxy Deezer search
router.get('/deezer/:query', async (req, res) => {
    try {
        https.get(`https://api.deezer.com/search?q=${encodeURIComponent(req.params.query)}&limit=15`, (apiRes) => {
            let data = '';
            apiRes.on('data', chunk => data += chunk);
            apiRes.on('end', () => {
                try { res.json(JSON.parse(data)); } catch(e) { res.json({data:[]}); }
            });
        }).on('error', () => res.json({data:[]}));
    } catch(e) { res.json({data:[]}); }
});

// Gemini AI Chat with fallback
router.post('/', async (req, res) => {
    try {
        const { message } = req.body;
        const apiKey = process.env.GEMINI_API_KEY;
        
        const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{ parts: [{ text: message }] }]
                })
            }
        );
        
        const data = await response.json();
        
        // If Gemini fails or rate limited, use fallback
        if (data.error) {
            const msg = message.toLowerCase();
            let reply = '';
            if (msg.includes('hello') || msg.includes('hey') || msg.includes('hi')) {
                reply = "Hey there! I'm your Wave assistant. Ask me anything about music! 🎵";
            } else if (msg.includes('song') || msg.includes('music') || msg.includes('play')) {
                reply = "Check out the Home tab for all available songs, or use the Search tab to find specific tracks!";
            } else if (msg.includes('recommend') || msg.includes('suggest')) {
                reply = "I recommend checking the Home tab for popular songs, or use Deeper Search to discover new music online!";
            } else if (msg.includes('artist')) {
                reply = "Head to the Artists tab to see all artists and their music!";
            } else if (msg.includes('mix') || msg.includes('dj')) {
                reply = "Check the Mixes tab for DJ mixes with extended play!";
            } else if (msg.includes('thank')) {
                reply = "You're welcome! Enjoy the music! 🌊";
            } else if (msg.includes('bye') || msg.includes('goodbye')) {
                reply = "See you later! Keep riding the wave! 🌊";
            } else {
                reply = "I can help with music! Try asking about songs, artists, recommendations, or DJ mixes.";
            }
            return res.json({ reply });
        }
        
        const reply = data.candidates?.[0]?.content?.parts?.[0]?.text || 'Can you rephrase that?';
        res.json({ reply });
    } catch(e) {
        res.json({ reply: 'AI is thinking... Try again in a moment.' });
    }
});

module.exports = router;