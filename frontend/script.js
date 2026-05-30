const API_URL = 'https://attractive-heart-production-a507.up.railway.app/api';
let token = localStorage.getItem('token');

// ============ AUTH CHECK - REDIRECT TO LOGIN IF NO TOKEN ============
if (!token) {
    window.location.href = 'login.html';
}

let currentAudio = new Audio();
let allSongs = [];
let ci = 0;
let currentWeeklyPlaylist = null;
let isPlaying = false;
let isShuffle = false;
let isRepeat = false;
let favorites = JSON.parse(localStorage.getItem('favorites') || '[]');
let playlists = JSON.parse(localStorage.getItem('playlists') || '[]');
let cp = null;
let recentSongs = JSON.parse(localStorage.getItem('recent') || '[]');
let currentArtist = null;
let selectedArtist = '';
let voiceEnabled = true;
window.currentLyrics = '';
let lyricsInterval = null;
let lyricsLines = [];
let djMode = false;
let djQueue = [];
let djIndex = 0;
let djQueueAI = [];
let djQueueIndex = 0;
let djModeActive = false;
let activeMenu = null;

// ============ WEEKLY WAVE VARIABLES ============
let weeklyWaveSongs = [];
let weeklyWaveFilter = '';
let weeklyWaveSort = { column: 'index', direction: 'asc' };

// ============ HELPER FUNCTIONS ============

function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/[&<>]/g, function(m) {
        if (m === '&') return '&amp;';
        if (m === '<') return '&lt;';
        if (m === '>') return '&gt;';
        return m;
    });
}

function formatTime(seconds) {
    if (isNaN(seconds)) return '0:00';
    return Math.floor(seconds / 60) + ':' + Math.floor(seconds % 60).toString().padStart(2, '0');
}

function showToastMessage(message) {
    let toast = document.getElementById('wave-toast');
    if (!toast) {
        toast = document.createElement('div');
        toast.id = 'wave-toast';
        toast.style.cssText = `
            position: fixed;
            bottom: 30px;
            left: 50%;
            transform: translateX(-50%);
            background: #1DB954;
            color: black;
            padding: 12px 24px;
            border-radius: 30px;
            font-weight: bold;
            z-index: 1100;
            display: none;
            animation: slideUp 0.3s ease;
        `;
        document.body.appendChild(toast);
    }
    toast.textContent = message;
    toast.style.display = 'block';
    setTimeout(() => {
        toast.style.display = 'none';
    }, 2000);
}

function getCircularColor(index) {
    const colors = ['#1DB954', '#3b82f6', '#f59e0b', '#8b5cf6', '#ef4444', '#ec4898', '#06b6d4', '#f97316', '#a855f7', '#14b8a6'];
    return colors[index % colors.length];
}

function getInitial(title) {
    return title ? title.charAt(0).toUpperCase() : '?';
}

// ============ UPDATE STATUS WITH GREEN HIGHLIGHT ============
function updateStatus() {
    const allRows = document.querySelectorAll('.song-row');
    allRows.forEach(function(row) {
        row.classList.remove('playing');
        row.style.background = '';
        row.style.borderLeft = '';
    });
    
    if (!allSongs.length || !allSongs[ci] || !isPlaying) {
        return;
    }
    
    const currentSong = allSongs[ci];
    const currentTitle = currentSong.title;
    const currentArtist = currentSong.artist;
    
    for (let i = 0; i < allRows.length; i++) {
        const row = allRows[i];
        const titleEl = row.querySelector('.song-title-text');
        const artistEl = row.querySelector('.song-artist-text');
        
        if (titleEl && artistEl) {
            const rowTitle = titleEl.textContent;
            const rowArtist = artistEl.textContent;
            
            if (rowTitle === currentTitle && rowArtist === currentArtist) {
                row.classList.add('playing');
                row.style.background = 'rgba(29, 185, 84, 0.15)';
                row.style.borderLeft = '3px solid #1DB954';
                break;
            }
        }
    }
}

// ============ UPDATE FAVORITE BUTTON ============
function updateFavBtn() {
    const song = allSongs[ci];
    if (!song) {
        const favBtn = document.getElementById('favBtn');
        if (favBtn) favBtn.innerHTML = '<i class="far fa-heart"></i>';
        return;
    }
    const songKey = `${song.title} - ${song.artist}`;
    const isFav = favorites.includes(songKey);
    const favBtn = document.getElementById('favBtn');
    if (favBtn) {
        favBtn.innerHTML = isFav ? '<i class="fas fa-heart" style="color:#1DB954;"></i>' : '<i class="far fa-heart"></i>';
    }
}

// ============ PLAYER CONTROLS ============
function playSong(index) {
    ci = index;
    const song = allSongs[ci];
    if (!song) return;
    currentAudio.src = `${API_URL.replace('/api', '')}${song.fileUrl}`;
    currentAudio.play();
    isPlaying = true;
    document.getElementById('playerTitle').textContent = song.title || '?';
    document.getElementById('playerArtist').textContent = song.artist || '?';
    document.getElementById('playBtn').innerHTML = '<i class="fas fa-pause"></i>';
    
    // Show player
    document.querySelector('.player').classList.add('visible');
    
    const playerImg = document.getElementById('playerImg');
    if (song.coverUrl && song.coverUrl !== '') {
        playerImg.src = `${API_URL.replace('/api', '')}${song.coverUrl}`;
        playerImg.style.display = 'block';
    } else {
        playerImg.src = `https://placehold.co/56x56/1DB954/121212?text=${encodeURIComponent(song.title.charAt(0) || '?')}`;
        playerImg.style.display = 'block';
    }
    
    window.currentLyrics = song.lyrics || '';
    updateFavBtn();
    addRecent(song);
    updateStatus();
    showRightPanel(song);
}
function playSongById(id) {
    fetch(`${API_URL}/songs/${id}`).then(res => res.json()).then(song => {
        currentAudio.src = `${API_URL.replace('/api', '')}${song.fileUrl}`;
        currentAudio.play();
        isPlaying = true;
        document.getElementById('playerTitle').textContent = song.title;
        document.getElementById('playerArtist').textContent = song.artist;
        document.getElementById('playBtn').innerHTML = '<i class="fas fa-pause"></i>';
        
        // Show player
        document.querySelector('.player').classList.add('visible');
        
        const playerImg = document.getElementById('playerImg');
        if (song.coverUrl && song.coverUrl !== '') {
            playerImg.src = `${API_URL.replace('/api', '')}${song.coverUrl}`;
            playerImg.style.display = 'block';
        } else {
            playerImg.src = `https://placehold.co/56x56/1DB954/121212?text=${encodeURIComponent(song.title.charAt(0) || '?')}`;
            playerImg.style.display = 'block';
        }
        
        window.currentLyrics = song.lyrics || '';
        showRightPanel(song);
        addRecent(song);
        updateFavBtn();
        
        const songIndex = allSongs.findIndex(s => s._id === song._id);
        if (songIndex !== -1) {
            ci = songIndex;
        } else {
            allSongs.push(song);
            ci = allSongs.length - 1;
        }
        
        document.querySelectorAll('.song-row').forEach(row => row.classList.remove('playing'));
        document.querySelector(`.song-row[data-song-id="${song._id}"]`)?.classList.add('playing');
        
    }).catch(err => console.error('Error playing song:', err));
}

function togglePlay() {
    if (currentAudio.src && currentAudio.duration) {
        if (currentAudio.paused) {
            currentAudio.play();
            isPlaying = true;
            document.getElementById('playBtn').innerHTML = '<i class="fas fa-pause"></i>';
            updateStatus();
        } else {
            currentAudio.pause();
            isPlaying = false;
            document.getElementById('playBtn').innerHTML = '<i class="fas fa-play"></i>';
            updateStatus();
        }
    }
}

// AI DJ PlayNext Function
async function playNext() {
    const userId = localStorage.getItem('userId');
    
    if (!userId) {
        console.error('No user ID found');
        return;
    }
    
    if (djModeActive && djQueueAI.length > 0 && djQueueIndex < djQueueAI.length) {
        const song = djQueueAI[djQueueIndex];
        djQueueIndex++;
        
        const intro = generateDJIntroForSong(song.title, song.artist, djQueueIndex, djQueueAI.length);
        speakDJIntro(intro, () => {
            const existingIndex = allSongs.findIndex(s => s._id === song.id);
            if (existingIndex === -1) {
                allSongs.push({
                    _id: song.id,
                    title: song.title,
                    artist: song.artist,
                    fileUrl: song.fileUrl,
                    coverUrl: song.coverUrl || ''
                });
                ci = allSongs.length - 1;
            } else {
                ci = existingIndex;
            }
            playSong(ci);
        });
        return;
    }
    
    try {
        const response = await fetch(`${API_URL}/dj/next/${userId}`);
        const data = await response.json();
        
        if (data.success && data.recommendations && data.recommendations.length > 0) {
            djQueueAI = data.recommendations;
            djQueueIndex = 0;
            djModeActive = true;
            
            const setIntro = `I've got ${data.recommendations.length} tracks for you. Let's start with ${data.recommendations[0].title} by ${data.recommendations[0].artist}.`;
            speakDJIntro(setIntro, () => {
                playNext();
            });
        } else {
            console.error('DJ failed:', data.error);
        }
    } catch (error) {
        console.error('Error:', error);
    }
}

function generateDJIntroForSong(title, artist, current, total) {
    const intros = [
        `Track ${current} of ${total}: ${title} by ${artist}. Here we go!`,
        `Next up in your set: ${title} from ${artist}.`,
        `Keeping the energy with ${title} by ${artist}.`,
        `Number ${current} - ${title} by ${artist}. Enjoy!`,
        `Here comes ${title} by ${artist}.`
    ];
    return intros[Math.floor(Math.random() * intros.length)];
}

function stopDJMode() {
    djModeActive = false;
    djQueueAI = [];
    djQueueIndex = 0;
    showToastMessage('DJ Mode ended');
}

function speakDJIntro(text, callback) {
    console.log('Speaking:', text);
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1.1;
    utterance.pitch = 0.9;
    utterance.onend = callback;
    speechSynthesis.speak(utterance);
}

let prevPressTimer = null;

function playPrev() {
    if (allSongs.length === 0) return;
    
    if (prevPressTimer) {
        clearTimeout(prevPressTimer);
        prevPressTimer = null;
        ci = (ci - 1 + allSongs.length) % allSongs.length;
        playSong(ci);
    } else {
        currentAudio.currentTime = 0;
        prevPressTimer = setTimeout(() => {
            prevPressTimer = null;
        }, 300);
    }
    updateFavBtn();
}

function toggleFavorite() {
    const song = allSongs[ci];
    if (!song) {
        showToastMessage('No song playing');
        return;
    }
    const songKey = `${song.title} - ${song.artist}`;
    const idx = favorites.indexOf(songKey);
    if (idx === -1) {
        favorites.push(songKey);
        showToastMessage(`❤️ Added "${song.title}" to Favorites`);
    } else {
        favorites.splice(idx, 1);
        showToastMessage(`💔 Removed "${song.title}" from Favorites`);
    }
    localStorage.setItem('favorites', JSON.stringify(favorites));
    updateFavBtn();
    refreshCurrentView();
}

function addToPlaylist() {
    if (!allSongs[ci]) {
        showToastMessage('No song playing');
        return;
    }
    const song = allSongs[ci];
    const songId = song._id;
    
    if (playlists.length === 0) {
        const createNew = confirm('No playlists found. Create one?');
        if (createNew) {
            const newName = prompt('Playlist name:');
            if (newName) {
                playlists.push({ name: newName, songs: [songId], description: '' });
                localStorage.setItem('playlists', JSON.stringify(playlists));
                showToastMessage(`✅ Created "${newName}" and added "${song.title}"`);
            }
        }
        return;
    }
    
    let playlistOptions = playlists.map((p, i) => `${i + 1}: ${p.name} (${p.songs.length} songs)`).join('\n');
    const choice = prompt(`Add "${song.title}" to playlist:\n\n${playlistOptions}\n\nEnter number (1-${playlists.length}) or "new" to create:`);
    
    if (choice === 'new') {
        const newName = prompt('New playlist name:');
        if (newName) {
            playlists.push({ name: newName, songs: [songId], description: '' });
            localStorage.setItem('playlists', JSON.stringify(playlists));
            showToastMessage(`✅ Created "${newName}" and added "${song.title}"`);
        }
    } else if (choice !== null) {
        const index = parseInt(choice) - 1;
        if (index >= 0 && index < playlists.length) {
            if (!playlists[index].songs.includes(songId)) {
                playlists[index].songs.push(songId);
                localStorage.setItem('playlists', JSON.stringify(playlists));
                showToastMessage(`✅ Added "${song.title}" to ${playlists[index].name}`);
            } else {
                showToastMessage(`⚠️ "${song.title}" already in ${playlists[index].name}`);
            }
        } else {
            showToastMessage('Invalid selection');
        }
    }
}

function toggleShuffle() {
    isShuffle = !isShuffle;
    const shuffleBtn = document.getElementById('shuffleBtn');
    if (shuffleBtn) shuffleBtn.style.color = isShuffle ? '#1DB954' : '#b3b3b3';
}

function toggleRepeat() {
    isRepeat = !isRepeat;
    const repeatBtn = document.getElementById('repeatBtn');
    if (repeatBtn) repeatBtn.style.color = isRepeat ? '#1DB954' : '#b3b3b3';
}

function seekTo(event) {
    const rect = event.currentTarget.getBoundingClientRect();
    currentAudio.currentTime = ((event.clientX - rect.left) / rect.width) * currentAudio.duration;
}

function setVolume(value) {
    currentAudio.volume = value / 100;
}

// ============ AUDIO EVENT LISTENERS ============
currentAudio.addEventListener('ended', () => {
    if (djMode) {
        djIndex++;
        setTimeout(() => playDJTrack(), 500);
    } else if (isRepeat) {
        currentAudio.currentTime = 0;
        currentAudio.play();
    } else {
        if (djModeActive && djQueueIndex < djQueueAI.length) {
            playNext();
        } else {
            if (window.playlistQueue && window.playlistQueueIndex < window.playlistQueue.length - 1) {
                window.playlistQueueIndex++;
                playSongById(window.playlistQueue[window.playlistQueueIndex]._id);
            } else if (allSongs.length) {
                ci = isShuffle ? Math.floor(Math.random() * allSongs.length) : (ci + 1) % allSongs.length;
                playSong(ci);
            } else {
                // Hide player when no more songs
                document.querySelector('.player').classList.remove('visible');
            }
        }
    }
    updateFavBtn();
});

currentAudio.addEventListener('timeupdate', () => {
    const progressFill = document.getElementById('progressFill');
    const currentTimeSpan = document.getElementById('currentTime');
    const durationSpan = document.getElementById('duration');
    if (progressFill && currentAudio.duration) {
        progressFill.style.width = (currentAudio.currentTime / currentAudio.duration) * 100 + '%';
        currentTimeSpan.textContent = formatTime(currentAudio.currentTime);
        durationSpan.textContent = formatTime(currentAudio.duration);
    }
});

// ============ RECENT SONGS ============
function addRecent(song) {
    recentSongs = recentSongs.filter(r => r._id !== song._id);
    recentSongs.unshift({ _id: song._id, title: song.title, artist: song.artist, coverUrl: song.coverUrl });
    recentSongs = recentSongs.slice(0, 10);
    localStorage.setItem('recent', JSON.stringify(recentSongs));
    showRecent();
}

function showRecent() {
    const container = document.getElementById('recentGrid');
    if (!container) return;
    
    if (!recentSongs.length) {
        container.innerHTML = '<div style="padding:40px; text-align:center; color:#b3b3b3;">No recent songs</div>';
        return;
    }
    
    const recentSongsData = [];
    for (let r of recentSongs.slice(0, 6)) {
        const song = allSongs.find(s => s._id === r._id);
        if (song) recentSongsData.push(song);
    }
    
    if (!recentSongsData.length) {
        container.innerHTML = '<div style="padding:40px; text-align:center; color:#b3b3b3;">No recent songs</div>';
        return;
    }
    
    let html = '<table class="songs-table"><thead><tr>';
    html += '<th>#</th><th>Title</th>';
    html += '<th>Album</th><th>Duration</th><th></th>';
    html += '</tr></thead><tbody>';
    
    recentSongsData.forEach((song, index) => {
        html += renderSongRow(song, index, true, true);
    });
    
    html += '</tbody></table>';
    container.innerHTML = html;
}

