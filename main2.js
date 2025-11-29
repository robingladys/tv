// Data aplikasi
const appState = {
    channels: [],
    favorites: JSON.parse(localStorage.getItem('iptvFavorites')) || [],
    currentChannel: null,
    categories: ['all'],
    savedPlaylists: JSON.parse(localStorage.getItem('iptvPlaylists')) || [],
    isFullscreen: false,
    currentServer: localStorage.getItem('currentServer') || '',
    hlsPlayer: null
};

// Server URLs
const SERVERS = {
    a: 'https://raw.githubusercontent.com/robingladys/tv/refs/heads/main/lokal.m3u',
    b: 'https://raw.githubusercontent.com/robingladys/tv/refs/heads/main/lokal_b.m3u',
    c: 'https://raw.githubusercontent.com/robingladys/tv/refs/heads/main/lokal_c.m3u'
};

// Default Favorites URL
const DEFAULT_FAVORITES_URL = 'https://raw.githubusercontent.com/robingladys/tv/refs/heads/main/favorite.json';

// Server Names
const SERVER_NAMES = {
    a: 'Server A (Lokal)',
    b: 'Server B (Lokal B)',
    c: 'Server C (Lokal C)'
};

// Channel yang membutuhkan HLS.js
const HLS_CHANNELS = [
    'Trans TV',
    'Trans 7',
    'GARUDA TV',
    'NusantaraTV',
    'INSPIRA TV',
    'Banten TV',
    'Dhamma TV',
    'Bandung TV',
    'Madu TV',
    'Balikpapan TV',
    'JAMBI TV',
    'ONE',
    'MYKIDS',
    'FIFA+ English',
    'Tennis Channel'
];

// DOM Elements
const sidebar = document.getElementById('sidebar');
const overlay = document.getElementById('overlay');
const toggleSidebar = document.getElementById('toggle-sidebar');
const closeSidebar = document.getElementById('close-sidebar');
const searchContainer = document.getElementById('search-container');
const searchToggle = document.getElementById('search-toggle');
const closeSearch = document.getElementById('close-search');
const searchInput = document.getElementById('search-input');
const categoryFilter = document.getElementById('category-filter');
const iptvUrl = document.getElementById('iptv-url');
const iptvFile = document.getElementById('iptv-file');
const serverSelect = document.getElementById('server-select');
const loadPlaylistBtn = document.getElementById('load-playlist');
const exportFavoritesBtn = document.getElementById('export-favorites');
const importFavoritesBtn = document.getElementById('import-favorites');
const loadDefaultFavoritesBtn = document.getElementById('load-default-favorites');
const importFileInput = document.getElementById('import-file');
const clearAllBtn = document.getElementById('clear-all');
const videoPlayer = document.getElementById('video-player');
const videoContainer = document.getElementById('video-container');
const currentChannelName = document.getElementById('current-channel-name');
const currentChannelCategory = document.getElementById('current-channel-category');
const currentChannelLogo = document.getElementById('current-channel-logo');
const favoriteBtn = document.getElementById('favorite-btn');
const fullscreenBtn = document.getElementById('fullscreen-btn');
const favoritesGrid = document.getElementById('favorites-grid');
const channelsList = document.getElementById('channels-list');
const channelsCount = document.getElementById('channels-count');
const fileName = document.getElementById('file-name');
const savedPlaylistsList = document.getElementById('saved-playlists-list');

// Buat elemen status server
const serverStatus = document.createElement('div');
serverStatus.className = 'server-status';
serverSelect.parentNode.appendChild(serverStatus);

// Event Listeners
document.addEventListener('DOMContentLoaded', initApp);

toggleSidebar.addEventListener('click', () => {
    sidebar.classList.add('active');
    overlay.classList.add('active');
});

closeSidebar.addEventListener('click', closeSidebarHandler);
overlay.addEventListener('click', closeSidebarHandler);

searchToggle.addEventListener('click', () => {
    searchContainer.classList.add('active');
});

closeSearch.addEventListener('click', () => {
    searchContainer.classList.remove('active');
    searchInput.value = '';
    filterChannels();
});

searchInput.addEventListener('input', filterChannels);
categoryFilter.addEventListener('change', filterChannels);

loadPlaylistBtn.addEventListener('click', loadPlaylist);
exportFavoritesBtn.addEventListener('click', exportFavorites);
importFavoritesBtn.addEventListener('click', () => importFileInput.click());
loadDefaultFavoritesBtn.addEventListener('click', loadDefaultFavorites);
importFileInput.addEventListener('change', importFavoritesFromFile);
clearAllBtn.addEventListener('click', clearAllData);

iptvFile.addEventListener('change', (e) => {
    if (e.target.files.length > 0) {
        fileName.textContent = e.target.files[0].name;
        // Reset server selection ketika file dipilih
        serverSelect.value = '';
        appState.currentServer = '';
        updateServerStatus();
    } else {
        fileName.textContent = '';
    }
});

// Event listener untuk server selection
serverSelect.addEventListener('change', function() {
    const selectedServer = this.value;
    
    if (selectedServer) {
        // Reset URL dan file ketika server dipilih
        iptvUrl.value = '';
        iptvFile.value = '';
        fileName.textContent = '';
        
        // Load server otomatis
        loadServer(selectedServer);
    } else {
        appState.currentServer = '';
        updateServerStatus();
    }
});

