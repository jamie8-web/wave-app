// Get token from URL parameter (passed from Wave app)
const urlParams = new URLSearchParams(window.location.search);
let token = urlParams.get('token');

if (token) {
    localStorage.setItem('token', token);
} else {
    token = localStorage.getItem('token');
}

if (!token) {
    alert('Please log into Wave app first');
    window.location.href = 'http://localhost:5000';
}

const API_URL = 'http://localhost:5000/api';

// DOM elements
const fileInput = document.getElementById('fileInput');
const reviewBtn = document.getElementById('reviewBtn');
const reviewPanel = document.getElementById('reviewPanel');
const fileListDiv = document.getElementById('fileList');
const uploadBtn = document.getElementById('uploadBtn');
const cancelBtn = document.getElementById('cancelBtn');
const progressDiv = document.getElementById('progress');
const resultsPanel = document.getElementById('resultsPanel');
const resultsDiv = document.getElementById('results');
const doneBtn = document.getElementById('doneBtn');
const reviewTitle = document.getElementById('reviewTitle');

// Mode elements
const autoModeBtn = document.getElementById('autoModeBtn');
const specificModeBtn = document.getElementById('specificModeBtn');
const specificArtistPanel = document.getElementById('specificArtistPanel');
const artistSelect = document.getElementById('artistSelect');

// State
let currentMode = 'auto'; // 'auto' or 'specific'
let filesData = [];
let selectedSpecificArtist = '';

// Complete artist list
const knownArtists = [
    'NSG', 'Kojo Funds', 'B Young', 'J Hus', 'Naira Marley',
    'Burna Boy', 'Jorja Smith', 'Ruger', 'Stormzy', 'AREA BOYZ',
    'Tems', 'T MULLA', 'Hardy Caprio', 'Abra Cadabra', 'Tion Wayne',
    'Koffee', 'RAYE', 'WSTRN', 'Koomz', 'KiDi', 'Adekunle Gold', 'WizKid',
    'Rema', 'Metro Boomin', 'Don Toliver', 'BEAM', 'Rotimi', 'Akon',
    'Musa Keys', 'Davido', 'Maleek Berry', 'CKay', 'Major Lazer', 'Nasty C',
    'Ice', 'Tyla', 'Afro B', 'Darassa', 'Khaligraph Jones', 'The FaNaTiX',
    'Idris Elba', 'Lil Tjay', 'FAVE', 'OMAHA LAY', 'Runtown', 'Fireboy DML',
    '21 Savage', 'Blxst', 'Lojay', 'Sarz', 'SAINT JHN', 'Ayra Starr',
    'Shallipopi', 'Amaarae', 'Kali Uchis', 'Joshua Baraka', 'JAE5',
    'WizTheMc', 'Zinoleesky', 'Dave', 'Bien', '1da Banton', 'Gunna'
];

// Populate artist dropdown
function populateArtistDropdown() {
    artistSelect.innerHTML = '<option value="">-- Select an artist --</option>';
    knownArtists.sort().forEach(artist => {
        const option = document.createElement('option');
        option.value = artist;
        option.textContent = artist;
        artistSelect.appendChild(option);
    });
}

// Extract artist from filename (Auto mode)
function extractArtistFromFilename(filename) {
    const nameWithoutExt = filename.replace(/\.[^/.]+$/, '');
    const sortedArtists = [...knownArtists].sort((a, b) => b.length - a.length);
    
    for (const artist of sortedArtists) {
        if (nameWithoutExt.toLowerCase().endsWith(artist.toLowerCase())) {
            const title = nameWithoutExt.slice(0, -artist.length).trim();
            return { artist, title: title || nameWithoutExt };
        }
    }
    return { artist: '', title: nameWithoutExt };
}

// Check if artist exists in database
async function checkArtistExists(artistName) {
    if (!artistName) return false;
    try {
        const response = await fetch(`${API_URL}/artists/search/${encodeURIComponent(artistName)}`);
        const artists = await response.json();
        return artists.some(a => a.name.toLowerCase() === artistName.toLowerCase());
    } catch (error) {
        return false;
    }
}