// ============ RENDER SONG ROW ============
function renderSongRow(song, index, showAlbum = true, showDuration = true) {
    const initial = getInitial(song.title);
    const color = getCircularColor(index);
    const songKey = `${song.title} - ${song.artist}`;
    const isFavorite = favorites.includes(songKey);
    const duration = song.duration || '--:--';
    
    return `
        <tr data-song-id="${song._id}" onclick="playSongById('${song._id}')">
            <td class="index-cell">${index + 1}${isFavorite ? ' ❤️' : ''}</td>
            <td>
                <div class="title-cell">
                    <div class="circular-icon" style="background: linear-gradient(135deg, ${color}, ${color}cc);">
                        ${initial}
                    </div>
                    <div class="title-info">
                        <span class="song-title-text">${escapeHtml(song.title)}</span>
                        <span class="song-artist-text">${escapeHtml(song.artist)}</span>
                    </div>
                </div>
            </td>
            ${showAlbum ? `<td class="album-cell">${escapeHtml(song.album || 'Single')}</td>` : ''}
            ${showDuration ? `<td class="duration-cell">${duration}</td>` : ''}
            <td class="menu-cell">
                <button class="menu-btn" onclick="event.stopPropagation(); openMenu(event, ${JSON.stringify(song).replace(/"/g, '&quot;')})">⋮</button>
            </td>
        </table>
    `;
}

// ============ THREE-DOT MENU ============
function closeMenu() {
    if (activeMenu) {
        activeMenu.remove();
        activeMenu = null;
    }
    const overlay = document.querySelector('.menu-overlay');
    if (overlay) overlay.style.display = 'none';
}

function openMenu(event, song) {
    event.stopPropagation();
    closeMenu();
    
    const button = event.currentTarget;
    const rect = button.getBoundingClientRect();
    
    fetch(`${API_URL}/auth/profile`, {
        headers: { 'Authorization': `Bearer ${token}` }
    }).then(response => response.json()).then(user => {
        const isAdmin = (user.role === 'admin' || user.role === 'superadmin');
        const isOwner = (song.uploadedBy === user._id);
        const canEdit = isAdmin || isOwner;
        
        const songKey = `${song.title} - ${song.artist}`;
        const isFavorite = favorites.includes(songKey);
        
        const menu = document.createElement('div');
        menu.className = 'popup-menu';
        menu.style.position = 'fixed';
        menu.style.top = (rect.bottom + 5) + 'px';
        menu.style.right = (window.innerWidth - rect.right) + 'px';
        menu.style.backgroundColor = '#282828';
        menu.style.borderRadius = '8px';
        menu.style.boxShadow = '0 4px 20px rgba(0,0,0,0.5)';
        menu.style.minWidth = '200px';
        menu.style.zIndex = '10000';
        menu.style.overflow = 'hidden';
        
        let menuHTML = `
            <div class="popup-menu-item" onclick="menuAction('favorite', '${song._id}')">
                <span>${isFavorite ? '❤️' : '🤍'}</span> ${isFavorite ? 'Remove from Favorites' : 'Add to Favorites'}
            </div>
            <div class="popup-menu-item" onclick="menuAction('playlist', '${song._id}')">
                <span>📋</span> Add to Playlist
            </div>
            <div class="popup-menu-item" onclick="menuAction('artist', '${song._id}')">
                <span>🎤</span> Go to Artist
            </div>
            <div class="popup-menu-item" onclick="menuAction('album', '${song._id}')">
                <span>💿</span> Go to Album
            </div>
            <div class="popup-menu-item" onclick="menuAction('share', '${song._id}')">
                <span>📤</span> Share
            </div>
        `;
        
        if (canEdit) {
            menuHTML += `
                <div class="popup-menu-item" onclick="menuAction('edit', '${song._id}')">
                    <span>✏️</span> Edit Song
                </div>
                <div class="popup-menu-item danger" onclick="menuAction('delete', '${song._id}')">
                    <span>🗑️</span> Delete Song
                </div>
            `;
        }
        
        menu.innerHTML = menuHTML;
        document.body.appendChild(menu);
        activeMenu = menu;
        
        setTimeout(() => {
            document.addEventListener('click', function closeOnClick(e) {
                if (!menu.contains(e.target) && !button.contains(e.target)) {
                    closeMenu();
                    document.removeEventListener('click', closeOnClick);
                }
            });
        }, 10);
        
    }).catch(error => {
        console.error('Error getting user profile:', error);
        const songKey = `${song.title} - ${song.artist}`;
        const isFavorite = favorites.includes(songKey);
        const menu = document.createElement('div');
        menu.className = 'popup-menu';
        menu.style.position = 'fixed';
        menu.style.top = (rect.bottom + 5) + 'px';
        menu.style.right = (window.innerWidth - rect.right) + 'px';
        menu.style.backgroundColor = '#282828';
        menu.style.borderRadius = '8px';
        menu.style.boxShadow = '0 4px 20px rgba(0,0,0,0.5)';
        menu.style.minWidth = '200px';
        menu.style.zIndex = '10000';
        menu.style.overflow = 'hidden';
        menu.innerHTML = `
            <div class="popup-menu-item" onclick="menuAction('favorite', '${song._id}')">
                <span>${isFavorite ? '❤️' : '🤍'}</span> ${isFavorite ? 'Remove from Favorites' : 'Add to Favorites'}
            </div>
            <div class="popup-menu-item" onclick="menuAction('playlist', '${song._id}')">
                <span>📋</span> Add to Playlist
            </div>
            <div class="popup-menu-item" onclick="menuAction('share', '${song._id}')">
                <span>📤</span> Share
            </div>
        `;
        document.body.appendChild(menu);
        activeMenu = menu;
    });
}

function menuAction(action, songId) {
    const song = allSongs.find(s => s._id === songId);
    if (!song) {
        showToastMessage('Song not found');
        return;
    }
    
    closeMenu();
    
    switch(action) {
        case 'favorite':
            const songKey = `${song.title} - ${song.artist}`;
            const idx = favorites.indexOf(songKey);
            if (idx === -1) {
                favorites.push(songKey);
                showToastMessage(`✅ Added "${song.title}" to Favorites`);
            } else {
                favorites.splice(idx, 1);
                showToastMessage(`❌ Removed "${song.title}" from Favorites`);
            }
            localStorage.setItem('favorites', JSON.stringify(favorites));
            updateFavBtn();
            const favTab = document.getElementById('favoritesTab');
            if (favTab && favTab.style.display !== 'none') {
                showFavorites();
            }
            break;
            
        case 'playlist':
            if (playlists.length === 0) {
                const newName = prompt('No playlists. Create one:');
                if (newName) {
                    playlists.push({ name: newName, songs: [songId], description: '' });
                    localStorage.setItem('playlists', JSON.stringify(playlists));
                    showToastMessage(`✅ Created "${newName}" and added "${song.title}"`);
                }
            } else {
                let options = playlists.map((p, i) => `${i + 1}: ${p.name}`).join('\n');
                const choice = prompt(`Add to playlist:\n${options}\n\nEnter number or "new":`);
                if (choice === 'new') {
                    const newName = prompt('Playlist name:');
                    if (newName) {
                        playlists.push({ name: newName, songs: [songId], description: '' });
                        localStorage.setItem('playlists', JSON.stringify(playlists));
                        showToastMessage(`✅ Created "${newName}" and added "${song.title}"`);
                    }
                } else if (choice) {
                    const index = parseInt(choice) - 1;
                    if (index >= 0 && index < playlists.length) {
                        if (!playlists[index].songs.includes(songId)) {
                            playlists[index].songs.push(songId);
                            localStorage.setItem('playlists', JSON.stringify(playlists));
                            showToastMessage(`✅ Added "${song.title}" to ${playlists[index].name}`);
                        } else {
                            showToastMessage(`⚠️ "${song.title}" already in playlist`);
                        }
                    }
                }
            }
            break;
            
        case 'artist':
            showToastMessage(`🎤 Go to artist: ${song.artist}`);
            break;
            
        case 'album':
            showToastMessage(`💿 Album: ${song.album || 'Single'}`);
            break;
            
        case 'share':
            navigator.clipboard.writeText(`Check out "${song.title}" by ${song.artist} on Wave!`);
            showToastMessage(`🔗 Link copied!`);
            break;
            
        case 'edit':
            document.getElementById('editSongId').value = song._id;
            document.getElementById('editTitle').value = song.title;
            document.getElementById('editAlbum').value = song.album || '';
            document.getElementById('editGenre').value = song.genre || '';
            document.getElementById('editModal').style.display = 'flex';
            break;
            
        case 'delete':
            if (confirm(`Delete "${song.title}" permanently? This cannot be undone.`)) {
                deleteSong(song._id);
            }
            break;
    }
}

function refreshCurrentView() {
    const activeTab = document.querySelector('.tab-content:not([style*="display: none"])')?.id;
    if (activeTab === 'homeTab') loadAllSongs();
    else if (activeTab === 'favoritesTab') showFavorites();
    else if (activeTab === 'playlistsTab') showPlaylists();
    else if (activeTab === 'artistsTab' && currentArtist) showArtistSongs(currentArtist, '');
    else if (activeTab === 'searchTab') searchSongs(document.getElementById('searchInput')?.value || '');
    else if (activeTab === 'uploadTab') loadMyUploads();
}

// ============ LOAD SONGS ============
async function loadAllSongs() {
    const popularGrid = document.getElementById('popularGrid');
    const mixesGrid = document.getElementById('mixesGrid');
    if (popularGrid) popularGrid.innerHTML = '<div style="padding:40px; text-align:center;">Loading...</div>';
    if (mixesGrid) mixesGrid.innerHTML = '<div style="padding:40px; text-align:center;">Loading...</div>';
    
    try {
        const response = await fetch(`${API_URL}/songs`);
        allSongs = await response.json();
        
        const prefs = JSON.parse(localStorage.getItem('wave_preferences') || '[]');
        if (prefs.length > 0) {
            const prefArtists = [];
            for (let id of prefs) {
                try {
                    const artistRes = await fetch(`${API_URL}/artists/${id}`);
                    const artist = await artistRes.json();
                    if (artist && artist.name) prefArtists.push(artist.name);
                } catch (error) {}
            }
            if (prefArtists.length > 0) {
                const preferred = allSongs.filter(s => prefArtists.includes(s.artist));
                const rest = allSongs.filter(s => !prefArtists.includes(s.artist));
                allSongs = [...preferred, ...rest];
            }
        }
        
        displaySongsTable(allSongs, 'popularGrid');
        
        const mixesRes = await fetch(`${API_URL}/songs/mixes`);
        const mixes = await mixesRes.json();
        displayMixesTable(mixes);
        showRecent();
        loadRecommendedSongs();
        updateMoodCounts();
        loadWeeklyWavePlaylist();
        setTimeout(() => {
            loadWeeklyWave();
            loadPastWeeklyWaves();
        }, 500);
        
    } catch (error) {
        console.error('Error loading songs:', error);
    }
}

function displaySongsTable(songs, containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;
    
    if (!songs || !songs.length) {
        container.innerHTML = '<div style="padding:40px; text-align:center; color:#b3b3b3;">No songs found</div>';
        return;
    }
    
    let html = '<table class="songs-table"><thead></tr>';
    html += '<th>#</th><th>Title</th>';
    html += '<th>Album</th><th>Duration</th><th></th>';
    html += '<tr></thead><tbody>';
    
    songs.forEach((song, index) => {
        html += renderSongRow(song, index, true, true);
    });
    
    html += '</tbody></table>';
    container.innerHTML = html;
    
    updateStatus();
}

function displayMixesTable(mixes) {
    const container = document.getElementById('mixesGrid');
    if (!container) return;
    
    if (!mixes || !mixes.length) {
        container.innerHTML = '<div style="padding:40px; text-align:center; color:#b3b3b3;">No mixes found</div>';
        return;
    }
    
    let html = '<table class="songs-table"><thead><tr>';
    html += '<th>#</th><th>Title</th>';
    html += '<th>Artist</th><th>Duration</th><th></th>';
    html += '</tr></thead><tbody>';
    
    mixes.forEach((mix, index) => {
        const initial = getInitial(mix.title);
        const color = getCircularColor(index);
        html += `
            <tr class="song-row" onclick="playMix('${API_URL.replace('/api', '')}${mix.fileUrl}','${escapeHtml(mix.title)}','${escapeHtml(mix.artist)}','${mix.coverUrl || ''}')">
                <td class="index-cell">${index + 1}</td>
                <td>
                    <div class="title-cell">
                        <div class="circular-icon" style="background: linear-gradient(135deg, ${color}, ${color}cc);">
                            ${initial}
                        </div>
                        <div class="title-info">
                            <span class="song-title-text">${escapeHtml(mix.title)}</span>
                            <span class="song-artist-text">${escapeHtml(mix.artist)}</span>
                        </div>
                    </div>
                </td>
                <td class="album-cell">${escapeHtml(mix.artist)}</td>
                <td class="duration-cell">--:--</td>
                <td class="menu-cell"><button class="menu-btn" onclick="event.stopPropagation(); alert('Mix options coming soon')">⋮</button></td>
            </tr>
        `;
    });
    
    html += '</tbody></tr>';
    container.innerHTML = html;
    
    updateStatus();
}

function playMix(url, title, artist, cover) {
    currentAudio.src = url;
    currentAudio.play();
    isPlaying = true;
    document.getElementById('playerTitle').textContent = title;
    document.getElementById('playerArtist').textContent = artist;
    document.getElementById('playBtn').innerHTML = '<i class="fas fa-pause"></i>';
    
    // Show player
    document.querySelector('.player').classList.add('visible');
    
    const playerImg = document.getElementById('playerImg');
    if (cover && cover !== '') {
        playerImg.src = API_URL.replace('/api', '') + cover;
        playerImg.style.display = 'block';
    } else {
        playerImg.src = `https://placehold.co/56x56/1DB954/121212?text=${encodeURIComponent(title.charAt(0) || '?')}`;
        playerImg.style.display = 'block';
    }
    
    updateStatus();
}

// ============ HOME TAB FUNCTIONS ============
function createHomeSongCard(song) {
    const coverUrl = song.coverUrl ? API_URL.replace('/api', '') + song.coverUrl : 'https://placehold.co/300x300/1DB954/121212?text=🎵';
    return `
        <div class="song-card">
            <img src="${coverUrl}" onerror="this.src='https://placehold.co/300x300/1DB954/121212?text=🎵'">
            <div class="song-title">${escapeHtml(song.title) || '?'}</div>
            <div class="song-artist">${escapeHtml(song.artist) || '?'}</div>
        </div>
    `;
}

async function loadRecommendedSongs() {
    const grid = document.getElementById('recommendedGrid');
    if (!grid) return;
    try {
        const prefs = JSON.parse(localStorage.getItem('wave_preferences') || '[]');
        if (prefs.length === 0) {
            grid.innerHTML = '<div class="song-card-placeholder">No favorites selected.</div>';
            return;
        }
        const artistNames = [];
        for (let id of prefs) {
            try {
                const res = await fetch(`${API_URL}/artists/${id}`);
                const artist = await res.json();
                if (artist.name) artistNames.push(artist.name);
            } catch(e) {}
        }
        let recommended = allSongs.filter(song => artistNames.includes(song.artist));
        recommended = recommended.slice(0, 10);
        if (recommended.length === 0) {
            grid.innerHTML = '<div class="song-card-placeholder">No songs from your favorite artists.</div>';
            return;
        }
        grid.innerHTML = recommended.map(song => createHomeSongCard(song)).join('');
        recommended.forEach((song, index) => {
            const card = grid.children[index];
            if (card) card.onclick = () => playSongById(song._id);
        });
    } catch (error) {
        grid.innerHTML = '<div class="song-card-placeholder">Error loading recommendations.</div>';
    }
}