favoriteBtn.addEventListener('click', toggleFavorite);
fullscreenBtn.addEventListener('click', toggleFullscreen);

// Event listener untuk video errors
videoPlayer.addEventListener('error', function(e) {
    console.error('Video Error:', e);
    if (appState.currentChannel) {
        showNotification(`Error memutar ${appState.currentChannel.name}, mencoba metode lain...`, 'info');
        // Coba dengan HLS.js jika belum dicoba
        if (!HLS_CHANNELS.some(ch => appState.currentChannel.name.includes(ch))) {
            setTimeout(() => playWithHLSJS(appState.currentChannel), 1000);
        }
    }
});

videoPlayer.addEventListener('loadstart', function() {
    showNotification('Memuat stream...', 'info');
});

videoPlayer.addEventListener('canplay', function() {
    // Sembunyikan notifikasi loading ketika video siap diputar
    const notifications = document.querySelectorAll('.notification');
    notifications.forEach(notification => {
        if (notification.textContent.includes('Memuat stream')) {
            notification.remove();
        }
    });
});

// Fungsi untuk Export Favorit
function exportFavorites() {
    if (appState.favorites.length === 0) {
        showNotification('Tidak ada favorit untuk diexport', 'info');
        return;
    }
    
    const favoritesData = {
        version: '1.0',
        exportDate: new Date().toISOString(),
        totalFavorites: appState.favorites.length,
        favorites: appState.favorites
    };
    
    const dataStr = JSON.stringify(favoritesData, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `iptv-favorites-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    showNotification(`Berhasil export ${appState.favorites.length} favorit`, 'success');
}

// Fungsi untuk Import Favorit dari File
function importFavoritesFromFile(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const importedData = JSON.parse(e.target.result);
            
            // Validasi data
            if (!importedData.favorites || !Array.isArray(importedData.favorites)) {
                throw new Error('Format file tidak valid');
            }
            
            const confirmed = confirm(
                `Import ${importedData.favorites.length} channel favorit?\n\n` +
                'Aksi ini akan menambahkan channel ke favorit yang sudah ada.'
            );
            
            if (confirmed) {
                // Gabungkan favorit yang sudah ada dengan yang diimport
                const existingUrls = new Set(appState.favorites.map(fav => fav.url));
                let newFavoritesCount = 0;
                
                importedData.favorites.forEach(favorite => {
                    if (!existingUrls.has(favorite.url)) {
                        appState.favorites.push(favorite);
                        newFavoritesCount++;
                    }
                });
                
                // Simpan ke localStorage
                localStorage.setItem('iptvFavorites', JSON.stringify(appState.favorites));
                
                // Update tampilan
                updateFavoritesDisplay();
                updateFavoriteButton();
                
                showNotification(
                    `Berhasil import ${newFavoritesCount} favorit baru (${importedData.favorites.length - newFavoritesCount} duplikat)`,
                    'success'
                );
                
                // Reset file input
                event.target.value = '';
            }
        } catch (error) {
            console.error('Error importing favorites:', error);
            showNotification('Gagal import favorit: Format file tidak valid', 'info');
            event.target.value = '';
        }
    };
    reader.readAsText(file);
}

// Fungsi untuk Load Default Favorit
function loadDefaultFavorites() {
    const confirmed = confirm(
        'Load favorit default dari server?\n\n' +
        'Aksi ini akan menambahkan channel favorit default ke favorit yang sudah ada.'
    );
    
    if (!confirmed) return;
    
    showNotification('Memuat favorit default...', 'info');
    
    fetch(DEFAULT_FAVORITES_URL)
        .then(response => {
            if (!response.ok) throw new Error('Gagal memuat favorit default');
            return response.json();
        })
        .then(data => {
            // Validasi data
            if (!data.favorites || !Array.isArray(data.favorites)) {
                throw new Error('Format favorit default tidak valid');
            }
            
            // Gabungkan favorit yang sudah ada dengan favorit default
            const existingUrls = new Set(appState.favorites.map(fav => fav.url));
            let newFavoritesCount = 0;
            
            data.favorites.forEach(favorite => {
                if (!existingUrls.has(favorite.url)) {
                    appState.favorites.push(favorite);
                    newFavoritesCount++;
                }
            });
            
            // Simpan ke localStorage
            localStorage.setItem('iptvFavorites', JSON.stringify(appState.favorites));
            
            // Update tampilan
            updateFavoritesDisplay();
            updateFavoriteButton();
            
            showNotification(
                `Berhasil menambahkan ${newFavoritesCount} favorit default (${data.favorites.length - newFavoritesCount} duplikat)`,
                'success'
            );
        })
        .catch(error => {
            console.error('Error loading default favorites:', error);
            showNotification('Gagal memuat favorit default: ' + error.message, 'info');
        });
}

// Fungsi untuk memuat server
function loadServer(serverId) {
    if (!SERVERS[serverId]) {
        showNotification('Server tidak valid', 'info');
        return;
    }
    
    appState.currentServer = serverId;
    localStorage.setItem('currentServer', serverId);
    
    const serverUrl = SERVERS[serverId];
    const serverName = SERVER_NAMES[serverId];
    
    // Update status server
    updateServerStatus('loading', `Memuat ${serverName}...`);
    
    // Load playlist dari server
    loadPlaylistFromUrl(serverUrl, serverName);
}

// Fungsi untuk update status server
function updateServerStatus(status = '', message = '') {
    serverStatus.textContent = message;
    serverStatus.className = 'server-status';
    
    if (status) {
        serverStatus.classList.add('active', status);
    }
    
    if (appState.currentServer) {
        const serverName = SERVER_NAMES[appState.currentServer];
        serverSelect.querySelector(`option[value="${appState.currentServer}"]`).textContent = 
            `${serverName} ✓`;
    }
}

// Fungsi untuk memutar channel
function playChannel(channel) {
    // Hentikan player sebelumnya
    stopCurrentPlayer();
    
    appState.currentChannel = channel;
    
    // Update UI terlebih dahulu
    updateChannelInfo(channel);
    updateFavoriteButton();
    
    // Cek apakah channel ini membutuhkan HLS.js
    const needsHLS = HLS_CHANNELS.some(ch => channel.name.includes(ch));
    
    if (needsHLS) {
        playWithHLSJS(channel);
    } else {
        playWithNativePlayer(channel);
    }
}

// Fungsi untuk stop player saat ini
function stopCurrentPlayer() {
    // Hentikan HLS player jika ada
    if (appState.hlsPlayer) {
        appState.hlsPlayer.stopLoad();
        appState.hlsPlayer.detachMedia();
        appState.hlsPlayer = null;
    }
    
    // Hentikan native video
    videoPlayer.pause();
    videoPlayer.src = '';
    videoPlayer.load();
}

// Fungsi untuk memutar dengan native HTML5 video
function playWithNativePlayer(channel) {
    showNotification(`Memuat ${channel.name}...`, 'info');
    
    videoPlayer.src = channel.url;
    videoPlayer.load();
    
    const playPromise = videoPlayer.play();
    
    if (playPromise !== undefined) {
        playPromise.catch(e => {
            console.log('Autoplay prevented:', e);
            showNotification('Klik tombol play untuk memulai video', 'info');
        });
    }
}

// Fungsi khusus untuk memutar dengan HLS.js
function playWithHLSJS(channel) {
    showNotification(`Memuat ${channel.name} dengan HLS...`, 'info');
    
    // Load HLS.js library jika belum dimuat
    loadHLSJS().then(() => {
        initializeHLSPlayer(channel);
    }).catch(error => {
        console.error('Failed to load HLS.js:', error);
        showNotification('Gagal memuat HLS.js, mencoba metode native...', 'info');
        playWithNativePlayer(channel);
    });
}

// Fungsi untuk load HLS.js library
function loadHLSJS() {
    return new Promise((resolve, reject) => {
        if (typeof Hls !== 'undefined') {
            resolve();
            return;
        }
        
        const script = document.createElement('script');
        script.src = 'https://cdn.jsdelivr.net/npm/hls.js@latest';
        script.onload = resolve;
        script.onerror = reject;
        document.head.appendChild(script);
    });
}

// Fungsi untuk initialize HLS player
function initializeHLSPlayer(channel) {
    if (!Hls.isSupported()) {
        showNotification('HLS tidak didukung browser, menggunakan metode native...', 'info');
        playWithNativePlayer(channel);
        return;
    }
    
    // Hapus HLS instance sebelumnya
    if (appState.hlsPlayer) {
        appState.hlsPlayer.destroy();
    }
    
    // Buat HLS instance baru
    const hls = new Hls({
        enableWorker: false,
        lowLatencyMode: true,
        backBufferLength: 90,
        debug: false,
        enableSoftwareAES: true,
        startLevel: -1,
        maxBufferLength: 30,
        maxMaxBufferLength: 60
    });
    
    appState.hlsPlayer = hls;
    
    // Attach media
    hls.attachMedia(videoPlayer);
    
    // Load source
    hls.loadSource(channel.url);
    
    // Event handlers
    hls.on(Hls.Events.MANIFEST_PARSED, function() {
        console.log('HLS Manifest parsed, starting playback...');
        videoPlayer.play().catch(e => {
            console.log('Autoplay prevented:', e);
            showNotification('Klik tombol play untuk memulai video', 'info');
        });
    });
    
    hls.on(Hls.Events.LEVEL_LOADED, function(event, data) {
        console.log('HLS Level loaded:', data);
    });
    
    hls.on(Hls.Events.ERROR, function(event, data) {
        console.error('HLS Error:', data);
        
        if (data.fatal) {
            switch (data.type) {
                case Hls.ErrorTypes.NETWORK_ERROR:
                    showNotification('Error jaringan, mencoba ulang...', 'info');
                    hls.startLoad();
                    break;
                case Hls.ErrorTypes.MEDIA_ERROR:
                    showNotification('Error media, mencoba recover...', 'info');
                    hls.recoverMediaError();
                    break;
                default:
                    showNotification('Error fatal, mencoba metode native...', 'info');
                    hls.destroy();
                    playWithNativePlayer(channel);
                    break;
            }
        }
    });
}

// Fungsi untuk update info channel
function updateChannelInfo(channel) {
    currentChannelName.textContent = channel.name;
    currentChannelCategory.textContent = channel.group;
    
    // Update logo
    currentChannelLogo.innerHTML = '';
    const logoElement = createLogoElement(channel.logo, channel.name, 'large');
    currentChannelLogo.appendChild(logoElement);
    
    // Update active channel in list
    const channelItems = channelsList.querySelectorAll('.channel-item');
    channelItems.forEach(item => item.classList.remove('active'));
    
    // Find and activate current channel
    Array.from(channelItems).find(item => {
        if (item.querySelector('.channel-name').textContent === channel.name) {
            item.classList.add('active');
            return true;
        }
        return false;
    });
}

// Fungsi untuk memutar video dalam fullscreen landscape
function toggleFullscreen() {
    if (!document.fullscreenElement) {
        enterFullscreen();
    } else {
        exitFullscreen();
    }
}

function enterFullscreen() {
    // Gunakan video container sebagai element fullscreen
    const element = videoContainer;
    
    // Request fullscreen
    if (element.requestFullscreen) {
        element.requestFullscreen();
    } else if (element.webkitRequestFullscreen) {
        element.webkitRequestFullscreen();
    } else if (element.msRequestFullscreen) {
        element.msRequestFullscreen();
    } else if (element.webkitEnterFullscreen) {
        element.webkitEnterFullscreen();
    }
    
    // Set fullscreen state
    appState.isFullscreen = true;
    document.body.classList.add('fullscreen');
    
    // Force landscape orientation dengan CSS transform
    setTimeout(() => {
        forceLandscapeOrientation();
    }, 100);
    
    // Auto play video
    setTimeout(() => {
        videoPlayer.play().catch(e => {
            console.log('Autoplay prevented in fullscreen:', e);
        });
    }, 500);
}

function exitFullscreen() {
    if (document.exitFullscreen) {
        document.exitFullscreen();
    } else if (document.webkitExitFullscreen) {
        document.webkitExitFullscreen();
    } else if (document.msExitFullscreen) {
        document.msExitFullscreen();
    } else if (videoPlayer.webkitExitFullscreen) {
        videoPlayer.webkitExitFullscreen();
    }
    
    // Reset fullscreen state
    appState.isFullscreen = false;
    document.body.classList.remove('fullscreen');
    
    // Reset orientation
    resetOrientation();
}

// Fungsi untuk memaksa landscape dengan CSS transform
function forceLandscapeOrientation() {
    const video = videoPlayer;
    
    if (window.innerHeight > window.innerWidth) {
        // Device dalam portrait mode, rotate ke landscape
        const angle = 90;
        const scale = window.innerHeight / window.innerWidth;
        
        video.style.transform = `rotate(${angle}deg) scale(${scale})`;
        video.style.transformOrigin = 'center center';
        video.style.width = '100vh';
        video.style.height = '100vw';
        video.style.position = 'fixed';
        video.style.top = '50%';
        video.style.left = '50%';
        video.style.marginTop = `-${window.innerWidth / 2}px`;
        video.style.marginLeft = `-${window.innerHeight / 2}px`;
        video.style.zIndex = '10000';
    } else {
        // Device sudah landscape, reset transform
        resetOrientation();
    }
}

// Fungsi untuk reset orientasi
function resetOrientation() {
    const video = videoPlayer;
    
    video.style.transform = '';
    video.style.transformOrigin = '';
    video.style.width = '';
    video.style.height = '';
    video.style.position = '';
    video.style.top = '';
    video.style.left = '';
    video.style.marginTop = '';
    video.style.marginLeft = '';
    video.style.zIndex = '';
}

// Event listener untuk resize (saat orientasi berubah)
window.addEventListener('resize', function() {
    if (appState.isFullscreen) {
        setTimeout(() => {
            if (window.innerHeight > window.innerWidth) {
                // Masih portrait, maintain landscape force
                forceLandscapeOrientation();
            } else {
                // Sudah landscape, reset transform
                resetOrientation();
            }
        }, 100);
    }
});

// Event listener untuk perubahan fullscreen
document.addEventListener('fullscreenchange', handleFullscreenChange);
document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
document.addEventListener('msfullscreenchange', handleFullscreenChange);

function handleFullscreenChange() {
    setTimeout(() => {
        if (!document.fullscreenElement && 
            !document.webkitFullscreenElement && 
            !document.msFullscreenElement) {
            // Keluar dari fullscreen
            appState.isFullscreen = false;
            document.body.classList.remove('fullscreen');
            resetOrientation();
        } else {
            // Masuk fullscreen
            appState.isFullscreen = true;
            document.body.classList.add('fullscreen');
            
            // Force landscape setelah fullscreen aktif
            setTimeout(() => {
                forceLandscapeOrientation();
            }, 200);
        }
    }, 100);
}

// Event listener untuk touch events (swipe untuk keluar fullscreen)
let touchStartY = 0;
let touchEndY = 0;

document.addEventListener('touchstart', function(e) {
    if (appState.isFullscreen) {
        touchStartY = e.changedTouches[0].screenY;
    }
});

document.addEventListener('touchend', function(e) {
    if (appState.isFullscreen) {
        touchEndY = e.changedTouches[0].screenY;
        
        // Swipe down untuk keluar fullscreen (hanya di mobile)
        if (touchStartY - touchEndY > 100 && window.innerHeight > window.innerWidth) {
            exitFullscreen();
        }
    }
});

// Event listener untuk key events (ESC untuk keluar fullscreen)
document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape' && appState.isFullscreen) {
        exitFullscreen();
    }
});

// Fungsi untuk menghapus semua data
function clearAllData() {
    const confirmation = confirm(
        '⚠️ HAPUS SEMUA DATA?\n\n' +
        'Aksi ini akan menghapus:\n' +
        '• Semua URL dan file yang diinput\n' +
        '• Semua channel favorit\n' +
        '• Semua playlist tersimpan\n' +
        '• Riwayat pemutaran\n' +
        '• Server yang dipilih\n\n' +
        'Data tidak dapat dikembalikan!'
    );
    
    if (confirmation) {
        // Hentikan player
        stopCurrentPlayer();
        
        // Hapus semua data dari localStorage
        localStorage.removeItem('iptvFavorites');
        localStorage.removeItem('iptvPlaylists');
        localStorage.removeItem('lastIptvUrl');
        localStorage.removeItem('lastIptvFileName');
        localStorage.removeItem('lastPlaylist');
        localStorage.removeItem('currentServer');
        
        // Reset state aplikasi
        appState.favorites = [];
        appState.savedPlaylists = [];
        appState.channels = [];
        appState.currentChannel = null;
        appState.categories = ['all'];
        appState.currentServer = '';
        
        // Reset form inputs
        iptvUrl.value = '';
        iptvFile.value = '';
        fileName.textContent = '';
        serverSelect.value = '';
        importFileInput.value = '';
        
        // Reset UI
        updateFavoritesDisplay();
        updateChannelsDisplay();
        updateSavedPlaylists();
        updateCategoryFilter();
        updateServerStatus();
        
        // Reset player
        videoPlayer.src = '';
        currentChannelName.textContent = 'Pilih channel untuk memulai';
        currentChannelCategory.textContent = '-';
        currentChannelLogo.innerHTML = '<i class="fas fa-tv"></i>';
        favoriteBtn.classList.remove('active');
        favoriteBtn.innerHTML = '<i class="far fa-heart"></i>';
        
        // Reset search dan filter
        searchInput.value = '';
        categoryFilter.innerHTML = '<option value="all">Semua Kategori</option>';
        
        // Reset server options text
        const serverOptions = serverSelect.querySelectorAll('option');
        serverOptions.forEach(option => {
            if (option.value) {
                const serverName = SERVER_NAMES[option.value];
                if (serverName) {
                    option.textContent = serverName;
                }
            }
        });
        
        // Tampilkan pesan sukses
        showNotification('Semua data berhasil dihapus!', 'success');
        
        // Tutup sidebar
        closeSidebarHandler();
    }
}

// Fungsi untuk menampilkan notifikasi
function showNotification(message, type = 'info') {
    // Hapus notifikasi sebelumnya
    const existingNotification = document.querySelector('.notification');
    if (existingNotification) {
        existingNotification.remove();
    }
    
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.innerHTML = `
        <div class="notification-content">
            <i class="fas fa-${type === 'success' ? 'check' : type === 'warning' ? 'exclamation-triangle' : 'info'}-circle"></i>
            <span>${message}</span>
        </div>
    `;
    
    // Tambahkan style untuk notifikasi
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: ${type === 'success' ? 'var(--success-color)' : type === 'warning' ? 'var(--warning-color)' : 'var(--primary-color)'};
        color: white;
        padding: 12px 20px;
        border-radius: 8px;
        box-shadow: var(--shadow);
        z-index: 10000;
        animation: slideIn 0.3s ease;
    `;
    
    document.body.appendChild(notification);
    
    // Hapus notifikasi setelah 3 detik
    setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => {
            if (notification.parentNode) {
                notification.remove();
            }
        }, 300);
    }, 3000);
}

