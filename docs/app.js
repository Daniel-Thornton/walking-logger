// Global variables
let walkData = [];
let distanceChart = null;
let timeDistanceChart = null;
let movingAveragesChart = null;
let paceTrendsChart = null;
let currentMovingAverageView = 'distance';
let currentLeaderboardView = 'distance';
let isAuthenticated = false;
let currentUser = null;
let syncQueue = [];
let isOnline = navigator.onLine;

// API Configuration
const API_BASE_URL = 'https://walking-logger-production.up.railway.app';
const LOCAL_STORAGE_KEY = 'walkingLoggerData';
const AUTH_TOKEN_KEY = 'walkingLoggerToken';

// DOM elements
const walkForm = document.getElementById('walkForm');
const dateInput = document.getElementById('date');
const distanceInput = document.getElementById('distance');
const timeElapsedInput = document.getElementById('timeElapsed');
const exportBtn = document.getElementById('exportBtn');
const importBtn = document.getElementById('importBtn');
const csvFileInput = document.getElementById('csvFileInput');
const toast = document.getElementById('toast');
const toastMessage = document.getElementById('toastMessage');
const loadingSpinner = document.getElementById('loadingSpinner');

// Authentication elements
const authModal = document.getElementById('authModal');
const authForm = document.getElementById('authForm');
const authTitle = document.getElementById('authTitle');
const loginBtn = document.getElementById('loginBtn');
const logoutBtn = document.getElementById('logoutBtn');
const loginSubmitBtn = document.getElementById('loginSubmitBtn');
const registerBtn = document.getElementById('registerBtn');
const showRegister = document.getElementById('showRegister');
const showLogin = document.getElementById('showLogin');
const closeAuthModal = document.getElementById('closeAuthModal');

// Sync elements
const syncStatus = document.getElementById('syncStatus');
const syncText = document.getElementById('syncText');
const syncSpinner = document.getElementById('syncSpinner');

// Tab elements
const tabBtns = document.querySelectorAll('.tab-btn');
const tabContents = document.querySelectorAll('.tab-content');

// Statistics elements
const totalWalksEl = document.getElementById('totalWalks');
const totalDistanceEl = document.getElementById('totalDistance');
const currentStreakEl = document.getElementById('currentStreak');
const longestStreakEl = document.getElementById('longestStreak');
const weekComparisonEl = document.getElementById('weekComparison');

// Recent walks element
const recentWalksEl = document.getElementById('recentWalks');

// Leaderboard element
const leaderboardEl = document.getElementById('leaderboard');

// Initialize the app
document.addEventListener('DOMContentLoaded', async () => {
    // Set today's date as default
    dateInput.value = new Date().toISOString().split('T')[0];
    
    // Check authentication status
    await checkAuthStatus();
    
    // Load existing data
    await loadWalkData();
    
    // Set up event listeners
    setupEventListeners();
    
    // Set up tab functionality
    setupTabs();
    
    // Initialize charts
    initializeCharts();
    
    // Set up online/offline detection
    setupNetworkDetection();
    
    // Update sync status
    updateSyncStatus();
    
    // Process any queued sync operations
    if (isAuthenticated && isOnline) {
        await processSyncQueue();
    }
});