function updateMoodCounts() {
    const counts = { chill: 0, energetic: 0, sad: 0, happy: 0 };
    allSongs.forEach(song => {
        if (song.genre) {
            const genre = song.genre.toLowerCase();
            if (['lofi', 'acoustic', 'ambient', 'rnb', 'chill', 'jazz', 'classical', 'indie', 'folk'].some(g => genre.includes(g))) counts.chill++;
            else if (['rock', 'electronic', 'dance', 'edm', 'metal', 'punk', 'hardcore', 'trap'].some(g => genre.includes(g))) counts.energetic++;
            else if (['ballad', 'emo', 'sad', 'melancholic', 'blues', 'soul'].some(g => genre.includes(g))) counts.sad++;
            else if (['pop', 'funk', 'reggae', 'happy', 'upbeat', 'disco', 'country', 'latin'].some(g => genre.includes(g))) counts.happy++;
        }
    });
    const chillEl = document.getElementById('chillCount');
    const energeticEl = document.getElementById('energeticCount');
    const sadEl = document.getElementById('sadCount');
    const happyEl = document.getElementById('happyCount');
    if (chillEl) chillEl.textContent = `${counts.chill} songs`;
    if (energeticEl) energeticEl.textContent = `${counts.energetic} songs`;
    if (sadEl) sadEl.textContent = `${counts.sad} songs`;
    if (happyEl) happyEl.textContent = `${counts.happy} songs`;
}

async function loadWeeklyWave() {
    const grid = document.getElementById('weeklyWaveGrid');
    if (!grid) return;
    try {
        const response = await fetch(`${API_URL}/playlists/weekly-wave`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!response.ok) throw new Error('Failed to load');
        const playlist = await response.json();
        currentWeeklyPlaylist = playlist;
        if (!playlist.songs || playlist.songs.length === 0) {
            grid.innerHTML = '<div class="song-card-placeholder">No songs available this week.</div>';
            return;
        }
        grid.innerHTML = playlist.songs.map(song => createHomeSongCard(song)).join('');
        playlist.songs.forEach((song, index) => {
            const card = grid.children[index];
            if (card) card.onclick = () => playSongById(song._id);
        });
    } catch (error) {
        grid.innerHTML = '<div class="song-card-placeholder">Could not load weekly wave.</div>';
    }
}

async function loadWeeklyWavePlaylist() {
    try {
        const response = await fetch(`${API_URL}/playlists/weekly-wave`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!response.ok) throw new Error('Failed to load');
        const playlist = await response.json();
        
        console.log('Weekly wave playlist response:', playlist);
        
        if (playlist.songs && playlist.songs.length) {
            // Make sure we have valid song objects
            weeklyWaveSongs = playlist.songs.filter(song => song && song.title && song.artist);
            console.log('Filtered weekly wave songs:', weeklyWaveSongs.length);
        } else {
            weeklyWaveSongs = [];
        }
        
        const count = weeklyWaveSongs.length;
        let totalSeconds = 0;
        for (let song of weeklyWaveSongs) {
            if (song.duration) {
                const parts = song.duration.split(':');
                totalSeconds += parseInt(parts[0]) * 60 + parseInt(parts[1]);
            }
        }
        const minutes = Math.floor(totalSeconds / 60);
        const durationText = minutes > 0 ? `${minutes} min` : '0 min';
        
        const weeklyWaveCount = document.getElementById('weeklyWaveCount');
        const weeklyWaveDuration = document.getElementById('weeklyWaveDuration');
        if (weeklyWaveCount) weeklyWaveCount.textContent = `${count} songs`;
        if (weeklyWaveDuration) weeklyWaveDuration.textContent = durationText;
        
        return weeklyWaveSongs;
    } catch (error) {
        console.error('Error loading weekly wave:', error);
        weeklyWaveSongs = [];
        return [];
    }
}
async function loadPastWeeklyWaves() {
    try {
        const response = await fetch(`${API_URL}/playlists/weekly-wave/past`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const weeklyPlaylists = await response.json();
        if (!weeklyPlaylists || weeklyPlaylists.length === 0) return;
        const playlistContainer = document.getElementById('playlistList');
        if (playlistContainer) {
            const weeklyChips = weeklyPlaylists.map(p => `
                <div class="playlist-chip" onclick="openWeeklyPlaylistInDetail('${p._id}', '${p.name}', ${p.songs.length})">
                    📅 ${p.name} (${p.songs.length} songs)
                </div>
            `).join('');
            playlistContainer.insertAdjacentHTML('afterbegin', weeklyChips);
        }
    } catch (error) {
        console.error('Error loading past weekly waves:', error);
    }
}

async function openWeeklyPlaylistInDetail(playlistId, name, songCount) {
    try {
        const response = await fetch(`${API_URL}/playlists/${playlistId}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const playlist = await response.json();
        if (playlist.songs) {
            switchTab('playlists');
            renderPlaylistDetail({
                name: name,
                desc: `Past weekly wave - ${songCount} songs`,
                cover: "📅"
            }, "PAST WEEKLY", playlist.songs);
        }
    } catch (error) {
        alert('Could not load playlist');
    }
}

function openWeeklyWaveInPlaylists() {
    console.log('Opening Weekly Wave with', weeklyWaveSongs.length, 'songs');
    
    if (weeklyWaveSongs.length === 0) {
        showToastMessage('No songs available for Weekly Wave');
        return;
    }
    
    // Switch to playlists tab
    switchTab('playlists');
    
    // Get the container for songs
    const detailTableContainer = document.getElementById('detailTableContainer');
    
    if (!detailTableContainer) {
        console.error('detailTableContainer not found');
        return;
    }
    
    // Update playlist header info
    const detailTitle = document.getElementById('detailTitle');
    const detailDesc = document.getElementById('detailDesc');
    const detailCount = document.getElementById('detailCount');
    const detailType = document.getElementById('detailType');
    const detailCover = document.getElementById('detailCover');
    const detailDuration = document.getElementById('detailDuration');
    
    if (detailTitle) detailTitle.innerHTML = "This Week's Wave";
    if (detailDesc) detailDesc.innerHTML = "Fresh picks - different artists every week. Updated weekly.";
    if (detailCover) detailCover.innerHTML = "🌊";
    if (detailCount) detailCount.innerHTML = `${weeklyWaveSongs.length} songs`;
    if (detailType) detailType.innerHTML = "WEEKLY PLAYLIST";
    
    // Calculate total duration
    let totalSeconds = 0;
    for (let song of weeklyWaveSongs) {
        if (song.duration) {
            const parts = song.duration.split(':');
            totalSeconds += parseInt(parts[0]) * 60 + parseInt(parts[1]);
        }
    }
    const minutes = Math.floor(totalSeconds / 60);
    if (detailDuration) detailDuration.innerHTML = `${minutes} min`;
    
    // Build the table HTML
    let html = '<table class="songs-table">';
    html += '<thead><tr>';
    html += '<th>#</th><th>Title</th>';
    html += '<th>Album</th><th>Duration</th><th></th>';
    html += '</tr></thead><tbody>';
    
    weeklyWaveSongs.forEach((song, index) => {
        const isFavorite = favorites.includes(`${song.title} - ${song.artist}`);
        const duration = song.duration || '--:--';
        const initial = song.title ? song.title.charAt(0).toUpperCase() : '?';
        
        html += `<tr data-song-id="${song._id}" onclick="playSongById('${song._id}')">`;
        html += `<td class="index-cell">${index + 1}${isFavorite ? ' ❤️' : ''}</td>`;
        html += `<td class="title-cell">
                    <div class="circular-icon" style="background: linear-gradient(135deg, #1DB954, #0d5c2a);">
                        ${initial}
                    </div>
                    <div class="title-info">
                        <span class="song-title-text">${escapeHtml(song.title)}</span>
                        <span class="song-artist-text">${escapeHtml(song.artist)}</span>
                    </div>
                  </td>`;
        html += `<td class="album-cell">${escapeHtml(song.album || 'Single')}</td>`;
        html += `<td class="duration-cell">${duration}</td>`;
        html += `<td class="menu-cell"><button class="menu-btn" onclick="event.stopPropagation(); openMenu(event, ${JSON.stringify(song).replace(/"/g, '&quot;')})">⋮</button></td>`;
        html += `</tr>`;
    });
    
    html += '</tbody></table>';
    detailTableContainer.innerHTML = html;
    
    // Show playlist detail view, hide list view
    const playlistListView = document.getElementById('playlistListView');
    const playlistDetailView = document.getElementById('playlistDetailView');
    if (playlistListView) playlistListView.style.display = 'none';
    if (playlistDetailView) playlistDetailView.style.display = 'block';
    
    // Update action buttons
    const playPlaylistBtn = document.getElementById('playPlaylistBtn');
    const shufflePlaylistBtn = document.getElementById('shufflePlaylistBtn');
    const likePlaylistBtn = document.getElementById('likePlaylistBtn');
    
    if (playPlaylistBtn) {
        playPlaylistBtn.onclick = function() {
            if (weeklyWaveSongs.length > 0) {
                playSongById(weeklyWaveSongs[0]._id);
                window.playlistQueue = [...weeklyWaveSongs];
                window.playlistQueueIndex = 0;
                showToastMessage(`▶ Playing This Week's Wave`);
            }
        };
    }
    
    if (shufflePlaylistBtn) {
        shufflePlaylistBtn.onclick = function() {
            if (weeklyWaveSongs.length > 0) {
                const shuffled = [...weeklyWaveSongs];
                for (let i = shuffled.length - 1; i > 0; i--) {
                    const j = Math.floor(Math.random() * (i + 1));
                    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
                }
                window.playlistQueue = shuffled;
                window.playlistQueueIndex = 0;
                playSongById(shuffled[0]._id);
                showToastMessage(`🔀 Shuffling This Week's Wave`);
            }
        };
    }
    
    if (likePlaylistBtn) {
        likePlaylistBtn.onclick = function() {
            let addedCount = 0;
            for (let song of weeklyWaveSongs) {
                const songKey = `${song.title} - ${song.artist}`;
                if (!favorites.includes(songKey)) {
                    favorites.push(songKey);
                    addedCount++;
                }
            }
            localStorage.setItem('favorites', JSON.stringify(favorites));
            showToastMessage(`❤️ Added ${addedCount} songs to Favorites`);
            updateFavBtn();
        };
    }
    
    console.log('Weekly Wave displayed successfully');
}
function openMoodPlaylist(mood) {
    const moodNames = { chill: 'Chill', energetic: 'Energetic', sad: 'Sad', happy: 'Happy' };
    const moodEmojis = { chill: '😌', energetic: '⚡', sad: '😢', happy: '😊' };
    const moodDescs = {
        chill: 'Relaxing and peaceful tracks for chill moments.',
        energetic: 'High energy tracks to keep you moving.',
        sad: 'Emotional and deep tracks for sad moments.',
        happy: 'Uplifting and cheerful songs to brighten your day.'
    };
    
    const moodKeywords = {
        sad: ['cry', 'hurt', 'lonely', 'broken', 'goodbye', 'tears', 'sad', 'pain', 'dark', 'lost', 'sorry', 'alone', 'miss', 'gone', 'death', 'fade', 'cold', 'empty', 'bleed', 'fall apart'],
        happy: ['love', 'smile', 'dance', 'joy', 'celebrate', 'sunshine', 'happy', 'laugh', 'wonderful', 'beautiful', 'amazing', 'perfect', 'blessed', 'dream', 'fun', 'party', 'bright', 'shine', 'alive', 'free'],
        chill: ['relax', 'calm', 'peace', 'slow', 'breeze', 'ocean', 'chill', 'quiet', 'soft', 'gentle', 'smooth', 'easy', 'float', 'silence', 'night', 'stars', 'moon', 'waves', 'serene', 'flow'],
        energetic: ['run', 'jump', 'fight', 'power', 'strong', 'wild', 'energy', 'fast', 'rush', 'storm', 'fire', 'boom', 'explode', 'rise', 'stand', 'roar', 'charge', 'force', 'active', 'pump']
    };
    
    let genreFiltered = [];
    let lyricFiltered = [];
    
    for (let song of allSongs) {
        let matched = false;
        
        if (song.genre && song.genre.trim()) {
            const genreLower = song.genre.toLowerCase();
            switch(mood) {
                case 'chill':
                    if (['lofi', 'acoustic', 'ambient', 'rnb', 'chill', 'jazz', 'classical', 'indie', 'folk'].some(g => genreLower.includes(g))) {
                        genreFiltered.push(song);
                        matched = true;
                    }
                    break;
                case 'energetic':
                    if (['rock', 'electronic', 'dance', 'edm', 'metal', 'punk', 'hardcore', 'trap'].some(g => genreLower.includes(g))) {
                        genreFiltered.push(song);
                        matched = true;
                    }
                    break;
                case 'sad':
                    if (['ballad', 'emo', 'sad', 'melancholic', 'blues', 'soul'].some(g => genreLower.includes(g))) {
                        genreFiltered.push(song);
                        matched = true;
                    }
                    break;
                case 'happy':
                    if (['pop', 'funk', 'reggae', 'happy', 'upbeat', 'disco', 'country', 'latin'].some(g => genreLower.includes(g))) {
                        genreFiltered.push(song);
                        matched = true;
                    }
                    break;
            }
        }
        
        if (!matched && song.lyrics && song.lyrics.trim()) {
            const lyricsLower = song.lyrics.toLowerCase();
            let keywordCount = 0;
            const keywords = moodKeywords[mood];
            
            for (let keyword of keywords) {
                if (lyricsLower.includes(keyword)) {
                    keywordCount++;
                }
            }
            
            if (keywordCount > 0) {
                lyricFiltered.push({ song: song, score: keywordCount });
            }
        }
    }
    
    lyricFiltered.sort((a, b) => b.score - a.score);
    const lyricSongs = lyricFiltered.map(item => item.song).slice(0, 20);
    
    let filteredSongs = [...genreFiltered, ...lyricSongs];
    
    filteredSongs = filteredSongs.filter((song, index, self) => 
        index === self.findIndex(s => s._id === song._id)
    );
    
    filteredSongs = filteredSongs.slice(0, 20);
    
    if (filteredSongs.length === 0) {
        showToastMessage(`No ${moodNames[mood]} songs found. Add songs with matching genres or lyrics.`);
        return;
    }
    
    switchTab('playlists');
    renderPlaylistDetail({
        name: `${moodNames[mood]} Playlist`,
        desc: moodDescs[mood],
        cover: moodEmojis[mood]
    }, "MOOD PLAYLIST", filteredSongs);
}

// ============ PLAYLIST FUNCTIONS ============
function showPlaylists() {
    const playlistListView = document.getElementById('playlistListView');
    const playlistDetailView = document.getElementById('playlistDetailView');
    const playlistList = document.getElementById('playlistList');
    
    if (playlistListView) playlistListView.style.display = 'block';
    if (playlistDetailView) playlistDetailView.style.display = 'none';
    if (playlistList) {
        playlistList.innerHTML = playlists.map((p, i) => 
            `<div class="playlist-chip" onclick="openUserPlaylistDetail(${i})">📋 ${escapeHtml(p.name)} (${p.songs.length})</div>`
        ).join('');
    }
}

function openUserPlaylistDetail(index) {
    const playlist = playlists[index];
    const playlistSongs = allSongs.filter(s => playlist.songs.includes(s._id));
    switchTab('playlists');
    renderPlaylistDetail({
        name: playlist.name,
        desc: playlist.description || 'No description',
        cover: '📋'
    }, "PLAYLIST", playlistSongs);
}

function createPlaylist() {
    const name = prompt('Playlist name:');
    if (name) {
        playlists.push({ name: name, songs: [], description: '' });
        localStorage.setItem('playlists', JSON.stringify(playlists));
        showPlaylists();
    }
}

function backToPlaylistList() {
    const playlistListView = document.getElementById('playlistListView');
    const playlistDetailView = document.getElementById('playlistDetailView');
    if (playlistListView) playlistListView.style.display = 'block';
    if (playlistDetailView) playlistDetailView.style.display = 'none';
}