// Tambahkan keyframe animations untuk notifikasi
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
    }
    @keyframes slideOut {
        from { transform: translateX(0); opacity: 1; }
        to { transform: translateX(100%); opacity: 0; }
    }
    
    /* Fullscreen landscape fixes */
    body.fullscreen {
        overflow: hidden !important;
        background: #000 !important;
    }
    
    body.fullscreen .header,
    body.fullscreen .favorites-container,
    body.fullscreen .channels-container,
    body.fullscreen .player-controls {
        display: none !important;
    }
    
    body.fullscreen .main-content {
        padding: 0 !important;
        margin: 0 !important;
        height: 100vh !important;
    }
    
    body.fullscreen .player-container {
        margin: 0 !important;
        height: 100vh !important;
        width: 100vw !important;
    }
    
    body.fullscreen .video-container {
        height: 100vh !important;
        width: 100vw !important;
        padding-bottom: 0 !important;
        border-radius: 0 !important;
        position: fixed !important;
        top: 0 !important;
        left: 0 !important;
        background: #000 !important;
    }
    
    body.fullscreen #video-player {
        width: 100vw !important;
        height: 100vh !important;
        object-fit: contain !important;
        background: #000 !important;
    }
    
    /* Hide fullscreen button ketika sudah fullscreen */
    body.fullscreen .fullscreen-btn {
        display: none !important;
    }