// Create artist in database
async function createArtistInDB(artistName) {
    const formData = new FormData();
    formData.append('name', artistName);
    formData.append('genre', '');
    formData.append('bio', 'Auto-created from bulk upload');
    
    try {
        const response = await fetch(`${API_URL}/artists`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` },
            body: formData
        });
        const data = await response.json();
        return data.artist || data.message;
    } catch (error) {
        return null;
    }
}

// Mode switching
autoModeBtn.addEventListener('click', () => {
    currentMode = 'auto';
    autoModeBtn.classList.add('active');
    specificModeBtn.classList.remove('active');
    specificArtistPanel.style.display = 'none';
    reviewPanel.style.display = 'none';
    fileInput.value = '';
    filesData = [];
    showToast('Switched to Auto-Detect mode - Artist extracted from filename');
});

specificModeBtn.addEventListener('click', () => {
    currentMode = 'specific';
    specificModeBtn.classList.add('active');
    autoModeBtn.classList.remove('active');
    specificArtistPanel.style.display = 'block';
    reviewPanel.style.display = 'none';
    fileInput.value = '';
    filesData = [];
    showToast('Switched to Specific Artist mode - All songs go to one artist');
});

function showToast(message) {
    const toast = document.createElement('div');
    toast.textContent = message;
    toast.style.position = 'fixed';
    toast.style.bottom = '30px';
    toast.style.left = '50%';
    toast.style.transform = 'translateX(-50%)';
    toast.style.background = '#1DB954';
    toast.style.color = 'black';
    toast.style.padding = '12px 24px';
    toast.style.borderRadius = '30px';
    toast.style.fontWeight = 'bold';
    toast.style.zIndex = '2000';
    toast.style.animation = 'fadeInOut 2s ease';
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 2000);
}

// Review button
reviewBtn.addEventListener('click', async () => {
    const files = fileInput.files;
    if (files.length === 0) {
        alert('Please select MP3 files first');
        return;
    }
    
    // For specific mode, validate artist selection
    if (currentMode === 'specific') {
        selectedSpecificArtist = artistSelect.value;
        if (!selectedSpecificArtist) {
            alert('Please select an artist first');
            return;
        }
        
        // Check if selected artist exists in database
        const artistExists = await checkArtistExists(selectedSpecificArtist);
        if (!artistExists) {
            const createArtist = confirm(`Artist "${selectedSpecificArtist}" not found. Create it now?`);
            if (createArtist) {
                await createArtistInDB(selectedSpecificArtist);
                showToast(`✅ Artist "${selectedSpecificArtist}" created!`);
            } else {
                alert('Please select an existing artist or create one.');
                return;
            }
        }
    }
    
    filesData = [];
    
    for (let i = 0; i < files.length; i++) {
        const file = files[i];
        
        if (currentMode === 'specific') {
            // SPECIFIC MODE: ALL songs get the selected artist
            const title = file.name.replace(/\.[^/.]+$/, '');
            filesData.push({
                file: file,
                title: title,
                artist: selectedSpecificArtist,
                artistExists: true,
                ready: true
            });
        } else {
            // AUTO MODE: Extract from filename
            const { artist, title } = extractArtistFromFilename(file.name);
            let artistExists = false;
            if (artist) {
                artistExists = await checkArtistExists(artist);
            }
            filesData.push({
                file: file,
                title: title,
                artist: artist,
                artistExists: artistExists,
                ready: artist ? artistExists : false
            });
        }
    }
    
    displayFileList();
    
    if (currentMode === 'specific') {
        reviewTitle.innerHTML = `📋 Review & Upload (All ${filesData.length} songs → ${selectedSpecificArtist})`;
    } else {
        reviewTitle.innerHTML = '📋 Review & Upload (Auto-Detected Artists)';
    }
    
    reviewPanel.style.display = 'block';
    resultsPanel.style.display = 'none';
    progressDiv.innerHTML = '';
});

function displayFileList() {
    let html = `<thead><tr><th>#</th><th>Song Title</th><th>Artist</th><th>Status</th>${currentMode === 'auto' ? '<th>Action</th>' : ''}</tr></thead><tbody>`;
    
    for (let i = 0; i < filesData.length; i++) {
        const item = filesData[i];
        const modeBadge = currentMode === 'specific' 
            ? '<span class="badge badge-specific">Specific</span>' 
            : '<span class="badge badge-auto">Auto</span>';
        
        if (currentMode === 'specific') {
            // Specific mode: all ready, no actions needed
            html += `<tr>
                <td>${i+1} ${modeBadge}</td>
                <td><strong>${escapeHtml(item.title)}</strong></td>
                <td>${escapeHtml(item.artist)}</td>
                <td class="status-success">✅ Ready to upload</td>
            </tr>`;
        } else {
            // Auto mode: may need artist creation
            if (item.artist && item.artistExists) {
                html += `<tr id="row_${i}">
                    <td>${i+1} ${modeBadge}</td>
                    <td><strong>${escapeHtml(item.title)}</strong></td>
                    <td>${escapeHtml(item.artist)}</td>
                    <td id="status_${i}" class="status-success">✅ Ready</td>
                    <td>-</td>
                </tr>`;
            } else if (item.artist && !item.artistExists) {
                html += `<tr id="row_${i}">
                    <td>${i+1} ${modeBadge}</td>
                    <td><strong>${escapeHtml(item.title)}</strong></td>
                    <td>${escapeHtml(item.artist)}</td>
                    <td id="status_${i}" class="status-pending">⚠️ Artist not found</td>
                    <td><button onclick="createMissingArtist(${i})" id="createBtn_${i}" class="create-btn">➕ Create Artist</button></td>
                </tr>`;
            } else {
                html += `<tr id="row_${i}">
                    <td>${i+1} ${modeBadge}</td>
                    <td><strong>${escapeHtml(item.title)}</strong></td>
                    <td><input type="text" id="artistInput_${i}" placeholder="Type artist name" class="artist-input" onchange="updateArtist(${i}, this.value)"></td>
                    <td id="status_${i}" class="status-pending">⚠️ Missing artist</td>
                    <td id="action_${i}">-</td>
                </tr>`;
            }
        }
    }
    html += '</tbody>';
    fileListDiv.innerHTML = html;
}

// Auto mode functions
window.updateArtist = async function(index, artistName) {
    const item = filesData[index];
    if (!item) return;
    item.artist = artistName.trim();
    item.artistExists = item.artist ? await checkArtistExists(item.artist) : false;
    
    const statusCell = document.getElementById(`status_${index}`);
    const actionCell = document.getElementById(`action_${index}`);
    
    if (!item.artist) {
        statusCell.innerHTML = '⚠️ Missing artist';
        statusCell.className = 'status-pending';
        actionCell.innerHTML = '-';
        item.ready = false;
    } else if (!item.artistExists) {
        statusCell.innerHTML = '⚠️ Artist not found';
        statusCell.className = 'status-pending';
        actionCell.innerHTML = `<button onclick="createMissingArtist(${index})" class="create-btn">➕ Create Artist</button>`;
        item.ready = false;
    } else {
        statusCell.innerHTML = '✅ Ready';
        statusCell.className = 'status-success';
        actionCell.innerHTML = '-';
        item.ready = true;
    }
};

window.createMissingArtist = async function(index) {
    const item = filesData[index];
    if (!item || !item.artist) return;
    
    const statusCell = document.getElementById(`status_${index}`);
    const createBtn = document.getElementById(`createBtn_${index}`);
    
    statusCell.innerHTML = '🔄 Creating...';
    statusCell.className = 'status-pending';
    if (createBtn) {
        createBtn.disabled = true;
        createBtn.textContent = '⏳...';
    }
    
    const result = await createArtistInDB(item.artist);
    
    if (result) {
        item.artistExists = true;
        item.ready = true;
        statusCell.innerHTML = '✅ Artist created! Ready';
        statusCell.className = 'status-success';
        if (createBtn) {
            createBtn.innerHTML = '✅ Created';
            createBtn.disabled = true;
        }
    } else {
        statusCell.innerHTML = '❌ Failed to create';
        statusCell.className = 'status-failed';
        if (createBtn) {
            createBtn.innerHTML = '⚠️ Retry';
            createBtn.disabled = false;
        }
        item.ready = false;
    }
};

function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/[&<>]/g, function(m) {
        if (m === '&') return '&amp;';
        if (m === '<') return '&lt;';
        if (m === '>') return '&gt;';
        return m;
    });
}