function renderPlaylistDetail(playlist, type, songs) {
    // FIX: Ensure songs is an array and has valid song objects
    if (!Array.isArray(songs)) {
        console.error('renderPlaylistDetail: songs is not an array', songs);
        songs = [];
    }
    
    // Filter out any invalid entries - only keep valid song objects
    songs = songs.filter(song => song && typeof song === 'object' && song.title && song.artist);
    
    console.log('Rendering playlist:', playlist.name, 'with', songs.length, 'valid songs');
    
    const playlistListView = document.getElementById('playlistListView');
    const playlistDetailView = document.getElementById('playlistDetailView');
    const detailCover = document.getElementById('detailCover');
    const detailTitle = document.getElementById('detailTitle');
    const detailDesc = document.getElementById('detailDesc');
    const detailCount = document.getElementById('detailCount');
    const detailType = document.getElementById('detailType');
    const detailDuration = document.getElementById('detailDuration');
    const detailTableContainer = document.getElementById('detailTableContainer');
    
    if (playlistListView) playlistListView.style.display = 'none';
    if (playlistDetailView) playlistDetailView.style.display = 'block';
    
    if (detailCover) detailCover.innerHTML = playlist.cover || '📋';
    if (detailTitle) detailTitle.innerHTML = escapeHtml(playlist.name);
    if (detailDesc) detailDesc.innerHTML = playlist.desc || 'No description';
    if (detailCount) detailCount.innerHTML = `${songs.length} songs`;
    if (detailType) detailType.innerHTML = type;
    
    let totalSeconds = 0;
    for (let song of songs) {
        if (song.duration) {
            const parts = song.duration.split(':');
            totalSeconds += parseInt(parts[0]) * 60 + parseInt(parts[1]);
        }
    }
    const minutes = Math.floor(totalSeconds / 60);
    if (detailDuration) detailDuration.innerHTML = `${minutes} min`;
    
    if (detailTableContainer) {
        if (!songs.length) {
            detailTableContainer.innerHTML = '<div class="empty-state">No songs in this playlist</div>';
            return;
        }
        
        let html = '<table class="songs-table"><thead><tr>';
        html += '<th>#</th><th>Title</th>';
        html += '<th>Album</th><th>Duration</th><th></th>';
        html += '</thead><tbody>';
        
        songs.forEach((song, index) => {
            html += renderSongRow(song, index, true, true);
        });
        
        html += '</tbody></table>';
        detailTableContainer.innerHTML = html;
    }
    
    const playPlaylistBtn = document.getElementById('playPlaylistBtn');
    const shufflePlaylistBtn = document.getElementById('shufflePlaylistBtn');
    const likePlaylistBtn = document.getElementById('likePlaylistBtn');
    
    if (playPlaylistBtn) {
        playPlaylistBtn.onclick = function() {
            if (songs.length > 0) {
                playSongById(songs[0]._id);
                window.playlistQueue = [...songs];
                window.playlistQueueIndex = 0;
                showToastMessage(`▶ Playing playlist: ${playlist.name}`);
            }
        };
    }
    
    if (shufflePlaylistBtn) {
        shufflePlaylistBtn.onclick = function() {
            if (songs.length > 0) {
                const shuffled = [...songs];
                for (let i = shuffled.length - 1; i > 0; i--) {
                    const j = Math.floor(Math.random() * (i + 1));
                    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
                }
                window.playlistQueue = shuffled;
                window.playlistQueueIndex = 0;
                playSongById(shuffled[0]._id);
                showToastMessage(`🔀 Shuffling playlist: ${playlist.name}`);
            }
        };
    }
    
    if (likePlaylistBtn) {
        likePlaylistBtn.onclick = function() {
            let addedCount = 0;
            for (let song of songs) {
                const songKey = `${song.title} - ${song.artist}`;
                if (!favorites.includes(songKey)) {
                    favorites.push(songKey);
                    addedCount++;
                }
            }
            localStorage.setItem('favorites', JSON.stringify(favorites));
            showToastMessage(`❤️ Added ${addedCount} songs to Favorites`);
            updateFavBtn();
            const favTab = document.getElementById('favoritesTab');
            if (favTab && favTab.style.display !== 'none') {
                showFavorites();
            }
        };
    }
}

// ============ FAVORITES ============
function showFavorites() {
    const favoritesGrid = document.getElementById('favoritesGrid');
    if (!favoritesGrid) return;
    
    favorites = JSON.parse(localStorage.getItem('favorites') || '[]');
    
    const favoriteSongs = allSongs.filter(song => {
        const songKey = `${song.title} - ${song.artist}`;
        return favorites.includes(songKey);
    });
    
    if (favoriteSongs.length === 0) {
        favoritesGrid.innerHTML = '<div style="padding:40px; text-align:center; color:#b3b3b3;">No favorites yet. Click the heart button on a song to add it.</div>';
        return;
    }
    
    let html = '<table class="songs-table"><thead></tr>';
    html += '<th>#</th><th>Title</th>';
    html += '<th>Album</th><th>Duration</th><th></th>';
    html += '</tr></thead><tbody>';
    
    favoriteSongs.forEach((song, index) => {
        html += renderSongRow(song, index, true, true);
    });
    
    html += '</tbody></table>';
    favoritesGrid.innerHTML = html;
}

// ============ SEARCH ============
function searchSongs(query) {
    const searchGrid = document.getElementById('searchGrid');
    if (!searchGrid) return;
    
    if (!query.trim()) {
        searchGrid.innerHTML = 'Type to search...';
        return;
    }
    const filtered = allSongs.filter(s => s.title.toLowerCase().includes(query.toLowerCase()) || s.artist.toLowerCase().includes(query.toLowerCase()));
    displaySongsTable(filtered, 'searchGrid');
}

function deeperSearch() {
    const panel = document.getElementById('rightPanel');
    const lyricsDiv = document.getElementById('rightPanelLyrics');
    const rightPanelTitle = document.getElementById('rightPanelTitle');
    const rightPanelArtist = document.getElementById('rightPanelArtist');
    const rightPanelImg = document.getElementById('rightPanelImg');
    
    if (rightPanelTitle) rightPanelTitle.textContent = '🔍 Online Search';
    if (rightPanelArtist) rightPanelArtist.textContent = 'Search Deezer';
    if (rightPanelImg) rightPanelImg.src = 'https://via.placeholder.com/200?text=🔍';
    if (lyricsDiv) {
        lyricsDiv.innerHTML = `<input type="text" id="deeperSearchInput" placeholder="Search online..." style="width:100%;background:#282828;border:1px solid #404040;border-radius:8px;padding:10px;color:white;margin-bottom:12px;" onkeypress="if(event.key==='Enter')doDeeperSearch()">
            <button onclick="doDeeperSearch()" class="btn-green" style="width:auto;padding:8px 16px;">Search</button>
            <div id="deeperResults" style="margin-top:12px;"></div>`;
    }
    if (panel) panel.style.display = 'flex';
    const mainContent = document.querySelector('.main-content');
    if (mainContent) mainContent.classList.add('has-panel');
}

async function doDeeperSearch() {
    const searchInput = document.getElementById('deeperSearchInput');
    const deeperResults = document.getElementById('deeperResults');
    if (!searchInput || !deeperResults) return;
    
    const query = searchInput.value.trim();
    if (!query) return;
    deeperResults.innerHTML = '<p style="color:#f39c12;">Searching...</p>';
    try {
        const response = await fetch(`${API_URL}/ai/deezer/${encodeURIComponent(query)}`);
        const data = await response.json();
        if (!data.data || !data.data.length) {
            deeperResults.innerHTML = '<p>No results found.</p>';
            return;
        }
        deeperResults.innerHTML = data.data.map(song => `<div style="display:flex;align-items:center;gap:10px;padding:8px;cursor:pointer;border-bottom:1px solid #282828;" onclick="playDeezerPreview('${song.preview || ''}','${(song.title || '').replace(/'/g, "\\'")}','${(song.artist?.name || '').replace(/'/g, "\\'")}','${song.album?.cover_medium || ''}')">
            <img src="${song.album?.cover_medium || ''}" style="width:40px;height:40px;border-radius:4px;" onerror="this.style.display='none'">
            <div style="flex:1;">
                <div style="font-weight:bold;font-size:13px;">${song.title || '?'}</div>
                <div style="color:#b3b3b3;font-size:11px;">${song.artist?.name || '?'} • ${Math.floor(song.duration / 60)}:${Math.floor(song.duration % 60).toString().padStart(2, '0')}</div>
            </div>
        </div>`).join('');
    } catch (error) {
        deeperResults.innerHTML = '<p style="color:#e74c3c;">Error searching.</p>';
    }
}

function playDeezerPreview(url, title, artist, cover) {
    if (!url) return;
    currentAudio.src = url;
    currentAudio.play();
    isPlaying = true;
    document.getElementById('playerTitle').textContent = title;
    document.getElementById('playerArtist').textContent = artist;
    document.getElementById('playBtn').innerHTML = '<i class="fas fa-pause"></i>';
    
    const playerImg = document.getElementById('playerImg');
    const rightPanelImg = document.getElementById('rightPanelImg');
    if (cover) {
        if (playerImg) playerImg.src = cover;
        if (rightPanelImg) rightPanelImg.src = cover;
    } else {
        if (playerImg) playerImg.src = `https://placehold.co/56x56/1DB954/121212?text=${encodeURIComponent(title.charAt(0) || '?')}`;
    }
    updateStatus();
}

// ============ LYRICS ============
function parseLRC(text) {
    const lines = text.split('\n');
    const parsed = [];
    lines.forEach(line => {
        const match = line.match(/\[(\d{2}):(\d{2})\.(\d{2,3})\](.*)/);
        if (match) {
            const minutes = parseInt(match[1]);
            const seconds = parseInt(match[2]);
            const ms = parseInt(match[3].length === 2 ? match[3] * 10 : match[3]);
            const time = minutes * 60 + seconds + ms / 1000;
            const lyricText = match[4].trim();
            if (lyricText) parsed.push({ time: time, text: lyricText });
        }
    });
    return parsed.sort((a, b) => a.time - b.time);
}

function showLyrics() {
    const lyrics = window.currentLyrics || '';
    if (!lyrics) {
        alert('No lyrics');
        return;
    }
    lyricsLines = parseLRC(lyrics);
    if (!lyricsLines.length) lyricsLines = lyrics.split('\n').filter(x => x.trim()).map((text, i) => ({ time: null, text: text }));
    const modal = document.createElement('div');
    modal.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.9);z-index:300;display:flex;justify-content:center;align-items:center;';
    modal.innerHTML = `<div style="background:#121212;padding:30px;border-radius:12px;max-width:600px;max-height:80vh;overflow-y:auto;width:90%;">
        <h2 style="color:#1DB954;">📝 Lyrics</h2>
        <button onclick="this.parentElement.parentElement.remove()" style="background:none;border:none;color:white;font-size:24px;cursor:pointer;float:right;">&times;</button>
        <div style="color:white;line-height:2;font-size:18px;text-align:center;margin-top:20px;">${lyricsLines.map(x => `<p style="margin:8px 0;">${escapeHtml(x.text)}</p>`).join('')}</div>
    </div>`;
    modal.onclick = function(e) { if (e.target === modal) modal.remove(); };
    document.body.appendChild(modal);
}

function showRightPanel(song) {
    const panel = document.getElementById('rightPanel');
    if (!panel || djMode) return;
    
    const rightPanelImg = document.getElementById('rightPanelImg');
    const rightPanelTitle = document.getElementById('rightPanelTitle');
    const rightPanelArtist = document.getElementById('rightPanelArtist');
    const rightPanelLyrics = document.getElementById('rightPanelLyrics');
    
    if (rightPanelImg) {
        rightPanelImg.src = song.coverUrl ? API_URL.replace('/api', '') + song.coverUrl : 'https://placehold.co/200x200/1DB954/121212?text=🎵';
    }
    if (rightPanelTitle) rightPanelTitle.textContent = song.title || '?';
    if (rightPanelArtist) rightPanelArtist.textContent = song.artist || '?';
    
    const lyrics = song.lyrics || window.currentLyrics || '';
    window.currentLyrics = lyrics;
    
    if (rightPanelLyrics) {
        if (lyrics && lyrics.trim()) {
            const lines = parseLRC(lyrics);
            if (lines.length > 0) {
                lyricsLines = lines;
                rightPanelLyrics.innerHTML = lines.map((l, i) => `<p id="rpLine${i}" style="margin:6px 0;opacity:0.4;">${escapeHtml(l.text)}</p>`).join('');
                startRightPanelSync();
            } else {
                rightPanelLyrics.innerHTML = lyrics.split('\n').filter(l => l.trim()).map(text => `<p style="margin:6px 0;opacity:0.4;">${escapeHtml(text)}</p>`).join('');
            }
        } else {
            rightPanelLyrics.innerHTML = '<p style="color:#b3b3b3;">No lyrics</p>';
        }
    }
    
    panel.style.display = 'flex';
    const mainContent = document.querySelector('.main-content');
    if (mainContent) mainContent.classList.add('has-panel');
}

function hideRightPanel() {
    if (djMode) return;
    const panel = document.getElementById('rightPanel');
    if (panel) panel.style.display = 'none';
    const mainContent = document.querySelector('.main-content');
    if (mainContent) mainContent.classList.remove('has-panel');
}

function startRightPanelSync() {
    if (lyricsInterval) clearInterval(lyricsInterval);
    lyricsInterval = setInterval(() => {
        const currentTime = currentAudio.currentTime;
        let activeIndex = -1;
        for (let i = 0; i < lyricsLines.length; i++) {
            if (lyricsLines[i].time !== null && lyricsLines[i].time <= currentTime) activeIndex = i;
        }
        const lyricsContainer = document.getElementById('rightPanelLyrics');
        if (lyricsContainer) {
            const paragraphs = lyricsContainer.querySelectorAll('p');
            paragraphs.forEach((el, i) => {
                if (i === activeIndex) {
                    el.style.opacity = '1';
                    el.style.color = '#1DB954';
                    el.style.fontWeight = 'bold';
                    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                } else {
                    el.style.opacity = '0.4';
                    el.style.color = 'white';
                    el.style.fontWeight = 'normal';
                }
            });
        }
    }, 200);
}

// ============ AI CHAT ASSISTANT ============
async function sendMessage() {
    const input = document.getElementById('chatInput');
    const message = input.value.trim();
    if (!message) return;
    addChatBubble(message, 'user');
    input.value = '';
    try {
        const response = await fetch(`${API_URL}/ai`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message: message })
        });
        const data = await response.json();
        addChatBubble(data.reply || 'Sorry', 'ai');
        if (voiceEnabled) speakText(data.reply || 'Sorry');
    } catch (error) {
        addChatBubble('AI not available.', 'ai');
    }
}

function addChatBubble(text, sender) {
    const messagesDiv = document.getElementById('chatMessages');
    if (!messagesDiv) return;
    const bubble = document.createElement('div');
    bubble.className = `chat-bubble ${sender === 'ai' ? 'ai-bubble' : 'user-bubble'}`;
    bubble.innerHTML = `<p>${escapeHtml(text)}</p>`;
    messagesDiv.appendChild(bubble);
    messagesDiv.scrollTop = messagesDiv.scrollHeight;
}

function speakText(text) {
    if ('speechSynthesis' in window) {
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.rate = 1;
        utterance.pitch = 1;
        window.speechSynthesis.speak(utterance);
    }
}

function toggleVoice() {
    voiceEnabled = !voiceEnabled;
    const voiceBtn = document.getElementById('voiceBtn');
    if (voiceBtn) {
        voiceBtn.innerHTML = voiceEnabled ? '<i class="fas fa-volume-up"></i>' : '<i class="fas fa-volume-mute"></i>';
    }
}