`;
document.head.appendChild(style);

// Fungsi Inisialisasi Aplikasi
function initApp() {
    updateFavoritesDisplay();
    updateCategoryFilter();
    updateSavedPlaylists();
    loadLastPlaylist();
    
    const savedUrl = localStorage.getItem('lastIptvUrl');
    if (savedUrl) {
        iptvUrl.value = savedUrl;
    }
    
    const savedFileName = localStorage.getItem('lastIptvFileName');
    if (savedFileName) {
        fileName.textContent = savedFileName;
    }
    
    // Load server yang dipilih sebelumnya
    if (appState.currentServer) {
        serverSelect.value = appState.currentServer;
        updateServerStatus('connected', `Terhubung ke ${SERVER_NAMES[appState.currentServer]}`);
    }
}

// Fungsi untuk memuat playlist terakhir
function loadLastPlaylist() {
    const lastPlaylist = localStorage.getItem('lastPlaylist');
    if (lastPlaylist) {
        try {
            const playlistData = JSON.parse(lastPlaylist);
            appState.channels = playlistData.channels || [];
            updateChannelsDisplay();
            updateCategoryFilter();
        } catch (e) {
            console.error('Error loading last playlist:', e);
        }
    }
}

// Fungsi untuk menutup sidebar
function closeSidebarHandler() {
    sidebar.classList.remove('active');
    overlay.classList.remove('active');
}

// Fungsi untuk memuat playlist
function loadPlaylist() {
    const url = iptvUrl.value.trim();
    const file = iptvFile.files[0];
    
    if (!url && !file && !appState.currentServer) {
        showNotification('Masukkan URL, pilih file, atau pilih server default', 'info');
        return;
    }
    
    // Jika ada URL atau file, reset server selection
    if (url || file) {
        serverSelect.value = '';
        appState.currentServer = '';
        updateServerStatus();
    }
    
    if (url) {
        localStorage.setItem('lastIptvUrl', url);
        savePlaylistToStorage('url', url);
        loadPlaylistFromUrl(url, 'URL Custom');
    } else if (file) {
        localStorage.setItem('lastIptvFileName', file.name);
        savePlaylistToStorage('file', file.name);
        loadPlaylistFromFile(file);
    } else if (appState.currentServer) {
        // Load server yang sedang aktif
        loadServer(appState.currentServer);
    }
}

// Fungsi untuk menyimpan playlist ke storage
function savePlaylistToStorage(type, value) {
    const playlist = {
        id: Date.now(),
        type: type,
        value: value,
        name: type === 'url' ? value.substring(0, 30) + '...' : value,
        date: new Date().toLocaleDateString('id-ID')
    };
    
    const existingIndex = appState.savedPlaylists.findIndex(p => 
        p.type === type && p.value === value
    );
    
    if (existingIndex === -1) {
        appState.savedPlaylists.unshift(playlist);
    } else {
        appState.savedPlaylists[existingIndex] = playlist;
    }
    
    appState.savedPlaylists = appState.savedPlaylists.slice(0, 5);
    localStorage.setItem('iptvPlaylists', JSON.stringify(appState.savedPlaylists));
    updateSavedPlaylists();
}

// Fungsi untuk memperbarui daftar playlist tersimpan
function updateSavedPlaylists() {
    savedPlaylistsList.innerHTML = '';
    
    if (appState.savedPlaylists.length === 0) {
        savedPlaylistsList.innerHTML = '<div style="text-align: center; color: rgba(255,255,255,0.5); font-style: italic; padding: 10px;">Tidak ada playlist tersimpan</div>';
        return;
    }
    
    appState.savedPlaylists.forEach(playlist => {
        const item = document.createElement('div');
        item.className = 'saved-item';
        
        item.innerHTML = `
            <div class="saved-item-info">
                <div class="saved-item-name">${playlist.name}</div>
                <div class="saved-item-type">${playlist.type.toUpperCase()} • ${playlist.date}</div>
            </div>
            <div class="saved-item-actions">
                <button class="btn btn-primary btn-small load-saved" data-id="${playlist.id}">
                    <i class="fas fa-play"></i>
                </button>
                <button class="btn btn-danger btn-small remove-saved" data-id="${playlist.id}">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        `;
        
        savedPlaylistsList.appendChild(item);
    });
    
    document.querySelectorAll('.load-saved').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const id = parseInt(e.target.closest('.load-saved').dataset.id);
            loadSavedPlaylist(id);
        });
    });
    
    document.querySelectorAll('.remove-saved').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const id = parseInt(e.target.closest('.remove-saved').dataset.id);
            removeSavedPlaylist(id);
        });
    });
}

// Fungsi untuk memuat playlist tersimpan
function loadSavedPlaylist(id) {
    const playlist = appState.savedPlaylists.find(p => p.id === id);
    if (!playlist) return;
    
    if (playlist.type === 'url') {
        iptvUrl.value = playlist.value;
        loadPlaylistFromUrl(playlist.value, 'Playlist Tersimpan');
    } else {
        fileName.textContent = playlist.value;
        showNotification(`Silakan pilih file: ${playlist.value}`, 'info');
    }
    
    // Reset server selection
    serverSelect.value = '';
    appState.currentServer = '';
    updateServerStatus();
    
    closeSidebarHandler();
}

// Fungsi untuk menghapus playlist tersimpan
function removeSavedPlaylist(id) {
    appState.savedPlaylists = appState.savedPlaylists.filter(p => p.id !== id);
    localStorage.setItem('iptvPlaylists', JSON.stringify(appState.savedPlaylists));
    updateSavedPlaylists();
    showNotification('Playlist berhasil dihapus', 'success');
}

// Fungsi untuk memuat playlist dari URL
function loadPlaylistFromUrl(url, sourceName = 'URL') {
    showLoadingState();
    
    fetch(url)
        .then(response => {
            if (!response.ok) throw new Error('Gagal memuat playlist');
            return response.text();
        })
        .then(parsePlaylist)
        .then(channels => {
            appState.channels = channels;
            updateChannelsDisplay();
            updateCategoryFilter();
            closeSidebarHandler();
            
            localStorage.setItem('lastPlaylist', JSON.stringify({ channels: channels }));
            
            // Update server status jika dari server
            if (appState.currentServer) {
                updateServerStatus('connected', `Terhubung ke ${SERVER_NAMES[appState.currentServer]}`);
            }
            
            showNotification(`Berhasil memuat ${channels.length} channel dari ${sourceName}`, 'success');
        })
        .catch(error => {
            console.error('Error:', error);
            
            // Update server status jika error
            if (appState.currentServer) {
                updateServerStatus('error', `Gagal memuat ${SERVER_NAMES[appState.currentServer]}`);
            }
            
            showNotification('Gagal memuat playlist: ' + error.message, 'info');
        });
}

// Fungsi untuk memuat playlist dari file
function loadPlaylistFromFile(file) {
    showLoadingState();
    
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const channels = parsePlaylist(e.target.result);
            appState.channels = channels;
            updateChannelsDisplay();
            updateCategoryFilter();
            closeSidebarHandler();
            
            localStorage.setItem('lastPlaylist', JSON.stringify({ channels: channels }));
            showNotification(`Berhasil memuat ${channels.length} channel dari file`, 'success');
        } catch (error) {
            console.error('Error:', error);
            showNotification('Gagal memuat playlist: ' + error.message, 'info');
        }
    };
    reader.readAsText(file);
}

// Fungsi untuk parsing playlist M3U
function parsePlaylist(content) {
    const lines = content.split('\n');
    const channels = [];
    let currentChannel = {};
    
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        
        if (line.startsWith('#EXTINF:')) {
            const info = parseExtinf(line);
            currentChannel = {
                name: info.name || 'Unknown Channel',
                logo: info.logo || '',
                group: info.group || 'General',
                url: ''
            };
        } else if (line && !line.startsWith('#') && currentChannel.name) {
            currentChannel.url = line;
            channels.push(currentChannel);
            currentChannel = {};
        }
    }
    
    return channels;
}

// Fungsi untuk parsing line #EXTINF
function parseExtinf(line) {
    const result = {};
    
    const nameMatch = line.match(/,(.*)$/);
    if (nameMatch) {
        result.name = nameMatch[1].trim();
    }
    
    const logoMatch = line.match(/tvg-logo="([^"]*)"/);
    if (logoMatch) {
        result.logo = logoMatch[1];
    }
    
    const groupMatch = line.match(/group-title="([^"]*)"/);
    if (groupMatch) {
        result.group = groupMatch[1];
    }
    
    return result;
}

// Fungsi untuk membuat elemen logo
function createLogoElement(logoUrl, channelName, size = 'small') {
    const container = document.createElement('div');
    container.className = size === 'small' ? 'channel-logo-small' : 'channel-logo';
    
    if (logoUrl && isValidUrl(logoUrl)) {
        const img = document.createElement('img');
        img.src = logoUrl;
        img.alt = channelName;
        img.onerror = function() {
            this.style.display = 'none';
            const fallback = document.createElement('div');
            fallback.textContent = getChannelInitials(channelName);
            fallback.style.display = 'flex';
            fallback.style.alignItems = 'center';
            fallback.style.justifyContent = 'center';
            fallback.style.width = '100%';
            fallback.style.height = '100%';
            container.appendChild(fallback);
        };
        container.appendChild(img);
    } else {
        container.textContent = getChannelInitials(channelName);
    }
    
    return container;
}

// Fungsi untuk memeriksa URL valid
function isValidUrl(string) {
    try {
        new URL(string);
        return true;
    } catch (_) {
        return false;
    }
}

// Fungsi untuk menampilkan state loading
function showLoadingState() {
    channelsList.innerHTML = '<div class="no-channels">Memuat playlist...</div>';
    channelsCount.textContent = '0 channel';
}

// Fungsi untuk memperbarui tampilan channel
function updateChannelsDisplay() {
    if (appState.channels.length === 0) {
        channelsList.innerHTML = '<div class="no-channels">Tidak ada channel yang ditemukan</div>';
        channelsCount.textContent = '0 channel';
        return;
    }
    
    channelsList.innerHTML = '';
    channelsCount.textContent = `${appState.channels.length} channel`;
    
    appState.channels.forEach((channel, index) => {
        const channelItem = document.createElement('div');
        channelItem.className = 'channel-item';
        if (appState.currentChannel && appState.currentChannel.url === channel.url) {
            channelItem.classList.add('active');
        }
        
        const logoElement = createLogoElement(channel.logo, channel.name, 'small');
        channelItem.appendChild(logoElement);
        
        const detailsDiv = document.createElement('div');
        detailsDiv.className = 'channel-details-small';
        detailsDiv.innerHTML = `
            <div class="channel-name">${channel.name}</div>
            <div class="channel-category">${channel.group}</div>
        `;
        
        channelItem.appendChild(detailsDiv);
        channelItem.addEventListener('click', () => playChannel(channel));
        
        channelsList.appendChild(channelItem);
    });
}

// Fungsi untuk memperbarui filter kategori
function updateCategoryFilter() {
    appState.categories = ['all'];
    
    appState.channels.forEach(channel => {
        if (channel.group && !appState.categories.includes(channel.group)) {
            appState.categories.push(channel.group);
        }
    });
    
    categoryFilter.innerHTML = '<option value="all">Semua Kategori</option>';
    appState.categories.forEach(category => {
        if (category !== 'all') {
            const option = document.createElement('option');
            option.value = category;
            option.textContent = category;
            categoryFilter.appendChild(option);
        }
    });
}

// Fungsi untuk memfilter channel berdasarkan pencarian dan kategori
function filterChannels() {
    const searchTerm = searchInput.value.toLowerCase();
    const selectedCategory = categoryFilter.value;
    
    const channelItems = channelsList.querySelectorAll('.channel-item');
    let visibleCount = 0;
    
    channelItems.forEach(item => {
        const channelName = item.querySelector('.channel-name').textContent.toLowerCase();
        const channelCategory = item.querySelector('.channel-category').textContent;
        
        const matchesSearch = channelName.includes(searchTerm);
        const matchesCategory = selectedCategory === 'all' || channelCategory === selectedCategory;
        
        if (matchesSearch && matchesCategory) {
            item.style.display = 'flex';
            visibleCount++;
        } else {
            item.style.display = 'none';
        }
    });
    
    if (visibleCount === 0 && appState.channels.length > 0) {
        channelsCount.textContent = '0 channel (difilter)';
    } else if (visibleCount !== appState.channels.length) {
        channelsCount.textContent = `${visibleCount} channel (difilter)`;
    } else {
        channelsCount.textContent = `${appState.channels.length} channel`;
    }
}

// Fungsi untuk toggle favorite
function toggleFavorite() {
    if (!appState.currentChannel) return;
    
    const channelIndex = appState.favorites.findIndex(
        fav => fav.url === appState.currentChannel.url
    );
    
    if (channelIndex === -1) {
        appState.favorites.push(appState.currentChannel);
        favoriteBtn.classList.add('active');
        favoriteBtn.innerHTML = '<i class="fas fa-heart"></i>';
        showNotification('Ditambahkan ke favorit', 'success');
    } else {
        appState.favorites.splice(channelIndex, 1);
        favoriteBtn.classList.remove('active');
        favoriteBtn.innerHTML = '<i class="far fa-heart"></i>';
        showNotification('Dihapus dari favorit', 'info');
    }
    
    localStorage.setItem('iptvFavorites', JSON.stringify(appState.favorites));
    updateFavoritesDisplay();
}

// Fungsi untuk memperbarui tampilan favorit
function updateFavoritesDisplay() {
    if (appState.favorites.length === 0) {
        favoritesGrid.innerHTML = '<div class="no-favorites">Belum ada channel favorit</div>';
        return;
    }
    
    favoritesGrid.innerHTML = '';
    
    appState.favorites.forEach(channel => {
        const favoriteItem = document.createElement('div');
        favoriteItem.className = 'favorite-item';
        
        const logoElement = createLogoElement(channel.logo, channel.name, 'small');
        logoElement.className = 'favorite-logo';
        favoriteItem.appendChild(logoElement);
        
        const nameDiv = document.createElement('div');
        nameDiv.className = 'favorite-name';
        nameDiv.textContent = channel.name;
        favoriteItem.appendChild(nameDiv);
        
        favoriteItem.addEventListener('click', () => playChannel(channel));
        
        favoritesGrid.appendChild(favoriteItem);
    });
}

// Fungsi untuk memperbarui tombol favorit
function updateFavoriteButton() {
    if (!appState.currentChannel) {
        favoriteBtn.classList.remove('active');
        favoriteBtn.innerHTML = '<i class="far fa-heart"></i>';
        return;
    }
    
    const isFavorite = appState.favorites.some(
        fav => fav.url === appState.currentChannel.url
    );
    
    if (isFavorite) {
        favoriteBtn.classList.add('active');
        favoriteBtn.innerHTML = '<i class="fas fa-heart"></i>';
    } else {
        favoriteBtn.classList.remove('active');
        favoriteBtn.innerHTML = '<i class="far fa-heart"></i>';
    }
}

// Fungsi untuk mendapatkan inisial channel
function getChannelInitials(name) {
    return name
        .split(' ')
        .map(word => word.charAt(0))
        .join('')
        .toUpperCase()
        .substring(0, 2);
}