cancelBtn.addEventListener('click', () => {
    reviewPanel.style.display = 'none';
    fileInput.value = '';
    filesData = [];
});

uploadBtn.addEventListener('click', async () => {
    // Check ready files
    const readyFiles = filesData.filter(f => f.ready);
    if (readyFiles.length === 0) {
        alert('No files ready. Fill in missing artists or create them first.');
        return;
    }
    
    uploadBtn.disabled = true;
    uploadBtn.textContent = '⏳ Uploading...';
    
    let success = 0;
    let failed = 0;
    const failedDetails = [];
    
    for (let i = 0; i < filesData.length; i++) {
        const item = filesData[i];
        
        if (!item.ready) continue;
        
        const statusCell = document.getElementById(`status_${i}`);
        if (statusCell) {
            statusCell.innerHTML = '🔄 Uploading...';
            statusCell.className = 'status-pending';
        }
        
        const formData = new FormData();
        formData.append('title', item.title);
        formData.append('artist', item.artist);
        formData.append('audio', item.file);
        
        try {
            const response = await fetch(`${API_URL}/songs/admin/upload`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` },
                body: formData
            });
            const data = await response.json();
            
            if (data.song || data.message) {
                if (statusCell) {
                    statusCell.innerHTML = '✅ Uploaded!';
                    statusCell.className = 'status-success';
                }
                success++;
            } else {
                if (statusCell) {
                    statusCell.innerHTML = `❌ ${data.error || 'Failed'}`;
                    statusCell.className = 'status-failed';
                }
                failed++;
                failedDetails.push({ title: item.title, artist: item.artist, reason: data.error || 'Upload failed' });
            }
        } catch (error) {
            if (statusCell) {
                statusCell.innerHTML = '❌ Network error';
                statusCell.className = 'status-failed';
            }
            failed++;
            failedDetails.push({ title: item.title, artist: item.artist, reason: 'Network error' });
        }
        progressDiv.innerHTML = `Progress: ${success + failed}/${readyFiles.length} (✅ ${success} | ❌ ${failed})`;
    }
    
    let resultsHtml = `<div style="text-align:center; padding:20px;">
        <div style="font-size:48px;">${failed === 0 ? '🎉' : '📊'}</div>
        <div style="color:#1DB954; font-size:24px;">✅ ${success} Successful</div>`;
    if (failed > 0) {
        resultsHtml += `<div style="color:#e74c3c; font-size:24px;">❌ ${failed} Failed</div>`;
        resultsHtml += `<div style="margin-top:20px; text-align:left;"><h4>Failed:</h4><ul>`;
        for (const f of failedDetails) {
            resultsHtml += `<li><strong>${escapeHtml(f.title)}</strong> - ${escapeHtml(f.reason)}</li>`;
        }
        resultsHtml += `</ul></div>`;
    }
    resultsHtml += `<button id="returnToWaveBtn" style="margin-top:20px; background:#1DB954; color:black; padding:10px 24px; border:none; border-radius:24px; cursor:pointer;">🏠 Return to Wave</button></div>`;
    
    resultsDiv.innerHTML = resultsHtml;
    reviewPanel.style.display = 'none';
    resultsPanel.style.display = 'block';
    fileInput.value = '';
    
    document.getElementById('returnToWaveBtn')?.addEventListener('click', () => {
        window.location.href = 'http://localhost:5000';
    });
    
    uploadBtn.disabled = false;
    uploadBtn.textContent = '▶ Upload All';
});

doneBtn.addEventListener('click', () => {
    resultsPanel.style.display = 'none';
});

// Initialize
populateArtistDropdown();
console.log('Bulk upload ready. Mode:', currentMode);