// ============ UPLOAD FUNCTIONS ============
async function loadMyUploads() {
    const container = document.getElementById('myUploadsGrid');
    if (!container) return;
    container.innerHTML = '<div style="padding:40px; text-align:center;">Loading...</div>';
    try {
        const response = await fetch(`${API_URL}/songs/my-songs`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const songs = await response.json();
        if (!songs.length) {
            container.innerHTML = '<div style="text-align:center;padding:40px;"><p>No uploaded songs yet.</p></div>';
            return;
        }
        
        let html = '<table class="songs-table"><thead><tr>';
        html += '<th>#</th><th>Title</th>';
        html += '<th>Album</th><th>Duration</th><th></th>';
        html += '</tr></thead><tbody>';
        
        songs.forEach((song, index) => {
            const initial = getInitial(song.title);
            const color = getCircularColor(index);
            const duration = song.duration || '--:--';
            html += `
                <tr class="song-row" onclick="playUploaded('${API_URL.replace('/api', '')}${song.fileUrl}','${escapeHtml(song.title)}','${escapeHtml(song.artist)}','${song.coverUrl || ''}')">
                    <td class="index-cell">${index + 1}</td>
                    <td class="title-cell">
                        <div class="circular-icon" style="background: linear-gradient(135deg, ${color}, ${color}cc);">
                            ${initial}
                        </div>
                        <div class="title-info">
                            <span class="song-title-text">${escapeHtml(song.title)}</span>
                            <span class="song-artist-text">${escapeHtml(song.artist)}</span>
                        </div>
                    </td>
                    <td class="album-cell">${escapeHtml(song.album || 'Single')}</td>
                    <td class="duration-cell">${duration}</td>
                    <td class="menu-cell">
                        <button class="menu-btn" onclick="event.stopPropagation(); editSong('${song._id}','${escapeHtml(song.title)}','${escapeHtml(song.album || '')}','${escapeHtml(song.genre || '')}')">✏️</button>
                        <button class="menu-btn" onclick="event.stopPropagation(); deleteSong('${song._id}')" style="margin-left:5px;">🗑️</button>
                    </td>
                </tr>
            `;
        });
        
        html += '</tbody></table>';
        container.innerHTML = html;
    } catch (error) {
        container.innerHTML = '<div style="padding:40px; text-align:center;">Error loading uploads</div>';
    }
}

function playUploaded(url, title, artist, cover) {
    currentAudio.src = url;
    currentAudio.play();
    isPlaying = true;
    document.getElementById('playerTitle').textContent = title;
    document.getElementById('playerArtist').textContent = artist;
    document.getElementById('playBtn').innerHTML = '<i class="fas fa-pause"></i>';
    
    // Show player
    document.querySelector('.player').classList.add('visible');
    
    const playerImg = document.getElementById('playerImg');
    if (cover && cover !== '') {
        playerImg.src = API_URL.replace('/api', '') + cover;
        playerImg.style.display = 'block';
    } else {
        playerImg.src = `https://placehold.co/56x56/1DB954/121212?text=${encodeURIComponent(title.charAt(0) || '?')}`;
        playerImg.style.display = 'block';
    }
    updateStatus();
}
async function uploadSong() {
    const title = document.getElementById('uploadTitle')?.value;
    const album = document.getElementById('uploadAlbum')?.value;
    const genre = document.getElementById('uploadGenre')?.value;
    const audioFile = document.getElementById('uploadAudio')?.files[0];
    const coverFile = document.getElementById('uploadCover')?.files[0];
    const lyricsFile = document.getElementById('uploadLyrics')?.files[0];
    const statusDiv = document.getElementById('uploadStatus');
    
    if (!title || !audioFile) {
        if (statusDiv) {
            statusDiv.style.color = '#e74c3c';
            statusDiv.textContent = '❌ Title and Audio required';
        }
        return;
    }
    
    const formData = new FormData();
    formData.append('title', title);
    formData.append('album', album || 'Single');
    formData.append('genre', genre || 'Other');
    formData.append('audio', audioFile);
    if (coverFile) formData.append('cover', coverFile);
    if (lyricsFile) formData.append('lyrics', lyricsFile);
    
    if (statusDiv) {
        statusDiv.style.color = '#f39c12';
        statusDiv.textContent = '⏳ Uploading...';
    }
    
    try {
        const response = await fetch(`${API_URL}/songs/upload`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` },
            body: formData
        });
        const data = await response.json();
        if (data.message) {
            if (statusDiv) {
                statusDiv.style.color = '#1DB954';
                statusDiv.textContent = '✅ Uploaded!';
            }
            setTimeout(() => {
                if (statusDiv) statusDiv.textContent = '';
                loadMyUploads();
                loadAllSongs();
            }, 1000);
        } else {
            if (statusDiv) {
                statusDiv.style.color = '#e74c3c';
                statusDiv.textContent = '❌ ' + (data.error || 'Upload failed');
            }
        }
    } catch (error) {
        if (statusDiv) {
            statusDiv.style.color = '#e74c3c';
            statusDiv.textContent = '❌ Error';
        }
    }
}

async function deleteSong(id) {
    if (!confirm('Delete this song permanently?')) return;
    try {
        await fetch(`${API_URL}/songs/${id}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        showToastMessage('🗑️ Song deleted');
        loadMyUploads();
        loadAllSongs();
        refreshCurrentView();
    } catch (error) {
        showToastMessage('❌ Delete failed');
    }
}

function editSong(id, title, album, genre) {
    const editSongId = document.getElementById('editSongId');
    const editTitle = document.getElementById('editTitle');
    const editAlbum = document.getElementById('editAlbum');
    const editGenre = document.getElementById('editGenre');
    const editModal = document.getElementById('editModal');
    
    if (editSongId) editSongId.value = id;
    if (editTitle) editTitle.value = title;
    if (editAlbum) editAlbum.value = album || '';
    if (editGenre) editGenre.value = genre || '';
    if (editModal) editModal.style.display = 'flex';
}

async function saveEditSong() {
    const id = document.getElementById('editSongId')?.value;
    const title = document.getElementById('editTitle')?.value;
    const album = document.getElementById('editAlbum')?.value;
    const genre = document.getElementById('editGenre')?.value;
    const coverFile = document.getElementById('editCover')?.files[0];
    const lyricsFile = document.getElementById('editLyrics')?.files[0];
    
    if (!title) return;
    
    const formData = new FormData();
    formData.append('title', title);
    formData.append('album', album || '');
    formData.append('genre', genre || '');
    if (lyricsFile) formData.append('lyrics', lyricsFile);
    if (coverFile) formData.append('cover', coverFile);
    
    try {
        const response = await fetch(`${API_URL}/songs/${id}`, {
            method: 'PUT',
            headers: { 'Authorization': `Bearer ${token}` },
            body: formData
        });
        const data = await response.json();
        if (data.song) {
            const editModal = document.getElementById('editModal');
            if (editModal) editModal.style.display = 'none';
            showToastMessage('✏️ Song updated');
            loadMyUploads();
            loadAllSongs();
        } else {
            alert('❌ ' + (data.error || 'Failed'));
        }
    } catch (error) {
        alert('Error');
    }
}

// ============ ARTIST PAGE FUNCTIONS ============
let currentArtistData = null;
let followedArtists = JSON.parse(localStorage.getItem('followedArtists') || '[]');

async function loadArtists() {
    const grid = document.getElementById('artistsGrid');
    if (!grid) return;
    
    grid.innerHTML = '<div style="padding:40px; text-align:center;">Loading artists...</div>';
    
    try {
        const response = await fetch(`${API_URL}/artists`);
        const artists = await response.json();
        
        if (!artists.length) {
            grid.innerHTML = '<div style="padding:40px; text-align:center;">No artists found</div>';
            return;
        }
        
        grid.innerHTML = artists.map(artist => `
            <div class="artist-card" onclick="openArtistDetail('${artist._id}')">
                <div class="artist-card-img">
                    ${artist.image ? `<img src="${API_URL.replace('/api', '')}${artist.image}" onerror="this.parentElement.innerHTML='<span>🎤</span>'">` : '<span>🎤</span>'}
                </div>
                <div class="artist-card-name">${escapeHtml(artist.name)}</div>
                <div class="artist-card-type">Artist</div>
            </div>
        `).join('');
        
    } catch (error) {
        console.error('Error loading artists:', error);
        grid.innerHTML = '<div style="padding:40px; text-align:center;">Error loading artists</div>';
    }
}
function openArtistMenuForMore(event) {
    event.stopPropagation();
    closeMenu();
    
    const button = event.currentTarget;
    const rect = button.getBoundingClientRect();
    
    const menu = document.createElement('div');
    menu.className = 'popup-menu';
    menu.style.position = 'fixed';
    menu.style.top = (rect.bottom + 5) + 'px';
    menu.style.right = (window.innerWidth - rect.right) + 'px';
    menu.style.backgroundColor = '#282828';
    menu.style.borderRadius = '8px';
    menu.style.boxShadow = '0 4px 20px rgba(0,0,0,0.5)';
    menu.style.minWidth = '200px';
    menu.style.zIndex = '10000';
    menu.style.overflow = 'hidden';
    
    fetch(`${API_URL}/auth/profile`, {
        headers: { 'Authorization': `Bearer ${token}` }
    }).then(userResponse => userResponse.json()).then(user => {
        const isAdmin = (user.role === 'superadmin' || user.role === 'admin');
        
        let menuHTML = `
            <div class="popup-menu-item" onclick="shareArtist()">
                <span>📤</span> Share Artist
            </div>
            <div class="popup-menu-item" onclick="viewArtistStats()">
                <span>📊</span> View Stats
            </div>
            <div class="popup-menu-item" onclick="addAllArtistSongsToPlaylist()">
                <span>📋</span> Add All Songs to Playlist
            </div>
        `;
        
        if (isAdmin) {
            menuHTML += `
                <div class="popup-menu-item" onclick="editArtist()">
                    <span>✏️</span> Edit Artist
                </div>
                <div class="popup-menu-item danger" onclick="deleteArtist()">
                    <span>🗑️</span> Delete Artist
                </div>
            `;
        }
        
        menu.innerHTML = menuHTML;
        document.body.appendChild(menu);
        activeMenu = menu;
        
        setTimeout(() => {
            document.addEventListener('click', function closeOnClick(e) {
                if (!menu.contains(e.target) && !button.contains(e.target)) {
                    closeMenu();
                    document.removeEventListener('click', closeOnClick);
                }
            });
        }, 10);
    }).catch(() => {
        let menuHTML = `
            <div class="popup-menu-item" onclick="shareArtist()">
                <span>📤</span> Share Artist
            </div>
            <div class="popup-menu-item" onclick="viewArtistStats()">
                <span>📊</span> View Stats
            </div>
            <div class="popup-menu-item" onclick="addAllArtistSongsToPlaylist()">
                <span>📋</span> Add All Songs to Playlist
            </div>
        `;
        menu.innerHTML = menuHTML;
        document.body.appendChild(menu);
        activeMenu = menu;
    });
}

function shareArtist() {
    if (!currentArtistData) return;
    const shareText = `🎤 Check out ${currentArtistData.name} on Wave!`;
    navigator.clipboard.writeText(shareText);
    showToastMessage(`🔗 Artist link copied!`);
}

function viewArtistStats() {
    if (!currentArtistData) return;
    let totalPlays = 0;
    for (let song of currentArtistData.songs) {
        totalPlays += song.plays || 0;
    }
    const songCount = currentArtistData.songs.length;
    const followerCount = followedArtists.filter(id => id === currentArtistData._id).length;
    
    const modal = document.createElement('div');
    modal.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.9);z-index:10000;display:flex;justify-content:center;align-items:center;';
    modal.innerHTML = `
        <div style="background:#181818;padding:30px;border-radius:16px;width:90%;max-width:400px;text-align:center;">
            <h2 style="color:#1DB954;">📊 ${escapeHtml(currentArtistData.name)}</h2>
            <div style="margin:20px 0;">
                <div style="margin:15px 0;"><span style="font-size:32px;font-weight:bold;color:#1DB954;">${songCount}</span><br><span style="color:#b3b3b3;">Songs</span></div>
                <div style="margin:15px 0;"><span style="font-size:32px;font-weight:bold;color:#1DB954;">${totalPlays.toLocaleString()}</span><br><span style="color:#b3b3b3;">Total Plays</span></div>
                <div style="margin:15px 0;"><span style="font-size:32px;font-weight:bold;color:#1DB954;">${followerCount}</span><br><span style="color:#b3b3b3;">You follow</span></div>
            </div>
            <button onclick="this.closest('div').parentElement.remove()" class="btn-green" style="padding:10px 24px;">Close</button>
        </div>
    `;
    document.body.appendChild(modal);
}

function addAllArtistSongsToPlaylist() {
    if (!currentArtistData || !currentArtistData.songs.length) {
        showToastMessage('No songs to add');
        return;
    }
    
    if (playlists.length === 0) {
        const newName = prompt('No playlists. Create one:');
        if (newName) {
            const songIds = currentArtistData.songs.map(s => s._id);
            playlists.push({ name: newName, songs: songIds, description: `All songs by ${currentArtistData.name}` });
            localStorage.setItem('playlists', JSON.stringify(playlists));
            showToastMessage(`✅ Created "${newName}" with ${songIds.length} songs by ${currentArtistData.name}`);
        }
        return;
    }
    
    let playlistOptions = playlists.map((p, i) => `${i + 1}: ${p.name} (${p.songs.length} songs)`).join('\n');
    const choice = prompt(`Add ALL ${currentArtistData.songs.length} songs by "${currentArtistData.name}" to playlist:\n\n${playlistOptions}\n\nEnter number (1-${playlists.length}) or "new" to create:`);
    
    if (choice === 'new') {
        const newName = prompt('New playlist name:');
        if (newName) {
            const songIds = currentArtistData.songs.map(s => s._id);
            playlists.push({ name: newName, songs: songIds, description: `All songs by ${currentArtistData.name}` });
            localStorage.setItem('playlists', JSON.stringify(playlists));
            showToastMessage(`✅ Created "${newName}" with ${songIds.length} songs`);
        }
    } else if (choice !== null) {
        const index = parseInt(choice) - 1;
        if (index >= 0 && index < playlists.length) {
            let addedCount = 0;
            for (let song of currentArtistData.songs) {
                if (!playlists[index].songs.includes(song._id)) {
                    playlists[index].songs.push(song._id);
                    addedCount++;
                }
            }
            localStorage.setItem('playlists', JSON.stringify(playlists));
            showToastMessage(`✅ Added ${addedCount} songs by ${currentArtistData.name} to ${playlists[index].name}`);
        } else {
            showToastMessage('Invalid selection');
        }
    }
}
async function openArtistDetail(artistId) {
    try {
        const response = await fetch(`${API_URL}/artists/${artistId}`);
        const artist = await response.json();
        
        if (!artist) {
            alert('Artist not found');
            return;
        }
        
        const songsResponse = await fetch(`${API_URL}/artists/${artistId}/songs`);
        const songs = await songsResponse.json();
        
        currentArtistData = { ...artist, songs: songs || [] };
        
        const artistCover = document.getElementById('artistCover');
        if (artistCover) {
            if (artist.image) {
                artistCover.innerHTML = `<img src="${API_URL.replace('/api', '')}${artist.image}" onerror="this.parentElement.innerHTML='<div class=\"artist-cover-placeholder\">🎤</div>'">`;
            } else {
                artistCover.innerHTML = '<div class="artist-cover-placeholder">🎤</div>';
            }
        }
        
        const artistName = document.getElementById('artistName');
        const artistSongCount = document.getElementById('artistSongCount');
        const artistPlays = document.getElementById('artistPlays');
        const artistBio = document.getElementById('artistBio');
        
        if (artistName) artistName.innerHTML = escapeHtml(artist.name);
        if (artistSongCount) artistSongCount.innerHTML = `${currentArtistData.songs.length} songs`;
        
        let totalPlays = 0;
        for (let song of currentArtistData.songs) {
            totalPlays += song.plays || 0;
        }
        if (artistPlays) artistPlays.innerHTML = `${totalPlays.toLocaleString()} plays`;
        if (artistBio) artistBio.innerHTML = artist.bio || 'No bio available';
        
        const isFollowing = followedArtists.includes(artistId);
        const followBtn = document.getElementById('followBtn');
        if (followBtn) {
            followBtn.innerHTML = isFollowing ? '✓ Following' : '+ Follow';
            if (isFollowing) {
                followBtn.classList.add('following');
            } else {
                followBtn.classList.remove('following');
            }
            // Remove any existing onclick and set new one
            followBtn.onclick = function() {
                toggleFollowArtist();
            };
        }
        
        // Check if user is admin or superadmin to show menu button
        fetch(`${API_URL}/auth/profile`, {
            headers: { 'Authorization': `Bearer ${token}` }
        }).then(userResponse => userResponse.json()).then(user => {
            const artistMenuBtn = document.getElementById('artistMenuBtn');
            if (artistMenuBtn) {
                artistMenuBtn.style.display = (user.role === 'superadmin' || user.role === 'admin') ? 'inline-flex' : 'none';
            }
        });
        
        renderArtistSongsTable(currentArtistData.songs, artist);
        
        // Attach event listeners for artist action buttons
        const playAllBtn = document.getElementById('playAllArtistSongsBtn');
        if (playAllBtn) {
            playAllBtn.onclick = function() {
                if (currentArtistData && currentArtistData.songs.length > 0) {
                    playSongById(currentArtistData.songs[0]._id);
                    window.playlistQueue = [...currentArtistData.songs];
                    window.playlistQueueIndex = 0;
                    showToastMessage(`▶ Playing all songs by ${currentArtistData.name}`);
                }
            };
        }
        
        const shuffleBtn = document.getElementById('shuffleArtistSongsBtn');
        if (shuffleBtn) {
            shuffleBtn.onclick = function() {
                if (currentArtistData && currentArtistData.songs.length > 0) {
                    const shuffled = [...currentArtistData.songs];
                    for (let i = shuffled.length - 1; i > 0; i--) {
                        const j = Math.floor(Math.random() * (i + 1));
                        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
                    }
                    window.playlistQueue = shuffled;
                    window.playlistQueueIndex = 0;
                    playSongById(shuffled[0]._id);
                    showToastMessage(`🔀 Shuffling songs by ${currentArtistData.name}`);
                }
            };
        }
        
        const likeArtistBtn = document.getElementById('likeArtistBtn');
        if (likeArtistBtn) {
            likeArtistBtn.onclick = function() {
                if (currentArtistData && currentArtistData.songs.length > 0) {
                    let addedCount = 0;
                    for (let song of currentArtistData.songs) {
                        const songKey = `${song.title} - ${song.artist}`;
                        if (!favorites.includes(songKey)) {
                            favorites.push(songKey);
                            addedCount++;
                        }
                    }
                    localStorage.setItem('favorites', JSON.stringify(favorites));
                    showToastMessage(`❤️ Added ${addedCount} songs by ${currentArtistData.name} to Favorites`);
                    updateFavBtn();
                    const favTab = document.getElementById('favoritesTab');
                    if (favTab && favTab.style.display !== 'none') {
                        showFavorites();
                    }
                }
            };
        }
        
        // REWRITTEN moreArtistBtn - opens the full menu
        const moreBtn = document.getElementById('moreArtistBtn');
        if (moreBtn) {
            moreBtn.onclick = function(event) {
                event.stopPropagation();
                openArtistMenuForMore(event);
            };
        }
        
        const artistsListView = document.getElementById('artistsListView');
        const artistDetailView = document.getElementById('artistDetailView');
        if (artistsListView) artistsListView.style.display = 'none';
        if (artistDetailView) artistDetailView.style.display = 'block';
        
        const artistsTab = document.getElementById('artistsTab');
        if (artistsTab) artistsTab.scrollTop = 0;
        
    } catch (error) {
        console.error('Error opening artist:', error);
        alert('Could not load artist details');
    }
}
function renderArtistSongsTable(songs, artist) {
    const tbody = document.getElementById('artistSongsTableBody');
    if (!tbody) return;
    
    if (!songs || !songs.length) {
        tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; padding:40px;">No songs available</td></tr>';
        return;
    }
    
    const artistImage = artist.image ? API_URL.replace('/api', '') + artist.image : null;
    
    tbody.innerHTML = songs.map((song, index) => {
        const thumbnailHtml = artistImage 
            ? `<img src="${artistImage}" class="artist-thumbnail" onerror="this.src=''">`
            : `<div class="artist-thumbnail" style="display:flex;align-items:center;justify-content:center;">${song.title ? song.title.charAt(0).toUpperCase() : '?'}</div>`;
        
        const duration = song.duration || '--:--';
        
        return `
            <tr class="song-row" onclick="playSongById('${song._id}')">
                <td style="padding:12px;">${index + 1}</td>
                <td style="padding:12px;">
                    <div class="title-cell">
                        ${thumbnailHtml}
                        <div>
                            <div class="song-name">${escapeHtml(song.title)}</div>
                            <div class="song-artist">${escapeHtml(artist.name)}</div>
                        </div>
                    </div>
                </td>
                <td style="padding:12px; color:#b3b3b3;">${escapeHtml(song.album || 'Single')}</td>
                <td style="padding:12px; color:#b3b3b3;">${duration}</td>
                <td style="padding:12px;">
                    <button class="menu-btn" onclick="event.stopPropagation(); openMenu(event, ${JSON.stringify(song).replace(/"/g, '&quot;')})">⋮</button>
                </td>
            </tr>
        `;
    }).join('');
}

function backToArtistsList() {
    const artistsListView = document.getElementById('artistsListView');
    const artistDetailView = document.getElementById('artistDetailView');
    if (artistsListView) artistsListView.style.display = 'block';
    if (artistDetailView) artistDetailView.style.display = 'none';
    currentArtistData = null;
}
function toggleFollowArtist() {
    if (!currentArtistData) return;
    
    const artistId = currentArtistData._id;
    const index = followedArtists.indexOf(artistId);
    
    if (index === -1) {
        followedArtists.push(artistId);
        showToastMessage(`✓ Following ${currentArtistData.name}`);
    } else {
        followedArtists.splice(index, 1);
        showToastMessage(`❌ Unfollowed ${currentArtistData.name}`);
    }
    
    localStorage.setItem('followedArtists', JSON.stringify(followedArtists));
    
    const followBtn = document.getElementById('followBtn');
    const isFollowing = followedArtists.includes(artistId);
    if (followBtn) {
        followBtn.innerHTML = isFollowing ? '✓ Following' : '+ Follow';
        if (isFollowing) {
            followBtn.classList.add('following');
        } else {
            followBtn.classList.remove('following');
        }
    }
}
function shareArtist() {
    if (!currentArtistData) return;
    const shareText = `🎤 Check out ${currentArtistData.name} on Wave!`;
    navigator.clipboard.writeText(shareText);
    showToastMessage(`🔗 Artist link copied!`);
}

function viewArtistStats() {
    if (!currentArtistData) return;
    let totalPlays = 0;
    for (let song of currentArtistData.songs) {
        totalPlays += song.plays || 0;
    }
    const songCount = currentArtistData.songs.length;
    const followerCount = followedArtists.filter(id => id === currentArtistData._id).length;
    
    showToastMessage(`📊 ${currentArtistData.name}: ${songCount} songs, ${totalPlays} total plays`);
    
    // Optional: Show a modal with more details
    const modal = document.createElement('div');
    modal.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.9);z-index:10000;display:flex;justify-content:center;align-items:center;';
    modal.innerHTML = `
        <div style="background:#181818;padding:30px;border-radius:16px;width:90%;max-width:400px;text-align:center;">
            <h2 style="color:#1DB954;">📊 ${escapeHtml(currentArtistData.name)}</h2>
            <div style="margin:20px 0;">
                <div style="margin:15px 0;"><span style="font-size:32px;font-weight:bold;color:#1DB954;">${songCount}</span><br><span style="color:#b3b3b3;">Songs</span></div>
                <div style="margin:15px 0;"><span style="font-size:32px;font-weight:bold;color:#1DB954;">${totalPlays.toLocaleString()}</span><br><span style="color:#b3b3b3;">Total Plays</span></div>
                <div style="margin:15px 0;"><span style="font-size:32px;font-weight:bold;color:#1DB954;">${followerCount}</span><br><span style="color:#b3b3b3;">You follow</span></div>
            </div>
            <button onclick="this.closest('div').parentElement.remove()" class="btn-green" style="padding:10px 24px;">Close</button>
        </div>
    `;
    document.body.appendChild(modal);
}
// Play all artist songs
document.getElementById('playAllArtistSongsBtn')?.addEventListener('click', () => {
    if (currentArtistData && currentArtistData.songs.length) {
        playSongById(currentArtistData.songs[0]._id);
        window.playlistQueue = [...currentArtistData.songs];
        window.playlistQueueIndex = 0;
        showToastMessage(`▶ Playing all songs by ${currentArtistData.name}`);
    }
});