// Check authentication status
async function checkAuthStatus() {
    const token = localStorage.getItem(AUTH_TOKEN_KEY);
    if (token) {
        try {
            const response = await fetch(`${API_BASE_URL}/api/auth/verify`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            
            if (response.ok) {
                const userData = await response.json();
                isAuthenticated = true;
                currentUser = userData.user;
                updateAuthUI();
            } else {
                localStorage.removeItem(AUTH_TOKEN_KEY);
            }
        } catch (error) {
            console.log('Auth check failed (offline?):', error);
            // Still consider authenticated if we have a token (offline mode)
            isAuthenticated = true;
            updateAuthUI();
        }
    }
}

// Update authentication UI
function updateAuthUI() {
    if (isAuthenticated) {
        loginBtn.style.display = 'none';
        logoutBtn.style.display = 'inline-flex';
        authModal.classList.remove('show');
    } else {
        loginBtn.style.display = 'inline-flex';
        logoutBtn.style.display = 'none';
    }
}

// Event listeners
function setupEventListeners() {
    walkForm.addEventListener('submit', handleFormSubmit);
    exportBtn.addEventListener('click', handleExport);
    importBtn.addEventListener('click', () => csvFileInput.click());
    csvFileInput.addEventListener('change', handleImport);
    
    // Authentication event listeners
    loginBtn.addEventListener('click', () => showAuthModal('login'));
    logoutBtn.addEventListener('click', handleLogout);
    authForm.addEventListener('submit', handleAuthSubmit);
    registerBtn.addEventListener('click', () => switchAuthMode('register'));
    showRegister.addEventListener('click', () => switchAuthMode('register'));
    showLogin.addEventListener('click', () => switchAuthMode('login'));
    closeAuthModal.addEventListener('click', () => authModal.classList.remove('show'));
    
    // Close modal when clicking outside
    authModal.addEventListener('click', (e) => {
        if (e.target === authModal) {
            authModal.classList.remove('show');
        }
    });
    
    // Add input animations
    const inputs = document.querySelectorAll('input, textarea');
    inputs.forEach(input => {
        input.addEventListener('focus', (e) => {
            e.target.parentElement.style.transform = 'scale(1.02)';
        });
        
        input.addEventListener('blur', (e) => {
            e.target.parentElement.style.transform = 'scale(1)';
        });
    });
}

// Show authentication modal
function showAuthModal(mode = 'login') {
    switchAuthMode(mode);
    authModal.classList.add('show');
}

// Switch between login and register modes
function switchAuthMode(mode) {
    if (mode === 'register') {
        authTitle.textContent = 'Create Account';
        loginSubmitBtn.textContent = 'Register';
        registerBtn.style.display = 'none';
        showRegister.parentElement.style.display = 'none';
        showLogin.parentElement.style.display = 'block';
    } else {
        authTitle.textContent = 'Login to Sync Data';
        loginSubmitBtn.textContent = 'Login';
        registerBtn.style.display = 'inline-flex';
        showRegister.parentElement.style.display = 'block';
        showLogin.parentElement.style.display = 'none';
    }
}

// Handle authentication form submission
async function handleAuthSubmit(e) {
    e.preventDefault();
    
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const isRegister = loginSubmitBtn.textContent === 'Register';
    
    showLoading(true);
    
    try {
        const endpoint = isRegister ? '/api/auth/register' : '/api/auth/login';
        const response = await fetch(`${API_BASE_URL}${endpoint}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ email, password })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            localStorage.setItem(AUTH_TOKEN_KEY, data.token);
            isAuthenticated = true;
            currentUser = data.user;
            updateAuthUI();
            
            showToast(isRegister ? 'Account created successfully!' : 'Logged in successfully!', 'success');
            
            // Sync local data to server
            await syncLocalDataToServer();
            
            // Load data from server
            await loadWalkData();
        } else {
            showToast(data.message || 'Authentication failed', 'error');
        }
    } catch (error) {
        showToast('Network error. Please try again.', 'error');
    }
    
    showLoading(false);
}

// Handle logout
async function handleLogout() {
    localStorage.removeItem(AUTH_TOKEN_KEY);
    isAuthenticated = false;
    currentUser = null;
    updateAuthUI();
    updateSyncStatus();
    showToast('Logged out successfully', 'success');
    
    // Clear server data and reload local data
    await loadWalkData();
}

// Network detection
function setupNetworkDetection() {
    window.addEventListener('online', () => {
        isOnline = true;
        updateSyncStatus();
        if (isAuthenticated) {
            processSyncQueue();
        }
    });
    
    window.addEventListener('offline', () => {
        isOnline = false;
        updateSyncStatus();
    });
}

// Update sync status display
function updateSyncStatus() {
    if (!isAuthenticated) {
        syncText.textContent = 'Login to sync across devices';
        syncStatus.className = 'sync-status';
    } else if (!isOnline) {
        syncText.textContent = 'Working offline - will sync when online';
        syncStatus.className = 'sync-status';
    } else {
        syncText.textContent = 'Synced across all devices';
        syncStatus.className = 'sync-status online';
    }
}

// Show sync spinner
function showSyncSpinner(show) {
    if (show) {
        syncSpinner.style.display = 'block';
        syncText.textContent = 'Syncing...';
        syncStatus.className = 'sync-status syncing';
    } else {
        syncSpinner.style.display = 'none';
        updateSyncStatus();
    }
}

// Tab functionality
function setupTabs() {
    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const tabName = btn.dataset.tab;
            switchTab(tabName);
        });
    });
}

function switchTab(tabName) {
    // Remove active class from all tabs and contents
    tabBtns.forEach(btn => btn.classList.remove('active'));
    tabContents.forEach(content => content.classList.remove('active'));
    
    // Add active class to clicked tab and corresponding content
    document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');
    document.getElementById(`${tabName}Tab`).classList.add('active');
    
    // Update charts when switching to visualizations tab
    if (tabName === 'visualizations') {
        setTimeout(() => {
            updateCharts();
        }, 100);
    }
    
    // Update leaderboard when switching to leaderboard tab
    if (tabName === 'leaderboard') {
        setTimeout(() => {
            updateLeaderboard();
        }, 100);
    }
}

// Handle form submission
async function handleFormSubmit(e) {
    e.preventDefault();
    
    showLoading(true);
    
    const formData = {
        date: dateInput.value,
        distance: parseFloat(distanceInput.value),
        timeElapsed: parseFloat(timeElapsedInput.value)
    };
    
    try {
        // Save locally first
        await saveWalkDataLocally(formData);
        
        // Try to sync to server if authenticated and online
        if (isAuthenticated && isOnline) {
            await saveWalkDataToServer(formData);
        } else if (isAuthenticated) {
            // Queue for later sync
            syncQueue.push({ action: 'create', data: formData });
            saveSyncQueue();
        }
        
        showToast('Walk logged successfully!', 'success');
        walkForm.reset();
        dateInput.value = new Date().toISOString().split('T')[0];
        
        // Reload data and update UI
        await loadWalkData();
        
    } catch (error) {
        showToast('Error saving walk data: ' + error.message, 'error');
    }
    
    showLoading(false);
}

// Save walk data locally
async function saveWalkDataLocally(walkData) {
    const existingData = JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEY) || '[]');
    existingData.push({
        ...walkData,
        id: Date.now().toString(), // Simple ID generation
        createdAt: new Date().toISOString()
    });
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(existingData));
}

// Save walk data to server
async function saveWalkDataToServer(walkData) {
    const token = localStorage.getItem(AUTH_TOKEN_KEY);
    if (!token) throw new Error('Not authenticated');
    
    showSyncSpinner(true);
    
    try {
        const response = await fetch(`${API_BASE_URL}/api/walks`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(walkData)
        });
        
        if (!response.ok) {
            throw new Error('Failed to save to server');
        }
        
        return await response.json();
    } finally {
        showSyncSpinner(false);
    }
}

// Load walk data
async function loadWalkData() {
    try {
        let data = [];
        
        if (isAuthenticated && isOnline) {
            // Try to load from server
            data = await loadWalkDataFromServer();
        } else {
            // Load from local storage
            data = JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEY) || '[]');
        }
        
        walkData = data;
        updateStatistics();
        updateRecentWalks();
        updateCharts();
        
    } catch (error) {
        console.error('Error loading walk data:', error);
        // Fallback to local data
        walkData = JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEY) || '[]');
        updateStatistics();
        updateRecentWalks();
        updateCharts();
    }
}

// Load walk data from server
async function loadWalkDataFromServer() {
    const token = localStorage.getItem(AUTH_TOKEN_KEY);
    if (!token) throw new Error('Not authenticated');
    
    showSyncSpinner(true);
    
    try {
        const response = await fetch(`${API_BASE_URL}/api/walks`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (!response.ok) {
            throw new Error('Failed to load from server');
        }
        
        const data = await response.json();
        
        // Update local storage with server data
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(data));
        
        return data;
    } finally {
        showSyncSpinner(false);
    }
}

// Sync local data to server
async function syncLocalDataToServer() {
    if (!isAuthenticated || !isOnline) return;
    
    const localData = JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEY) || '[]');
    if (localData.length === 0) return;
    
    showSyncSpinner(true);
    
    try {
        const token = localStorage.getItem(AUTH_TOKEN_KEY);
        const response = await fetch(`${API_BASE_URL}/api/walks/sync`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ walks: localData })
        });
        
        if (response.ok) {
            showToast('Local data synced to server', 'success');
        }
    } catch (error) {
        console.error('Sync failed:', error);
    } finally {
        showSyncSpinner(false);
    }
}

// Process sync queue
async function processSyncQueue() {
    if (syncQueue.length === 0) return;
    
    showSyncSpinner(true);
    
    try {
        for (const item of syncQueue) {
            if (item.action === 'create') {
                await saveWalkDataToServer(item.data);
            }
        }
        
        // Clear queue after successful sync
        syncQueue = [];
        saveSyncQueue();
        
        // Reload data from server
        await loadWalkData();
        
    } catch (error) {
        console.error('Sync queue processing failed:', error);
    } finally {
        showSyncSpinner(false);
    }
}

// Save sync queue to localStorage
function saveSyncQueue() {
    localStorage.setItem('walkingLoggerSyncQueue', JSON.stringify(syncQueue));
}

// Load sync queue from localStorage
function loadSyncQueue() {
    syncQueue = JSON.parse(localStorage.getItem('walkingLoggerSyncQueue') || '[]');
}

// Update statistics (same as original but adapted)
function updateStatistics() {
    const totalWalks = walkData.length;
    const totalDistance = walkData.reduce((sum, walk) => {
        const distance = parseFloat(walk.distance) || 0;
        return sum + distance;
    }, 0);
    
    // Calculate streaks
    const streaks = calculateStreaks();
    
    // Calculate weekly comparison
    const weeklyComparison = calculateWeeklyComparison();
    
    // Animate the numbers
    animateNumber(totalWalksEl, totalWalks);
    animateNumber(totalDistanceEl, parseFloat(totalDistance.toFixed(2)));
    
    // Update streak displays if elements exist
    if (currentStreakEl) {
        animateNumber(currentStreakEl, streaks.current);
    }
    if (longestStreakEl) {
        animateNumber(longestStreakEl, streaks.longest);
    }
    
    // Update weekly comparison if elements exist
    updateWeeklyComparison(weeklyComparison);
}

// Calculate current and longest streaks (same as original)
function calculateStreaks() {
    if (walkData.length === 0) {
        return { current: 0, longest: 0 };
    }
    
    // Get unique dates and sort them
    const uniqueDates = [...new Set(walkData.map(walk => walk.date))].sort();
    
    let currentStreak = 0;
    let longestStreak = 0;
    let tempStreak = 0;
    
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    const yesterdayStr = new Date(today.getTime() - 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    
    // Check if we have a walk today or yesterday to start current streak
    const hasWalkToday = uniqueDates.includes(todayStr);
    const hasWalkYesterday = uniqueDates.includes(yesterdayStr);
    
    if (!hasWalkToday && !hasWalkYesterday) {
        currentStreak = 0;
    } else {
        // Calculate current streak by going backwards from today
        let checkDate = hasWalkToday ? new Date(today) : new Date(today.getTime() - 24 * 60 * 60 * 1000);
        
        while (true) {
            const checkDateStr = checkDate.toISOString().split('T')[0];
            if (uniqueDates.includes(checkDateStr)) {
                currentStreak++;
                checkDate = new Date(checkDate.getTime() - 24 * 60 * 60 * 1000);
            } else {
                break;
            }
        }
    }
    
    // Calculate longest streak
    for (let i = 0; i < uniqueDates.length; i++) {
        if (i === 0) {
            tempStreak = 1;
        } else {
            const prevDate = new Date(uniqueDates[i - 1]);
            const currDate = new Date(uniqueDates[i]);
            const dayDiff = (currDate - prevDate) / (1000 * 60 * 60 * 24);
            
            if (dayDiff === 1) {
                tempStreak++;
            } else {
                longestStreak = Math.max(longestStreak, tempStreak);
                tempStreak = 1;
            }
        }
    }
    longestStreak = Math.max(longestStreak, tempStreak);
    
    return { current: currentStreak, longest: longestStreak };
}

// Calculate this week vs last week comparison (same as original)
function calculateWeeklyComparison() {
    const today = new Date();
    const startOfThisWeek = new Date(today);
    startOfThisWeek.setDate(today.getDate() - today.getDay());
    startOfThisWeek.setHours(0, 0, 0, 0);
    
    const startOfLastWeek = new Date(startOfThisWeek);
    startOfLastWeek.setDate(startOfThisWeek.getDate() - 7);
    
    const endOfLastWeek = new Date(startOfThisWeek);
    endOfLastWeek.setTime(endOfLastWeek.getTime() - 1);
    
    // Filter walks for this week and last week
    const thisWeekWalks = walkData.filter(walk => {
        const walkDate = new Date(walk.date);
        return walkDate >= startOfThisWeek && walkDate <= today;
    });
    
    const lastWeekWalks = walkData.filter(walk => {
        const walkDate = new Date(walk.date);
        return walkDate >= startOfLastWeek && walkDate <= endOfLastWeek;
    });
    
    // Calculate totals
    const thisWeekDistance = thisWeekWalks.reduce((sum, walk) => sum + (parseFloat(walk.distance) || 0), 0);
    const lastWeekDistance = lastWeekWalks.reduce((sum, walk) => sum + (parseFloat(walk.distance) || 0), 0);
    const thisWeekTime = thisWeekWalks.reduce((sum, walk) => sum + (parseFloat(walk.timeElapsed) || 0), 0);
    const lastWeekTime = lastWeekWalks.reduce((sum, walk) => sum + (parseFloat(walk.timeElapsed) || 0), 0);
    const thisWeekPace = thisWeekDistance > 0 ? thisWeekTime / thisWeekDistance : 0;
    const lastWeekPace = lastWeekDistance > 0 ? lastWeekTime / lastWeekDistance : 0;
    
    return {
        thisWeek: {
            walks: thisWeekWalks.length,
            distance: thisWeekDistance,
            time: thisWeekTime,
            pace: thisWeekPace
        },
        lastWeek: {
            walks: lastWeekWalks.length,
            distance: lastWeekDistance,
            time: lastWeekTime,
            pace: lastWeekPace
        }
    };
}

// Update weekly comparison display (same as original)
function updateWeeklyComparison(comparison) {
    if (!weekComparisonEl) return;
    
    const distanceChange = comparison.lastWeek.distance > 0 
        ? ((comparison.thisWeek.distance - comparison.lastWeek.distance) / comparison.lastWeek.distance * 100)
        : (comparison.thisWeek.distance > 0 ? 100 : 0);
    
    const walksChange = comparison.lastWeek.walks > 0
        ? ((comparison.thisWeek.walks - comparison.lastWeek.walks) / comparison.lastWeek.walks * 100)
        : (comparison.thisWeek.walks > 0 ? 100 : 0);
    
    const paceChange = comparison.lastWeek.pace > 0
        ? ((comparison.lastWeek.pace - comparison.thisWeek.pace) / comparison.lastWeek.pace * 100) // Lower pace is better
        : 0;
    
    weekComparisonEl.innerHTML = `
        <div class="week-comparison">
            <div class="week-column">
                <h4>This Week</h4>
                <div class="week-stat">${comparison.thisWeek.walks} walks</div>
                <div class="week-stat">${comparison.thisWeek.distance.toFixed(2)} distance</div>
                <div class="week-stat">${comparison.thisWeek.time.toFixed(0)} min</div>
                <div class="week-stat">${comparison.thisWeek.pace.toFixed(1)} pace</div>
            </div>
            <div class="week-column">
                <h4>Last Week</h4>
                <div class="week-stat">${comparison.lastWeek.walks} walks</div>
                <div class="week-stat">${comparison.lastWeek.distance.toFixed(2)} distance</div>
                <div class="week-stat">${comparison.lastWeek.time.toFixed(0)} min</div>
                <div class="week-stat">${comparison.lastWeek.pace.toFixed(1)} pace</div>
            </div>
            <div class="week-column">
                <h4>Change</h4>
                <div class="week-stat ${walksChange >= 0 ? 'positive' : 'negative'}">
                    ${walksChange >= 0 ? '↑' : '↓'} ${Math.abs(walksChange).toFixed(0)}%
                </div>
                <div class="week-stat ${distanceChange >= 0 ? 'positive' : 'negative'}">
                    ${distanceChange >= 0 ? '↑' : '↓'} ${Math.abs(distanceChange).toFixed(0)}%
                </div>
                <div class="week-stat ${paceChange >= 0 ? 'positive' : 'negative'}">
                    ${paceChange >= 0 ? '↑' : '↓'} ${Math.abs(paceChange).toFixed(0)}%
                </div>
            </div>
        </div>
    `;
}

// Animate number changes (same as original)
function animateNumber(element, targetValue) {
    const currentValue = parseFloat(element.textContent.replace(/,/g, '')) || 0;
    const increment = (targetValue - currentValue) / 20;
    let current = currentValue;
    
    const timer = setInterval(() => {
        current += increment;
        
        if ((increment > 0 && current >= targetValue) || (increment < 0 && current <= targetValue)) {
            current = targetValue;
            clearInterval(timer);
        }
        
        if (element.id === 'totalDistance') {
            element.textContent = current.toFixed(2);
        } else {
            element.textContent = Math.round(current);
        }
    }, 50);
}

// Update recent walks display (same as original)
function updateRecentWalks() {
    if (walkData.length === 0) {
        recentWalksEl.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">🚶‍♂️</div>
                <div class="empty-state-text">No walks logged yet</div>
                <div class="empty-state-subtext">Start by logging your first walk above!</div>
            </div>
        `;
        return;
    }
    
    // Sort by date (most recent first) and take last 10
    const recentWalks = [...walkData]
        .sort((a, b) => new Date(b.date) - new Date(a.date))
        .slice(0, 10);
    
    recentWalksEl.innerHTML = recentWalks.map(walk => {
        const distance = parseFloat(walk.distance) || 0;
        const timeElapsed = parseFloat(walk.timeElapsed) || 0;
        
        return `
            <div class="walk-item">
                <div class="walk-date">${formatDate(walk.date)}</div>
                <div class="walk-stats">
                    <div class="walk-stat">
                        <span>📏</span>
                        <span>${distance.toFixed(2)}</span>
                    </div>
                    <div class="walk-stat">
                        <span>⏱️</span>
                        <span>${timeElapsed} min</span>
                    </div>
                    <div class="walk-stat">
                        <span>🏃‍♂️</span>
                        <span>${calculatePace(timeElapsed, distance)} min/dist</span>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

// Initialize charts (adapted from original)
function initializeCharts() {
    const distanceCtx = document.getElementById('distanceChart').getContext('2d');
    const timeDistanceCtx = document.getElementById('timeDistanceChart').getContext('2d');
    const movingAveragesCtx = document.getElementById('movingAveragesChart').getContext('2d');
    const paceTrendsCtx = document.getElementById('paceTrendsChart').getContext('2d');
    
    // Distance over time chart
    distanceChart = new Chart(distanceCtx, {
        type: 'line',
        data: {
            labels: [],
            datasets: [{
                label: 'Distance',
                data: [],
                borderColor: '#667eea',
                backgroundColor: 'rgba(102, 126, 234, 0.1)',
                borderWidth: 3,
                fill: true,
                tension: 0.4,
                pointBackgroundColor: '#667eea',
                pointBorderColor: '#ffffff',
                pointBorderWidth: 1,
                pointRadius: 3,
                pointHoverRadius: 3.2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    grid: {
                        color: 'rgba(0, 0, 0, 0.1)'
                    }
                },
                x: {
                    grid: {
                        color: 'rgba(0, 0, 0, 0.1)'
                    }
                }
            },
            animation: {
                duration: 1000,
                easing: 'easeOutQuart'
            }
        }
    });
    
    // Time vs Distance scatter chart
    timeDistanceChart = new Chart(timeDistanceCtx, {
        type: 'scatter',
        data: {
            datasets: [{
                label: 'Walks',
                data: [],
                backgroundColor: 'rgba(0, 50, 216, 1)',
                borderColor: '#0f015eff',
                borderWidth: 1,
                pointRadius: 2.8,
                pointHoverRadius: 3.2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const dataPoint = context.raw;
                            const formattedDate = formatDate(dataPoint.date);
                            return [
                                `Date: ${formattedDate}`,
                                `Time: ${context.parsed.x} min`,
                                `Distance: ${context.parsed.y}`
                            ];
                        }
                    }
                }
            },
            scales: {
                x: {
                    title: {
                        display: true,
                        text: 'Time Elapsed (minutes)'
                    },
                    grid: {
                        color: 'rgba(0, 0, 0, 0.1)'
                    }
                },
                y: {
                    title: {
                        display: true,
                        text: 'Distance'
                    },
                    grid: {
                        color: 'rgba(0, 0, 0, 0.1)'
                    }
                }
            },
            animation: {
                duration: 1000,
                easing: 'easeOutQuart'
            }
        }
    });
    
    // Moving Averages Chart
    movingAveragesChart = new Chart(movingAveragesCtx, {
        type: 'line',
        data: {
            labels: [],
            datasets: [
                {
                    label: '7-day Average',
                    data: [],
                    borderColor: '#ff6b6b',
                    backgroundColor: 'rgba(255, 107, 107, 0.1)',
                    borderWidth: 2,
                    fill: false,
                    tension: 0.4,
                    pointRadius: 2
                },
                {
                    label: '14-day Average',
                    data: [],
                    borderColor: '#4ecdc4',
                    backgroundColor: 'rgba(78, 205, 196, 0.1)',
                    borderWidth: 2,
                    fill: false,
                    tension: 0.4,
                    pointRadius: 2
                },
                {
                    label: '30-day Average',
                    data: [],
                    borderColor: '#45b7d1',
                    backgroundColor: 'rgba(69, 183, 209, 0.1)',
                    borderWidth: 2,
                    fill: false,
                    tension: 0.4,
                    pointRadius: 2
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: true,
                    position: 'top',
                    labels: {
                        font: {
                            size: 10
                        }
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    grid: {
                        color: 'rgba(0, 0, 0, 0.1)'
                    }
                },
                x: {
                    grid: {
                        color: 'rgba(0, 0, 0, 0.1)'
                    }
                }
            },
            animation: {
                duration: 1000,
                easing: 'easeOutQuart'
            }
        }
    });
    
    // Pace Trends Chart
    paceTrendsChart = new Chart(paceTrendsCtx, {
        type: 'line',
        data: {
            labels: [],
            datasets: [{
                label: 'Pace (min/distance)',
                data: [],
                borderColor: '#96ceb4',
                backgroundColor: 'rgba(150, 206, 180, 0.1)',
                borderWidth: 3,
                fill: true,
                tension: 0.4,
                pointBackgroundColor: '#96ceb4',
                pointBorderColor: '#ffffff',
                pointBorderWidth: 1,
                pointRadius: 3,
                pointHoverRadius: 3.2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                }
            },
            scales: {
                y: {
                    beginAtZero: false,
                    grid: {
                        color: 'rgba(0, 0, 0, 0.1)'
                    },
                    title: {
                        display: true,
                        text: 'Pace (min/distance)'
                    }
                },
                x: {
                    grid: {
                        color: 'rgba(0, 0, 0, 0.1)'
                    }
                }
            },
            animation: {
                duration: 1000,
                easing: 'easeOutQuart'
            }
        }
    });
    
    // Set up chart toggle event listeners
    setupChartToggles();
    
    // Set up leaderboard toggle event listeners
    setupLeaderboardToggles();
}

// Set up chart toggle functionality
function setupChartToggles() {
    const chartToggles = document.querySelectorAll('.chart-toggle');
    chartToggles.forEach(toggle => {
        toggle.addEventListener('click', (e) => {
            // Remove active class from all toggles
            chartToggles.forEach(t => t.classList.remove('active'));
            // Add active class to clicked toggle
            e.target.classList.add('active');
            
            // Update current view and refresh moving averages chart
            currentMovingAverageView = e.target.dataset.chart;
            updateMovingAveragesChart();
        });
    });
}

// Set up leaderboard toggle functionality
function setupLeaderboardToggles() {
    const leaderboardToggles = document.querySelectorAll('.leaderboard-toggle');
    leaderboardToggles.forEach(toggle => {
        toggle.addEventListener('click', (e) => {
            // Remove active class from all toggles
            leaderboardToggles.forEach(t => t.classList.remove('active'));
            // Add active class to clicked toggle
            e.target.classList.add('active');
            
            // Update current view and refresh leaderboard
            currentLeaderboardView = e.target.dataset.leaderboard;
            updateLeaderboard();
        });
    });
}

// Update charts with current data
function updateCharts() {
    if (!distanceChart || !timeDistanceChart) return;
    
    // Consolidate data by date - add distances for same dates
    const consolidatedData = consolidateDataByDate(walkData);
    
    // Sort consolidated data by date
    const sortedData = [...consolidatedData].sort((a, b) => new Date(a.date) - new Date(b.date));
    
    // Update distance over time chart with consolidated data
    distanceChart.data.labels = sortedData.map(walk => formatDate(walk.date));
    distanceChart.data.datasets[0].data = sortedData.map(walk => walk.distance);
    distanceChart.update('active');
    
    // Update time vs distance chart (keep individual entries for scatter plot)
    timeDistanceChart.data.datasets[0].data = walkData.map(walk => ({
        x: walk.timeElapsed,
        y: walk.distance,
        date: walk.date // Add date information for tooltip
    }));
    timeDistanceChart.update('active');
    
    // Update new charts if they exist
    if (movingAveragesChart) {
        updateMovingAveragesChart();
    }
    
    if (paceTrendsChart) {
        updatePaceTrendsChart();
    }
}

// Calculate moving averages
function calculateMovingAverages(data, windowSize, metric = 'distance') {
    if (data.length < windowSize) return [];
    
    const result = [];
    for (let i = windowSize - 1; i < data.length; i++) {
        const window = data.slice(i - windowSize + 1, i + 1);
        let sum = 0;
        
        if (metric === 'distance') {
            sum = window.reduce((acc, walk) => acc + walk.distance, 0);
        } else if (metric === 'pace') {
            sum = window.reduce((acc, walk) => acc + (walk.timeElapsed / walk.distance), 0);
        }
        
        const average = sum / windowSize;
        result.push({
            date: data[i].date,
            value: average
        });
    }
    
    return result;
}

// Update moving averages chart
function updateMovingAveragesChart() {
    if (!movingAveragesChart || walkData.length === 0) return;
    
    // Consolidate data by date and sort
    const consolidatedData = consolidateDataByDate(walkData);
    const sortedData = [...consolidatedData].sort((a, b) => new Date(a.date) - new Date(b.date));
    
    // Calculate moving averages for different window sizes
    const ma7 = calculateMovingAverages(sortedData, 7, currentMovingAverageView);
    const ma14 = calculateMovingAverages(sortedData, 14, currentMovingAverageView);
    const ma30 = calculateMovingAverages(sortedData, 30, currentMovingAverageView);
    
    // Find the longest series to use for labels
    const longestSeries = ma30.length > 0 ? ma30 : (ma14.length > 0 ? ma14 : ma7);
    
    if (longestSeries.length === 0) return;
    
    // Update chart data
    movingAveragesChart.data.labels = longestSeries.map(point => formatDate(point.date));
    
    // Update 7-day average
    movingAveragesChart.data.datasets[0].data = ma7.map(point => point.value.toFixed(2));
    
    // Update 14-day average
    movingAveragesChart.data.datasets[1].data = ma14.map(point => point.value.toFixed(2));
    
    // Update 30-day average
    movingAveragesChart.data.datasets[2].data = ma30.map(point => point.value.toFixed(2));
    
    // Update y-axis title based on current view
    const yAxisTitle = currentMovingAverageView === 'distance' ? 'Distance' : 'Pace (min/distance)';
    movingAveragesChart.options.scales.y.title = {
        display: true,
        text: yAxisTitle
    };
    
    movingAveragesChart.update('active');
}

// Update pace trends chart
function updatePaceTrendsChart() {
    if (!paceTrendsChart || walkData.length === 0) return;
    
    // Sort individual walks by date (not consolidated, to show pace variations)
    const sortedWalks = [...walkData].sort((a, b) => new Date(a.date) - new Date(b.date));
    
    // Calculate pace for each walk
    const paceData = sortedWalks.map(walk => ({
        date: walk.date,
        pace: walk.timeElapsed / walk.distance
    }));
    
    // Update chart
    paceTrendsChart.data.labels = paceData.map(point => formatDate(point.date));
    paceTrendsChart.data.datasets[0].data = paceData.map(point => point.pace.toFixed(2));
    paceTrendsChart.update('active');
}

// Consolidate walk data by date, adding distances together
function consolidateDataByDate(data) {
    const consolidated = {};
    
    data.forEach(walk => {
        const date = walk.date;
        
        if (consolidated[date]) {
            // Add distance to existing date entry
            consolidated[date].distance += walk.distance;
            // For time, we'll take the total time (sum of all walks on that date)
            consolidated[date].timeElapsed += walk.timeElapsed;
        } else {
            // Create new entry for this date
            consolidated[date] = {
                date: date,
                distance: walk.distance,
                timeElapsed: walk.timeElapsed
            };
        }
    });
    
    // Convert back to array
    return Object.values(consolidated);
}

// Handle CSV export
async function handleExport() {
    showLoading(true);
    
    try {
        if (walkData.length === 0) {
            showToast('No data to export!', 'error');
            return;
        }
        
        // Create CSV content
        const csvHeader = 'Date,Distance,TimeElapsed\n';
        const csvRows = walkData.map(walk => 
            `${walk.date},${walk.distance},${walk.timeElapsed}`
        ).join('\n');
        const csvContent = csvHeader + csvRows;
        
        // Create and download file
        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `walking-data-${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
        
        showToast('Data exported successfully!', 'success');
    } catch (error) {
        showToast('Error exporting data: ' + error.message, 'error');
    }
    
    showLoading(false);
}

// Handle CSV import
async function handleImport(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    showLoading(true);
    
    try {
        const text = await file.text();
        const lines = text.split('\n').filter(line => line.trim() !== '');
        
        if (lines.length < 2) {
            showToast('Invalid CSV file format', 'error');
            return;
        }
        
        // Skip header and parse data
        const importedWalks = [];
        for (let i = 1; i < lines.length; i++) {
            const [date, distance, timeElapsed] = lines[i].split(',');
            if (date && distance && timeElapsed) {
                importedWalks.push({
                    date: date.trim(),
                    distance: parseFloat(distance.trim()),
                    timeElapsed: parseFloat(timeElapsed.trim()),
                    id: Date.now().toString() + i,
                    createdAt: new Date().toISOString()
                });
            }
        }
        
        if (importedWalks.length === 0) {
            showToast('No valid data found in CSV file', 'error');
            return;
        }
        
        // Merge with existing data (avoid duplicates by date)
        const existingData = JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEY) || '[]');
        const existingDates = new Set(existingData.map(walk => walk.date));
        
        const newWalks = importedWalks.filter(walk => !existingDates.has(walk.date));
        const mergedData = [...existingData, ...newWalks];
        
        // Save to local storage
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(mergedData));
        
        // Sync to server if authenticated
        if (isAuthenticated && isOnline) {
            for (const walk of newWalks) {
                await saveWalkDataToServer(walk);
            }
        } else if (isAuthenticated) {
            // Queue for later sync
            newWalks.forEach(walk => {
                syncQueue.push({ action: 'create', data: walk });
            });
            saveSyncQueue();
        }
        
        // Reload data
        await loadWalkData();
        
        showToast(`Imported ${newWalks.length} new walks successfully!`, 'success');
    } catch (error) {
        showToast('Error importing CSV: ' + error.message, 'error');
    }
    
    showLoading(false);
    
    // Reset file input
    event.target.value = '';
}

// Update leaderboard
function updateLeaderboard() {
    if (walkData.length === 0) {
        leaderboardEl.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">🏆</div>
                <div class="empty-state-text">No walks to rank yet</div>
                <div class="empty-state-subtext">Log some walks to see your leaderboards!</div>
            </div>
        `;
        return;
    }
    
    let topWalks;
    let valueLabel;
    
    if (currentLeaderboardView === 'distance') {
        // Sort by distance (highest first)
        topWalks = [...walkData]
            .sort((a, b) => b.distance - a.distance)
            .slice(0, 20);
        valueLabel = 'Distance';
    } else {
        // Sort by pace (lowest/fastest first - lower pace is better)
        topWalks = [...walkData]
            .sort((a, b) => (a.timeElapsed / a.distance) - (b.timeElapsed / b.distance))
            .slice(0, 20);
        valueLabel = 'Pace';
    }
    
    leaderboardEl.innerHTML = topWalks.map((walk, index) => {
        let rankClass = '';
        let medal = '';
        
        if (index === 0) {
            rankClass = 'gold';
            medal = '🥇';
        } else if (index === 1) {
            rankClass = 'silver';
            medal = '🥈';
        } else if (index === 2) {
            rankClass = 'bronze';
            medal = '🥉';
        }
        
        const displayValue = currentLeaderboardView === 'distance' 
            ? walk.distance.toFixed(2)
            : calculatePace(walk.timeElapsed, walk.distance);
        
        const detailsText = currentLeaderboardView === 'distance'
            ? `${walk.timeElapsed} min • ${calculatePace(walk.timeElapsed, walk.distance)} min/dist pace`
            : `${walk.distance.toFixed(2)} distance • ${walk.timeElapsed} min`;
        
        return `
            <div class="leaderboard-item ${rankClass}">
                <div class="leaderboard-rank">
                    <div class="rank-number">${index + 1}</div>
                    ${medal ? `<div class="rank-medal">${medal}</div>` : ''}
                </div>
                <div class="leaderboard-info">
                    <div class="leaderboard-date">${formatDate(walk.date)}</div>
                    <div class="leaderboard-details">
                        ${detailsText}
                    </div>
                </div>
                <div class="leaderboard-distance">${displayValue}${currentLeaderboardView === 'pace' ? ' min/dist' : ''}</div>
            </div>
        `;
    }).join('');
}

// Utility functions
function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });
}

function calculatePace(timeElapsed, distance) {
    if (distance === 0) return '0.0';
    const pace = timeElapsed / distance;
    return pace.toFixed(1);
}

function showToast(message, type = 'success') {
    toastMessage.textContent = message;
    toast.className = `toast ${type}`;
    toast.classList.add('show');
    
    setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}

function showLoading(show) {
    loadingSpinner.style.display = show ? 'flex' : 'none';
}

// Load sync queue on startup
loadSyncQueue();