document.getElementById('shuffleArtistSongsBtn')?.addEventListener('click', () => {
    if (currentArtistData && currentArtistData.songs.length) {
        const shuffled = [...currentArtistData.songs];
        for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        window.playlistQueue = shuffled;
        window.playlistQueueIndex = 0;
        playSongById(shuffled[0]._id);
        showToastMessage(`🔀 Shuffling songs by ${currentArtistData.name}`);
    }
});

document.getElementById('likeArtistBtn')?.addEventListener('click', () => {
    if (currentArtistData) {
        showToastMessage(`❤️ Added ${currentArtistData.name} to your library`);
    }
});

document.getElementById('moreArtistBtn')?.addEventListener('click', () => {
    if (currentArtistData) {
        alert(`More options for ${currentArtistData.name}`);
    }
});

// ============ ADMIN FUNCTIONS ============
async function searchArtists(query) {
    const suggestions = document.getElementById('artistSuggestions');
    if (!suggestions) return;
    
    if (!query || query.trim().length < 1) {
        suggestions.style.display = 'none';
        return;
    }
    try {
        const response = await fetch(`${API_URL}/artists/search/${encodeURIComponent(query)}`);
        const artists = await response.json();
        if (!artists.length) {
            suggestions.style.display = 'none';
            return;
        }
        suggestions.innerHTML = artists.map(artist => `<div onclick="selectArtist('${artist._id}','${artist.name}')" style="padding:10px 16px;cursor:pointer;display:flex;align-items:center;gap:10px;border-bottom:1px solid #404040;">
            ${artist.image ? `<img src="${API_URL.replace('/api', '')}${artist.image}" style="width:30px;height:30px;border-radius:50%;object-fit:cover;">` : `<div style="width:30px;height:30px;border-radius:50%;background:#1DB954;">🎤</div>`}
            <span>${artist.name}</span>
        </div>`).join('');
        suggestions.style.display = 'block';
    } catch (error) {
        console.error('Error searching artists:', error);
    }
}

function selectArtist(id, name) {
    const adminArtistSearch = document.getElementById('adminArtistSearch');
    if (adminArtistSearch) adminArtistSearch.value = name;
    const artistSuggestions = document.getElementById('artistSuggestions');
    if (artistSuggestions) artistSuggestions.style.display = 'none';
    checkArtist();
}

async function checkArtist() {
    const username = document.getElementById('adminArtistSearch')?.value.trim();
    const artistCheckResult = document.getElementById('artistCheckResult');
    if (!username || !artistCheckResult) return;
    
    artistCheckResult.innerHTML = '<p style="color:#f39c12;">Searching...</p>';
    try {
        const response = await fetch(`${API_URL}/artists/search/${encodeURIComponent(username)}`);
        const artists = await response.json();
        const found = artists.find(a => a.name.toLowerCase() === username.toLowerCase());
        
        const createArtistCard = document.getElementById('createArtistCard');
        const adminUploadCard = document.getElementById('adminUploadCard');
        const adminMixCard = document.getElementById('adminMixCard');
        const adminUploadArtistName = document.getElementById('adminUploadArtistName');
        const adminMixArtistName = document.getElementById('adminMixArtistName');
        
        if (found) {
            const isDJ = found.name.toLowerCase().startsWith('dj');
            artistCheckResult.innerHTML = `<p style="color:#1DB954;">✅ <b>${found.name}</b> found${isDJ ? ' - DJ (Mixes)' : ''}</p>`;
            if (createArtistCard) createArtistCard.style.display = 'none';
            if (adminUploadArtistName) adminUploadArtistName.textContent = found.name;
            if (adminMixArtistName) adminMixArtistName.textContent = found.name;
            if (adminUploadCard) adminUploadCard.style.display = isDJ ? 'none' : 'block';
            if (adminMixCard) adminMixCard.style.display = isDJ ? 'block' : 'none';
            selectedArtist = found.name;
        } else {
            artistCheckResult.innerHTML = '<p style="color:#e74c3c;">❌ Not found. Create below.</p>';
            if (createArtistCard) createArtistCard.style.display = 'block';
            if (adminUploadCard) adminUploadCard.style.display = 'none';
            if (adminMixCard) adminMixCard.style.display = 'none';
            const newArtistUsername = document.getElementById('newArtistUsername');
            if (newArtistUsername) newArtistUsername.value = username;
            selectedArtist = '';
        }
    } catch (error) {
        artistCheckResult.innerHTML = '<p style="color:#e74c3c;">Error searching</p>';
    }
}

async function createArtist() {
    const username = document.getElementById('newArtistUsername')?.value.trim();
    const genre = document.getElementById('newArtistGenre')?.value || '';
    const bio = document.getElementById('newArtistBio')?.value || '';
    const avatar = document.getElementById('newArtistAvatar')?.files[0];
    const statusDiv = document.getElementById('createArtistStatus');
    
    if (!username) {
        if (statusDiv) {
            statusDiv.style.color = '#e74c3c';
            statusDiv.textContent = '❌ Name required';
        }
        return;
    }
    
    const formData = new FormData();
    formData.append('name', username);
    if (genre) formData.append('genre', genre);
    if (bio) formData.append('bio', bio);
    if (avatar) formData.append('image', avatar);
    
    if (statusDiv) {
        statusDiv.style.color = '#f39c12';
        statusDiv.textContent = 'Creating...';
    }
    
    try {
        const response = await fetch(`${API_URL}/artists`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` },
            body: formData
        });
        const data = await response.json();
        if (data.artist) {
            if (statusDiv) {
                statusDiv.style.color = '#1DB954';
                statusDiv.textContent = '✅ Created!';
            }
            selectedArtist = data.artist.name;
            const createArtistCard = document.getElementById('createArtistCard');
            const adminUploadCard = document.getElementById('adminUploadCard');
            const adminMixCard = document.getElementById('adminMixCard');
            const adminUploadArtistName = document.getElementById('adminUploadArtistName');
            const adminMixArtistName = document.getElementById('adminMixArtistName');
            const artistCheckResult = document.getElementById('artistCheckResult');
            
            if (createArtistCard) createArtistCard.style.display = 'none';
            const isDJ = data.artist.name.toLowerCase().startsWith('dj');
            if (adminUploadCard) adminUploadCard.style.display = isDJ ? 'none' : 'block';
            if (adminMixCard) adminMixCard.style.display = isDJ ? 'block' : 'none';
            if (adminUploadArtistName) adminUploadArtistName.textContent = data.artist.name;
            if (adminMixArtistName) adminMixArtistName.textContent = data.artist.name;
            if (artistCheckResult) artistCheckResult.innerHTML = `<p style="color:#1DB954;">✅ <b>${data.artist.name}</b> created!</p>`;
        } else {
            if (statusDiv) {
                statusDiv.style.color = '#e74c3c';
                statusDiv.textContent = '❌ ' + (data.error || 'Failed');
            }
        }
    } catch (error) {
        if (statusDiv) {
            statusDiv.style.color = '#e74c3c';
            statusDiv.textContent = '❌ Error';
        }
    }
}

async function adminUploadSong() {
    const title = document.getElementById('adminUploadTitle')?.value;
    const audioFile = document.getElementById('adminUploadAudio')?.files[0];
    const coverFile = document.getElementById('adminUploadCover')?.files[0];
    const lyricsFile = document.getElementById('adminUploadLyrics')?.files[0];
    const statusDiv = document.getElementById('adminUploadStatus');
    
    if (!title || !audioFile || !selectedArtist) {
        if (statusDiv) {
            statusDiv.style.color = '#e74c3c';
            statusDiv.textContent = '❌ Required fields missing';
        }
        return;
    }
    
    const formData = new FormData();
    formData.append('title', title);
    formData.append('artist', selectedArtist);
    formData.append('audio', audioFile);
    if (coverFile) formData.append('cover', coverFile);
    if (lyricsFile) formData.append('lyrics', lyricsFile);
    
    if (statusDiv) {
        statusDiv.style.color = '#f39c12';
        statusDiv.textContent = '⏳ Uploading...';
    }
    
    try {
        const response = await fetch(`${API_URL}/songs/admin/upload`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` },
            body: formData
        });
        const data = await response.json();
        if (data.song) {
            if (statusDiv) {
                statusDiv.style.color = '#1DB954';
                statusDiv.textContent = '✅ Uploaded!';
            }
            loadAllSongs();
            setTimeout(() => {
                if (statusDiv) statusDiv.textContent = '';
            }, 2000);
        } else {
            if (statusDiv) {
                statusDiv.style.color = '#e74c3c';
                statusDiv.textContent = '❌ ' + (data.error || 'Upload failed');
            }
        }
    } catch (error) {
        if (statusDiv) {
            statusDiv.style.color = '#e74c3c';
            statusDiv.textContent = '❌ Error';
        }
    }
}

async function adminUploadMix() {
    const title = document.getElementById('adminMixTitle')?.value;
    const audioFile = document.getElementById('adminMixAudio')?.files[0];
    const coverFile = document.getElementById('adminMixCover')?.files[0];
    const lyricsFile = document.getElementById('adminMixLyrics')?.files[0];
    const statusDiv = document.getElementById('adminMixStatus');
    
    if (!title || !audioFile || !selectedArtist) {
        if (statusDiv) {
            statusDiv.style.color = '#e74c3c';
            statusDiv.textContent = '❌ Required fields missing';
        }
        return;
    }
    
    const formData = new FormData();
    formData.append('title', title);
    formData.append('artist', selectedArtist);
    formData.append('audio', audioFile);
    if (coverFile) formData.append('cover', coverFile);
    if (lyricsFile) formData.append('lyrics', lyricsFile);
    
    if (statusDiv) {
        statusDiv.style.color = '#f39c12';
        statusDiv.textContent = '⏳ Uploading mix...';
    }
    
    try {
        const response = await fetch(`${API_URL}/songs/admin/upload-mix`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` },
            body: formData
        });
        const data = await response.json();
        if (data.song) {
            if (statusDiv) {
                statusDiv.style.color = '#1DB954';
                statusDiv.textContent = '✅ Mix uploaded!';
            }
            loadAllSongs();
            setTimeout(() => {
                if (statusDiv) statusDiv.textContent = '';
            }, 2000);
        } else {
            if (statusDiv) {
                statusDiv.style.color = '#e74c3c';
                statusDiv.textContent = '❌ ' + (data.error || 'Upload failed');
            }
        }
    } catch (error) {
        if (statusDiv) {
            statusDiv.style.color = '#e74c3c';
            statusDiv.textContent = '❌ Error';
        }
    }
}

function openBulkUploadWithToken() {
    const token = localStorage.getItem('token');
    if (token) {
        window.open(`https://attractive-heart-production-a507.up.railway.app/bulk-upload.html?token=${encodeURIComponent(token)}`, '_blank');
    } else {
        alert('Please log in first');
    }
}

function openBulkLyricsWithToken() {
    const token = localStorage.getItem('token');
    if (token) {
        window.open(`https://attractive-heart-production-a507.up.railway.app/bulk-lyrics.html?token=${encodeURIComponent(token)}`, '_blank');
    } else {
        alert('Please log in first');
    }
}

// ============ AI DJ MODES ============
function toggleDJMode() {
    if (djMode) {
        stopDJMode();
    } else {
        startDJMode();
    }
}

function startDJMode() {
    djMode = true;
    djIndex = 0;
    const panel = document.getElementById('rightPanel');
    const lyricsDiv = document.getElementById('rightPanelLyrics');
    const rightPanelImg = document.getElementById('rightPanelImg');
    const rightPanelTitle = document.getElementById('rightPanelTitle');
    const rightPanelArtist = document.getElementById('rightPanelArtist');
    const djBtn = document.getElementById('djBtn');
    
    if (rightPanelImg) rightPanelImg.src = 'https://placehold.co/200x200/1DB954/121212?text=🎧';
    if (rightPanelTitle) rightPanelTitle.textContent = 'AI DJ Mode';
    if (rightPanelArtist) rightPanelArtist.textContent = 'Your DJ';
    if (lyricsDiv) {
        lyricsDiv.innerHTML = `<div style="text-align:center;">
            <p id="djStatus" style="color:#b3b3b3;">Ready</p>
            <button onclick="startDJSet()" class="btn-green" style="width:auto;padding:10px 20px;font-size:14px;" id="djStartBtn">▶ Start DJ</button>
            <button onclick="skipDJTrack()" class="btn-green" style="width:auto;padding:10px 20px;font-size:14px;background:#f39c12;display:none;margin-top:8px;" id="djSkipBtn">⏭ Skip</button>
            <button onclick="stopDJMode()" class="btn-cancel" style="margin-top:8px;padding:8px 20px;background:#404040;color:white;border:none;border-radius:24px;cursor:pointer;">Exit</button>
        </div>`;
    }
    if (panel) panel.style.display = 'flex';
    const mainContent = document.querySelector('.main-content');
    if (mainContent) mainContent.classList.add('has-panel');
    if (djBtn) djBtn.style.color = '#1DB954';
}

async function startDJSet() {
    djIndex = 0;
    const djStartBtn = document.getElementById('djStartBtn');
    const djSkipBtn = document.getElementById('djSkipBtn');
    if (djStartBtn) djStartBtn.style.display = 'none';
    if (djSkipBtn) djSkipBtn.style.display = 'inline-block';
    djQueue = [...allSongs].sort(() => Math.random() - 0.5).slice(0, 10);
    await djSpeak("Hey! I'm your Wave DJ.");
    playDJTrack();
}

function playDJTrack() {
    if (djIndex >= djQueue.length) {
        const djStatus = document.getElementById('djStatus');
        if (djStatus) djStatus.textContent = 'Done!';
        djSpeak("That's all!");
        setTimeout(stopDJMode, 3000);
        return;
    }
    const song = djQueue[djIndex];
    const djStatus = document.getElementById('djStatus');
    if (djStatus) djStatus.textContent = `🎵 ${song.title}`;
    djSpeak(getDJIntro(song)).then(() => {
        if (djMode) {
            currentAudio.src = `${API_URL.replace('/api', '')}${song.fileUrl}`;
            currentAudio.play();
            isPlaying = true;
            document.getElementById('playBtn').innerHTML = '<i class="fas fa-pause"></i>';
            document.getElementById('playerTitle').textContent = song.title;
            document.getElementById('playerArtist').textContent = song.artist;
            
            const playerImg = document.getElementById('playerImg');
            const rightPanelImg = document.getElementById('rightPanelImg');
            if (song.coverUrl && song.coverUrl !== '') {
                const coverUrl = API_URL.replace('/api', '') + song.coverUrl;
                if (playerImg) playerImg.src = coverUrl;
                if (rightPanelImg) rightPanelImg.src = coverUrl;
            } else {
                const fallback = `https://placehold.co/56x56/1DB954/121212?text=${encodeURIComponent(song.title.charAt(0) || '?')}`;
                if (playerImg) playerImg.src = fallback;
                if (rightPanelImg) rightPanelImg.src = fallback;
            }
            updateStatus();
        }
    });
}

function getDJIntro(song) {
    const plays = song.plays || 0;
    if (plays > 5) return `Next: ${song.title}.`;
    if (plays > 0) return `Here's ${song.title}.`;
    return `Check out ${song.title}.`;
}

function djSpeak(text) {
    return new Promise(resolve => {
        if ('speechSynthesis' in window) {
            window.speechSynthesis.cancel();
            const utterance = new SpeechSynthesisUtterance(text);
            utterance.rate = 0.9;
            utterance.pitch = 1;
            utterance.onend = resolve;
            window.speechSynthesis.speak(utterance);
        } else {
            resolve();
        }
    });
}

function skipDJTrack() {
    currentAudio.pause();
    currentAudio.currentTime = 0;
    window.speechSynthesis.cancel();
    djIndex++;
    setTimeout(() => playDJTrack(), 300);
}

function stopDJMode() {
    djMode = false;
    djQueue = [];
    djIndex = 0;
    currentAudio.pause();
    window.speechSynthesis.cancel();
    hideRightPanel();
    const djBtn = document.getElementById('djBtn');
    if (djBtn) djBtn.style.color = '#b3b3b3';
    isPlaying = false;
    updateStatus();
}

let djDeepMode = false;
let djDeepQueue = [];
let djDeepIndex = 0;

function toggleDeepDJMode() {
    if (djDeepMode) {
        stopDeepDJMode();
    } else {
        startDeepDJMode();
    }
}

function startDeepDJMode() {
    djDeepMode = true;
    const panel = document.getElementById('rightPanel');
    const lyricsDiv = document.getElementById('rightPanelLyrics');
    const rightPanelImg = document.getElementById('rightPanelImg');
    const rightPanelTitle = document.getElementById('rightPanelTitle');
    const deepDjBtn = document.getElementById('deepDjBtn');
    
    if (rightPanelImg) rightPanelImg.src = 'https://placehold.co/200x200/FF9800/121212?text=🌐';
    if (rightPanelTitle) rightPanelTitle.textContent = 'AI Deep DJ';
    if (lyricsDiv) {
        lyricsDiv.innerHTML = `<div style="text-align:center;">
            <p id="djDeepStatus" style="color:#b3b3b3;">Ready</p>
            <button onclick="startDeepDJSet()" class="btn-green" style="width:auto;padding:10px 20px;background:#FF9800;" id="djDeepStartBtn">▶ Start Online DJ</button>
            <button onclick="skipDeepDJTrack()" class="btn-green" style="width:auto;padding:10px 20px;background:#f39c12;display:none;margin-top:8px;" id="djDeepSkipBtn">⏭ Skip</button>
            <button onclick="stopDeepDJMode()" class="btn-cancel" style="margin-top:8px;padding:8px 20px;background:#404040;color:white;border:none;border-radius:24px;cursor:pointer;">Exit</button>
        </div>`;
    }
    if (panel) panel.style.display = 'flex';
    const mainContent = document.querySelector('.main-content');
    if (mainContent) mainContent.classList.add('has-panel');
    if (deepDjBtn) deepDjBtn.style.color = '#FF9800';
}

async function startDeepDJSet() {
    djDeepIndex = 0;
    const djDeepStartBtn = document.getElementById('djDeepStartBtn');
    const djDeepSkipBtn = document.getElementById('djDeepSkipBtn');
    if (djDeepStartBtn) djDeepStartBtn.style.display = 'none';
    if (djDeepSkipBtn) djDeepSkipBtn.style.display = 'inline-block';
    const searches = ['top hits', 'dance mix', 'party music', 'chill vibes'];
    djDeepQueue = [];
    for (let search of searches) {
        try {
            const response = await fetch(`${API_URL}/ai/deezer/${encodeURIComponent(search)}`);
            const data = await response.json();
            if (data.data && data.data.length) djDeepQueue.push(...data.data.slice(0, 5));
        } catch (error) {}
    }
    djDeepQueue = djDeepQueue.sort(() => Math.random() - 0.5);
    if (!djDeepQueue.length) {
        const djDeepStatus = document.getElementById('djDeepStatus');
        if (djDeepStatus) djDeepStatus.textContent = 'No tracks.';
        return;
    }
    await djDeepSpeak("Playing the hottest tracks.");
    playDeepDJTrack();
}

function playDeepDJTrack() {
    if (djDeepIndex >= djDeepQueue.length) {
        const djDeepStatus = document.getElementById('djDeepStatus');
        if (djDeepStatus) djDeepStatus.textContent = 'Done!';
        djDeepSpeak("That's all!");
        setTimeout(stopDeepDJMode, 3000);
        return;
    }
    const song = djDeepQueue[djDeepIndex];
    const cover = song.album?.cover_medium || '';
    const rightPanelImg = document.getElementById('rightPanelImg');
    if (cover && rightPanelImg) rightPanelImg.src = cover;
    djDeepSpeak(`Next: ${song.title}`).then(() => {
        if (djDeepMode && song.preview) {
            currentAudio.src = song.preview;
            currentAudio.play();
            isPlaying = true;
            document.getElementById('playBtn').innerHTML = '<i class="fas fa-pause"></i>';
            document.getElementById('playerTitle').textContent = song.title;
            
            const playerImg = document.getElementById('playerImg');
            if (cover && playerImg) playerImg.src = cover;
            updateStatus();
        }
    });
}

function djDeepSpeak(text) {
    return new Promise(resolve => {
        if ('speechSynthesis' in window) {
            window.speechSynthesis.cancel();
            const utterance = new SpeechSynthesisUtterance(text);
            utterance.rate = 0.9;
            utterance.pitch = 1;
            utterance.onend = resolve;
            window.speechSynthesis.speak(utterance);
        } else {
            resolve();
        }
    });
}

function skipDeepDJTrack() {
    currentAudio.pause();
    currentAudio.currentTime = 0;
    window.speechSynthesis.cancel();
    djDeepIndex++;
    setTimeout(() => playDeepDJTrack(), 300);
}

function stopDeepDJMode() {
    djDeepMode = false;
    djDeepQueue = [];
    djDeepIndex = 0;
    currentAudio.pause();
    window.speechSynthesis.cancel();
    hideRightPanel();
    const deepDjBtn = document.getElementById('deepDjBtn');
    if (deepDjBtn) deepDjBtn.style.color = '#FF9800';
    isPlaying = false;
    updateStatus();
}

// ============ ACCOUNT FUNCTIONS ============
async function updateWaveMix() {
    const prefs = JSON.parse(localStorage.getItem('wave_preferences') || '[]');
    try {
        const response = await fetch(`${API_URL}/auth/update-wave-mix`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ preferences: prefs })
        });
        const data = await response.json();
        if (data.message) {
            showToastMessage('✅ Wave Mix updated!');
        } else {
            showToastMessage('❌ Failed');
        }
    } catch (error) {
        showToastMessage('Error');
    }
}

async function updateProfile() {
    const formData = new FormData();
    const profileUsername = document.getElementById('profileUsername');
    const profileEmail = document.getElementById('profileEmail');
    const profileBio = document.getElementById('profileBio');
    const profileAvatar = document.getElementById('profileAvatar');
    
    if (profileUsername) formData.append('username', profileUsername.value);
    if (profileEmail) formData.append('email', profileEmail.value);
    if (profileBio) formData.append('bio', profileBio.value || '');
    if (profileAvatar && profileAvatar.files[0]) formData.append('avatar', profileAvatar.files[0]);
    
    try {
        const response = await fetch(`${API_URL}/auth/profile`, {
            method: 'PUT',
            headers: { 'Authorization': `Bearer ${token}` },
            body: formData
        });
        const data = await response.json();
        if (data.user) {
            showToastMessage('✅ Profile updated!');
            const userDisplay = document.getElementById('userDisplay');
            if (userDisplay) userDisplay.textContent = data.user.username;
            const avatarLetter = document.getElementById('avatarLetter');
            if (avatarLetter) avatarLetter.textContent = (data.user.username || 'U')[0].toUpperCase();
        } else {
            showToastMessage('❌ Update failed');
        }
    } catch (error) {
        showToastMessage('Error');
    }
}

function changePassword() {
    const current = document.getElementById('currentPassword')?.value;
    const newPass = document.getElementById('newPassword')?.value;
    const confirm = document.getElementById('confirmPassword')?.value;
    
    if (!current || !newPass || !confirm) {
        showToastMessage('Fill all fields');
        return;
    }
    if (newPass.length < 6) {
        showToastMessage('Password must be at least 6 characters');
        return;
    }
    if (newPass !== confirm) {
        showToastMessage('Passwords do not match');
        return;
    }
    showToastMessage('✅ Password changed!');
}

document.getElementById('newPassword')?.addEventListener('input', function() {
    const password = this.value;
    const strengthDiv = document.getElementById('passwordStrength');
    if (!strengthDiv) return;
    let score = 0;
    if (password.length >= 6) score++;
    if (password.length >= 10) score++;
    if (/[A-Z]/.test(password)) score++;
    if (/[0-9]/.test(password)) score++;
    strengthDiv.innerHTML = score <= 1 ? '<span class="strength-weak">Weak</span>' : score <= 3 ? '<span class="strength-medium">Medium</span>' : '<span class="strength-strong">Strong 💪</span>';
});

function deleteAccount() {
    if (confirm('Delete your account permanently?') && confirm('Really? This cannot be undone.')) {
        showToastMessage('Goodbye!');
        localStorage.clear();
        window.location.href = 'login.html';
    }
}

function updateStats() {
    const statFavorites = document.getElementById('statFavorites');
    const statPlaylists = document.getElementById('statPlaylists');
    const statRecent = document.getElementById('statRecent');
    if (statFavorites) statFavorites.textContent = favorites.length;
    if (statPlaylists) statPlaylists.textContent = playlists.length;
    if (statRecent) statRecent.textContent = recentSongs.length;
}

// ============ TAB SWITCHING ============
function switchTab(tab) {
    document.querySelectorAll('.tab-content').forEach(t => t.style.display = 'none');
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    
    const tabElement = document.getElementById(tab + 'Tab');
    if (tabElement) tabElement.style.display = 'block';
    
    const activeNav = document.querySelector(`.nav-item[onclick="switchTab('${tab}')"]`);
    if (activeNav) activeNav.classList.add('active');
    
    if (tab === 'favorites') showFavorites();
    if (tab === 'playlists') showPlaylists();
    if (tab === 'artists') loadArtists();
    if (tab === 'account') updateStats();
    if (tab === 'upload') loadMyUploads();
    if (tab === 'home' || tab === 'mixes') loadAllSongs();
    if (tab === 'wavo') {
        if (typeof updateWavoKeyStatus === 'function') {
            updateWavoKeyStatus();
        }
    }
}

// ============ LOGOUT FUNCTION ============
function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('userId');
    window.location.href = 'login.html';
}

// ============ CHECK ADMIN ============
async function checkAdmin() {
    try {
        const response = await fetch(`${API_URL}/auth/profile`, {
            method: 'GET',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (response.ok) {
            const data = await response.json();
            if (data.role === 'admin' || data.role === 'superadmin') {
                const uploadNav = document.getElementById('uploadNav');
                const adminNav = document.getElementById('adminNav');
                if (uploadNav) uploadNav.style.display = 'none';
                if (adminNav) adminNav.style.display = 'flex';
            }
        }
    } catch (error) {}
}

// ============ LOAD USER DETAILS ============
async function loadUserDetails() {
    try {
        const response = await fetch(`${API_URL}/auth/profile`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (response.ok) {
            const data = await response.json();
            const profileUsername = document.getElementById('profileUsername');
            const profileEmail = document.getElementById('profileEmail');
            const userDisplay = document.getElementById('userDisplay');
            const avatarLetter = document.getElementById('avatarLetter');
            const accountAvatar = document.getElementById('accountAvatar');
            
            if (profileUsername) profileUsername.value = data.username || 'User';
            if (profileEmail) profileEmail.value = data.email || '';
            if (userDisplay) userDisplay.textContent = data.username || 'User';
            if (avatarLetter) avatarLetter.textContent = (data.username || 'U')[0].toUpperCase();
            if (data.avatar && accountAvatar) accountAvatar.src = API_URL.replace('/api', '') + data.avatar;
        }
    } catch (error) {}
}

// ============ SHOW APP ============
function showApp() {
    const app = document.getElementById('app');
    if (app) app.style.display = 'flex';
    checkAdmin();
    loadUserDetails();
}

// ============ WAVO AI DJ ============
let wavoApiKey = localStorage.getItem('groq_api_key') || '';
let wavoMessages = [];
let wavoVoiceEnabled = true;

function saveGroqKey() {
    const keyInput = document.getElementById('groqApiKey');
    if (keyInput) {
        wavoApiKey = keyInput.value.trim();
        localStorage.setItem('groq_api_key', wavoApiKey);
        updateWavoKeyStatus();
        showToastMessage('✅ Groq API key saved!');
    }
}

function updateWavoKeyStatus() {
    const statusSpan = document.getElementById('wavoKeyStatus');
    if (statusSpan) {
        if (wavoApiKey && wavoApiKey.startsWith('gsk_')) {
            statusSpan.innerHTML = '🟢 Groq API key ready';
            statusSpan.style.color = '#1DB954';
        } else {
            statusSpan.innerHTML = '🔴 No valid key set';
            statusSpan.style.color = '#e74c3c';
        }
    }
    const keyInput = document.getElementById('groqApiKey');
    if (keyInput && wavoApiKey) {
        keyInput.value = wavoApiKey;
    }
}

function toggleWavoVoice() {
    wavoVoiceEnabled = !wavoVoiceEnabled;
    const btn = document.getElementById('wavoVoiceBtn');
    if (btn) {
        btn.innerHTML = wavoVoiceEnabled ? '🔊' : '🔇';
    }
}

function speakWavo(text) {
    if (!wavoVoiceEnabled) return;
    if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.rate = 0.9;
        utterance.pitch = 1;
        window.speechSynthesis.speak(utterance);
    }
}

function addWavoMessage(text, isUser = false) {
    const chatDiv = document.getElementById('wavoChat');
    if (!chatDiv) return;
    
    const messageDiv = document.createElement('div');
    messageDiv.className = `wavo-message ${isUser ? 'wavo-user' : 'wavo-bot'}`;
    messageDiv.style.marginBottom = '12px';
    messageDiv.style.textAlign = isUser ? 'right' : 'left';
    messageDiv.innerHTML = `<strong>${isUser ? '👤 You' : '🎧 Wavo'}:</strong> ${escapeHtml(text)}`;
    chatDiv.appendChild(messageDiv);
    chatDiv.scrollTop = chatDiv.scrollHeight;
}

async function sendWavoMessage(userMessage) {
    const input = document.getElementById('wavoInput');
    const message = userMessage || input?.value.trim();
    
    if (!message) return;
    
    if (input) input.value = '';
    
    addWavoMessage(message, true);
    
    if (!wavoApiKey || !wavoApiKey.startsWith('gsk_')) {
        addWavoMessage("Please set your Groq API key first. Click the settings area below and paste your key.");
        return;
    }
    
    const songContext = getSongContextForWavo();
    
    const systemPrompt = `You are Wavo, an AI DJ and music assistant for a music streaming app called Wave. 
You have access to the user's music library. Here are the songs available:

${songContext}

Your job:
1. Recommend songs from this list based on user requests
2. Suggest playlists by mood, genre, or artist
3. Be enthusiastic and music-focused
4. When recommending songs, list them clearly with artist names
5. Keep responses helpful and concise (2-3 sentences usually, plus song recommendations)

Current conversation context: ${wavoMessages.slice(-6).map(m => `${m.role}: ${m.content}`).join(' | ')}

Respond as Wavo the AI DJ. Be friendly and knowledgeable about music.`;
    
    try {
        const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${wavoApiKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: 'llama3-70b-8192',
                messages: [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: message }
                ],
                temperature: 0.7,
                max_tokens: 500
            })
        });
        
        const data = await response.json();
        
        if (data.choices && data.choices[0] && data.choices[0].message) {
            const reply = data.choices[0].message.content;
            addWavoMessage(reply);
            speakWavo(reply);
            
            wavoMessages.push({ role: 'user', content: message });
            wavoMessages.push({ role: 'assistant', content: reply });
            if (wavoMessages.length > 20) wavoMessages = wavoMessages.slice(-20);
        } else {
            addWavoMessage("Sorry, I'm having trouble connecting right now. Check your API key.");
            console.error('Groq error:', data);
        }
    } catch (error) {
        console.error('Wavo error:', error);
        addWavoMessage("Network error. Please check your connection and API key.");
    }
}
// Regular next button (no talking, just plays next song)
function playNextRegular() {
    if (window.playlistQueue && window.playlistQueueIndex < window.playlistQueue.length - 1) {
        window.playlistQueueIndex++;
        playSongById(window.playlistQueue[window.playlistQueueIndex]._id);
    } else if (allSongs.length) {
        ci = isShuffle ? Math.floor(Math.random() * allSongs.length) : (ci + 1) % allSongs.length;
        playSong(ci);
    }
    updateFavBtn();
}

function getSongContextForWavo() {
    if (!allSongs || allSongs.length === 0) {
        return "No songs loaded yet. User will upload songs soon.";
    }
    
    const songList = allSongs.slice(0, 30).map(song => {
        return `- "${song.title}" by ${song.artist}${song.genre ? ` (Genre: ${song.genre})` : ''}${song.mood ? ` (Mood: ${song.mood})` : ''}`;
    }).join('\n');
    
    const totalCount = allSongs.length;
    const genres = [...new Set(allSongs.filter(s => s.genre).map(s => s.genre))];
    const artists = [...new Set(allSongs.map(s => s.artist))].slice(0, 20);
    
    return `Total songs: ${totalCount}
Artists available: ${artists.join(', ')}
Genres available: ${genres.join(', ')}

Songs (sample of up to 30):
${songList}`;
}
// ============ ARTIST EDIT/DELETE FOR SUPERADMIN ============

function openArtistMenu(event) {
    event.stopPropagation();
    closeMenu();
    
    const button = event.currentTarget;
    const rect = button.getBoundingClientRect();
    
    const menu = document.createElement('div');
    menu.className = 'popup-menu';
    menu.style.position = 'fixed';
    menu.style.top = (rect.bottom + 5) + 'px';
    menu.style.right = (window.innerWidth - rect.right) + 'px';
    menu.style.backgroundColor = '#282828';
    menu.style.borderRadius = '8px';
    menu.style.boxShadow = '0 4px 20px rgba(0,0,0,0.5)';
    menu.style.minWidth = '200px';
    menu.style.zIndex = '10000';
    menu.style.overflow = 'hidden';
    
    fetch(`${API_URL}/auth/profile`, {
        headers: { 'Authorization': `Bearer ${token}` }
    }).then(userResponse => userResponse.json()).then(user => {
        const isAdmin = (user.role === 'superadmin' || user.role === 'admin');
        
        let menuHTML = `
            <div class="popup-menu-item" onclick="shareArtist()">
                <span>📤</span> Share Artist
            </div>
            <div class="popup-menu-item" onclick="viewArtistStats()">
                <span>📊</span> View Stats
            </div>
            <div class="popup-menu-item" onclick="addAllArtistSongsToPlaylist()">
                <span>📋</span> Add All Songs to Playlist
            </div>
        `;
        
        if (isAdmin) {
            menuHTML += `
                <div class="popup-menu-item" onclick="editArtist()">
                    <span>✏️</span> Edit Artist
                </div>
                <div class="popup-menu-item danger" onclick="deleteArtist()">
                    <span>🗑️</span> Delete Artist
                </div>
            `;
        }
        
        menu.innerHTML = menuHTML;
        document.body.appendChild(menu);
        activeMenu = menu;
        
        setTimeout(() => {
            document.addEventListener('click', function closeOnClick(e) {
                if (!menu.contains(e.target) && !button.contains(e.target)) {
                    closeMenu();
                    document.removeEventListener('click', closeOnClick);
                }
            });
        }, 10);
    }).catch(() => {
        let menuHTML = `
            <div class="popup-menu-item" onclick="shareArtist()">
                <span>📤</span> Share Artist
            </div>
            <div class="popup-menu-item" onclick="viewArtistStats()">
                <span>📊</span> View Stats
            </div>
            <div class="popup-menu-item" onclick="addAllArtistSongsToPlaylist()">
                <span>📋</span> Add All Songs to Playlist
            </div>
        `;
        menu.innerHTML = menuHTML;
        document.body.appendChild(menu);
        activeMenu = menu;
    });
}

function editArtist() {
    if (!currentArtistData) return;
    
    // Create modal for editing artist
    const modal = document.createElement('div');
    modal.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.9);z-index:10000;display:flex;justify-content:center;align-items:center;';
    
    modal.innerHTML = `
        <div style="background:#181818;padding:30px;border-radius:16px;width:90%;max-width:500px;">
            <h2 style="color:#1DB954;margin-bottom:20px;">✏️ Edit Artist</h2>
            <div style="margin-bottom:15px;">
                <label style="color:#b3b3b3;display:block;margin-bottom:5px;">Artist Name</label>
                <input type="text" id="editArtistName" value="${escapeHtml(currentArtistData.name)}" style="width:100%;padding:12px;background:#282828;border:1px solid #404040;border-radius:8px;color:white;">
            </div>
            <div style="margin-bottom:15px;">
                <label style="color:#b3b3b3;display:block;margin-bottom:5px;">Genre</label>
                <input type="text" id="editArtistGenre" value="${escapeHtml(currentArtistData.genre || '')}" style="width:100%;padding:12px;background:#282828;border:1px solid #404040;border-radius:8px;color:white;">
            </div>
            <div style="margin-bottom:15px;">
                <label style="color:#b3b3b3;display:block;margin-bottom:5px;">Bio</label>
                <textarea id="editArtistBio" rows="3" style="width:100%;padding:12px;background:#282828;border:1px solid #404040;border-radius:8px;color:white;">${escapeHtml(currentArtistData.bio || '')}</textarea>
            </div>
            <div style="margin-bottom:20px;">
                <label style="color:#b3b3b3;display:block;margin-bottom:5px;">Artist Photo</label>
                ${currentArtistData.image ? `<img src="${API_URL.replace('/api', '')}${currentArtistData.image}" style="width:80px;height:80px;border-radius:50%;object-fit:cover;margin-bottom:10px;">` : ''}
                <input type="file" id="editArtistImage" accept="image/*" style="width:100%;padding:12px;background:#282828;border:1px solid #404040;border-radius:8px;color:white;">
            </div>
            <div style="display:flex;gap:12px;">
                <button onclick="saveArtistEdit()" class="btn-green" style="flex:1;">Save Changes</button>
                <button onclick="this.closest('div').parentElement.remove()" class="btn-cancel" style="flex:1;">Cancel</button>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    window.activeEditModal = modal;
}

function saveArtistEdit() {
    const newName = document.getElementById('editArtistName')?.value;
    const newGenre = document.getElementById('editArtistGenre')?.value;
    const newBio = document.getElementById('editArtistBio')?.value;
    const imageFile = document.getElementById('editArtistImage')?.files[0];
    
    const formData = new FormData();
    if (newName && newName !== currentArtistData.name) formData.append('name', newName);
    if (newGenre !== undefined) formData.append('genre', newGenre);
    if (newBio !== undefined) formData.append('bio', newBio);
    if (imageFile) formData.append('image', imageFile);
    
    fetch(`${API_URL}/artists/${currentArtistData._id}`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData
    }).then(response => response.json()).then(() => {
        showToastMessage('✅ Artist updated');
        if (window.activeEditModal) window.activeEditModal.remove();
        openArtistDetail(currentArtistData._id);
        loadArtists();
    }).catch(() => showToastMessage('❌ Update failed', true));
}

function deleteArtist() {
    if (!currentArtistData) return;
    
    if (confirm(`Delete artist "${currentArtistData.name}" and all their songs? This cannot be undone.`)) {
        // Delete all songs by this artist
        for (let song of currentArtistData.songs) {
            fetch(`${API_URL}/songs/${song._id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            }).catch(() => {});
        }
        
        // Delete the artist
        fetch(`${API_URL}/artists/${currentArtistData._id}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        }).then(() => {
            showToastMessage('🗑️ Artist deleted');
            backToArtistsList();
            loadArtists();
        }).catch(() => showToastMessage('❌ Delete failed', true));
    }
}
// ============ INITIALIZATION ============
document.addEventListener('click', function(e) {
    if (!e.target.closest('#adminArtistSearch') && !e.target.closest('#artistSuggestions')) {
        const artistSuggestions = document.getElementById('artistSuggestions');
        if (artistSuggestions) artistSuggestions.style.display = 'none';
    }
});

document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
        closeMenu();
    }
});

window.addEventListener('scroll', closeMenu);

// Initialize Wavo key status
setTimeout(() => {
    updateWavoKeyStatus();
}, 1000);

// Start the app
showApp();
loadAllSongs();

console.log('Wave app loaded');