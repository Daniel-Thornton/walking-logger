// Returns a random integer between min and max (inclusive)
function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

// Global variables
let walkData = [];
let distanceChart = null;
let timeDistanceChart = null;
let movingAveragesChart = null;
let paceTrendsChart = null;
let cumulativeChart = null;
let currentMovingAverageView = 'distance';
let currentLeaderboardView = 'distance';
let isAuthenticated = false;
let currentUser = null;
let syncQueue = [];
let isOnline = navigator.onLine;
let yearlyGoal = 0;

// API Configuration
const API_BASE_URL = 'https://walking-logger-production.up.railway.app';
const LOCAL_STORAGE_KEY = 'walkingLoggerData';
const AUTH_TOKEN_KEY = 'walkingLoggerToken';
const GOAL_STORAGE_KEY = 'walkingLoggerGoal';

// DOM elements
const appTitleEl = document.querySelector('.app-title');
const characterIconEl = document.getElementById('characterIcon');
const welcomeMessageEl = document.getElementById('welcomeMessage')
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
const goalIconEl = document.getElementById('goalIcon');

// Banner streak counter element
const bannerCurrentStreakEl = document.getElementById('bannerCurrentStreak');
const bannerCurrentStreakIconEl = document.getElementById('bannerStreakIcon');

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
const totalDistanceBanEl = document.getElementById('totalDistanceBan');
const currentStreakEl = document.getElementById('currentStreak');
const longestStreakEl = document.getElementById('longestStreak');
const weekComparisonEl = document.getElementById('weekComparison');

// Recent walks element
const recentWalksEl = document.getElementById('recentWalks');

// Leaderboard element
const leaderboardEl = document.getElementById('leaderboard');

// Help Dialog Element
const helpDialog = document.querySelector('.help-dialog');

// --- Dialog Tree Engine ---
(() => {
  const dialogEl = document.querySelector('.help-dialog');
  const btnA     = document.getElementById('btn-bubble-A');
  const btnB     = document.getElementById('btn-bubble-B');
  const btnC     = document.getElementById('btn-bubble-C');
  const inpt     = document.getElementById('help-txt');
  const inptCont = document.querySelector('.textInputCont');

  const answers = {};

function setInput(cfg) {
  // Hide by default
  if (!cfg || cfg.hide) {
    inptCont.setAttribute('hidden', '');
    inpt.disabled = true;
    inpt.placeholder = '';
    inpt.value = '';
    inpt.onkeydown = null;
    return;
  }

  // Show + configure
  inptCont.removeAttribute('hidden');
  inpt.disabled = !!cfg.disabled;
  inpt.placeholder = cfg.placeholder || '';
  inpt.value = cfg.value || '';

  const next = cfg.next || currentNode;
  const saveKey = cfg.valueKey;  // e.g. "issueDesc"

  const submit = () => {
    // Optional validation hook
    if (typeof cfg.validate === 'function' && !cfg.validate(inpt.value)) {
      if (typeof cfg.onInvalid === 'function') cfg.onInvalid(inpt, dialogEl);
      return;
    }
    if (saveKey) answers[saveKey] = inpt.value;
    go(next);
  };

}

  // Utility to set a button from config
  function setBtn(el, cfg, fallbackText) {
    if (!cfg || cfg.hide) {
      el.setAttribute('hidden', '');
      el.disabled = true;
      el.onclick = null;
      return;
    }
    el.removeAttribute('hidden');
    el.disabled = !!cfg.disabled;
    el.textContent = cfg.text || fallbackText;
    const next = cfg.next || currentNode;
    el.onclick = () => go(next);
  }

  // Optional: fake progress animation
  function fakeProgress(lines, doneNode, interval) {

    let i = 0;
    const tick = () => {
      if (i < lines.length) {
        dialogEl.innerHTML = lines.slice(0, i + 1).join("<br>");
        i++;
        setTimeout(tick, randomInt(2500, 8000));
      } else {
        go(doneNode);
      }
    };
    tick();
  }

  // The dialog tree
  const DIALOG = {
    start: {
      html: `
        <strong>🗣️ It looks like you're trying to find help.</strong>
        <br>
        I will guide you through the steps to solve your issue.
        <br><br>
      `,
      A : { text: "Let's begin", next: "begin" },
      B : { hide: true },
      C : { text: "No thank you", next: "areYouSure" }
    },
    areYouSure: {
      html: `
        <strong>No problem!</strong>
        <br>
        Are you sure you don't want any help?
      `,
      A : { text: "Start again", next: "start" },
      C : { text: "I'm sure",     next: "loopBack" }
    },
    loopBack: {
      html: `
        ⚠️<strong>No Problem!</strong>
        <br>
        Let's start from the top.
      `,
      A : { text: "Ok", next: "Q01" },
      B : { hide: true },
      C : { hide: true },
    },
    begin: {
      html: `
        <strong>Perfect!</strong> Let’s complete a short pre-help checklist:
        <ul>
          <li>Did you try refreshing the page?</li>
          <li>Have you tried logging out and logging back in again?</li>
          <li>Is your browser cache erased?</li>
          <li>Have you drank enough water today?</li>
        </ul>
      `,
      A : { text: "Done!", next: "Q01" },
      B : { hide: true },
      C : { text: "Not completed",   next: "start" }
    },
    Q01: {
      html: `
        <strong>Great!</strong> let's begin.
        <br>
        Let me ask a few questions to narrow down your query.
        <br>
        Is your issue related to:
        <ul>
          <li><strong>A.</strong> Your previously logged walks?</li>
          <li><strong>B.</strong> A walk you are trying to log now?</li>
          <li><strong>C.</strong> Something else.</li>
        </ul>
      `,
      A : { text: "A.", next: "Q02" },
      B : { text: "B.", next: "Q03"},
      C : { text: "Something else", next: "Q04" }
    },
    Q02: {
      html: `
        <strong>Interesting!</strong> So your issue is with your previously logged walks?
        <br>
        Is it an issue with:
        <ul>
            <li><strong>A.</strong> Missing logs that aren't showing up any more?</li>
            <li><strong>B.</strong> Logs that shouldn't be there appearing in your list?</li>
        </ul>
      `,
      A : { text: "A.", next: "Q05" },
      B : { text: "B.", next: "Q06" },
      C : { text: "Back", next: "loopBack" }
    },
    Q03: {
      html: `
        💡 <strong>Ah!</strong> 
        <br>
        So your logs are not appearing after you click to submit?
      `,
      A : { text: "Yes", next: "Q11" },
      B : { hide: true },
      C : { text: "No", next: "loopBack" }
    },
    Q04: {
      html: `
        ☑️<strong>Alright!</strong> Is it:
        <ul>
            <li><strong>A.</strong> An issue with this app? </li>
            <li><strong>B.</strong> A problem in your personal life? </li>
        </ul>
      `,
      A : { text: "A.", next: "Q09" },
      B : { text: "B.", next: "Q10" },
      C : { text: "Back", next: "loopBack" }
    },
    Q05: {
      html: `
        <strong>Ok.</strong> Good to know.
        <br>
        Let's fix this for you, was it:
        <ul>
            <li><strong>A.</strong> A specific log you can't see anymore?</li>
            <li><strong>B.</strong> All of your logs are gone?</li>
        </ul>
      `,
      A : { text: "A.", next: "Q07" },
      B : { text: "B.", next: "Q08" },
      C : { text: "Back", next: "loopBack" }
    },
    Q06: {
      html: `
        <strong>Geting there!</strong> So you have logs in your data that you didn't record?
      `,
      A : { text: "Yes", next: "Q06end" },
      B : { hide: true },
      C : { text: "Back", next: "loopBack" }
    }, 
    Q06end: {
      html: `
        🎉 <strong>Congratulations!</strong>
        <br>
        You can delete the logs in the 'Recent Walks' section by clicking the 🗑️ icon.
      `,
      A : { hide: true },
      B : { hide: true },
      C : { text: "Back to start", next: "start" }
    },
    Q07: {
      html: `
        <strong>Perfect.</strong>
        <br>
        You could try just logging it again...
        <br>
        Or I can try to recover your missing data?
      `,
      A : { text: "OK", next: "complete" },
      B : { text: "Attempt recover", next: "recover" },
      C : { text: "Back to start", next: "loopBack" }
    },
    Q08: {
      html: `
        <strong>Oh no!</strong>
        <br>
        That's very unfortunate, are you currently logged in?
      `,
      A : { text: "Yes", next: "Q08end1" },
      B : { text: "No", next: "Q08end2" },
      C : { text: "Back", next: "loopBack" }
    },
    Q08end1: {
      html: `
        <strong>Well...</strong> I'm stumped.
        <br>
        I dunno. 🤷
      `,
      A : { hide: true },
      B : { hide: true },
      C : { text: "Back", next: "loopBack" }
    },
    Q08end2: {
      html: `
        ☑️<strong>Plan time!</strong>
        <br>
        Try logging in, refresh, and come back.
      `,
      A : { hide: true },
      B : { hide: true },
      C : { text: "Back", next: "loopBack" }
    },
    Q09: {
      html: `
        📝<strong> Oh no!</strong> 
        <br>
        Please fill out the text box with your current problem.
        <br>
      `,
      input: {
        placeholder: "...",
        valueKey: "appIssue",
        next: "submit",
        submitButton: "A",         // wire the A button to submit()
        submitLabel: "Submit"
    },
      A : { text: "Submit", next: "submit" },
      B : { hide: true },
      C : { text: "Cancel", next: "loopBack" }
    },
    Q10: {
      html: `
        ⚠️<strong> Well...</strong> Unfortunately I'm not a therapist so I can't help you with that.
        <br>
        Would you like to tell me anyway? A real person might read it and be able to help.
      `,
      input: {
        placeholder: "...",
        valueKey: "myIssue",
        next: "submit",
        submitButton: "A",         // wire the A button to submit()
        submitLabel: "Submit"
    },
      A : { text: "Submit", next: "submit" },
      B : { hide: true },
      C : { text: "Back", next: "loopBack" }
    },
    Q11: {
        html:`
        ☑️<strong> No problem!</strong> Let's first analyse the database and see if there are any corrupted files.
        <br>
        We shall take a look into your walks database, then if everything is correct, we shall anaylse your account.
      `,
      A : { text: "Let's do it", next: "analyse" },
      B : { hide: true },
      C : { text: "Cancel", next: "loopBack" }
    },
    submit: {
        html:`
        ☑️<strong> Submitted!</strong> Thank you!
        <br>
        We shall take a look into your issue within the next 2-20 working days.
      `,
      A : { text: "Back to start", next: "start" },
      B : { hide: true },
      C : { hide: true },
    },
    analyse: {
      onEnter() {
        // Dramatic, pointless progress sequence
        fakeProgress(
          [
            "-------------------------------------------<br>Analysing database…",
            "Analysing most recent walks…",
            "Success, no issues found.<br>-------------------------------------------",
            "Searching for corrupted files…",
            "Found currupted walk logs.",
            "Attempting recover…",
            "…",
            "…",
          ],
          "success"
        );
      },
      // Buttons hidden during fake progress
      A : { hide: true },
      B : { hide: true },
      C : { hide: true }
    },
    recover: {
      onEnter() {
        // Dramatic, pointless progress sequence
        fakeProgress(
          [
            "-------------------------------------------<br>Analysing database…",
            "Completing sorting algorythm…",
            "Calibrating data laser…",
            "Downloading drivers…",
            "Attempting recover…",
            "…",
          ],
          "failed"
        );
      },
      // Buttons hidden during fake progress
      A : { hide: true },
      B : { hide: true },
      C : { hide: true }
    },
    failed: {
      html: `
        ⚠️<strong> FAILED</strong>
        <br>
        Unfortunately the recover failed.
        <br>
        
      `,
      A : { hide: true },
      B : { hide: true },
      C : { text: "Back to start", next: "start" }
    },
    success: {
      html: `
        🎉<strong> SUCCESS</strong>
        <br>
        Great! Your issue should now be corrected within the next 2 working days.
        <br>
      `,
      A : { hide: true },
      B : { hide: true },
      C : { text: "Back to start", next: "start" }
    },
  };
  

  let currentNode = 'start';

  function render(node) {
    const n = DIALOG[node];
    if (!n) {
        console.warn(`Missing dialog node: ${node}`);
        return;
    }
    currentNode = node;
    dialogEl.innerHTML = n.html || "";

    // Buttons first (may be overridden by input submit binding)
    setBtn(btnA, n.A, 'OK');
    setBtn(btnB, n.B, 'Maybe');
    setBtn(btnC, n.C, 'Cancel');

    // New: configure input visibility/behavior
    setInput(n.input);

    if (typeof n.onEnter === 'function') n.onEnter();
    }

  function go(node) {
    render(node);
  }

  // Expose tiny API (handy for debugging)
  window.TrollHelp = { go, current: () => currentNode };

  // Kick off
  render('start');
})();


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

    // Update character
    setChar();
    
    // Process any queued sync operations
    if (isAuthenticated && isOnline) {
        await processSyncQueue();
    }
});

 // randomise top character and message
function setChar() {
    if (currentUser === null) {
        characterIconEl.innerHTML = `
            <img src="images/icons/characters/doctor.png" alt="Walking Logger" class="icon-char" id="characterIcon">
        `;
        welcomeMessageEl.innerHTML = `
            <p class="delete-warning">Welcome to your personal walking logger app, log in to sync your walks!</p>
        `;
    }
    else {
        const randomChar = randomInt(1, 4);
        if (randomChar === 1) {
            characterIconEl.innerHTML = `
                <img src="images/icons/characters/agent.png" alt="Walking Logger" class="icon-char" id="characterIcon">
            `;
        }
        if (randomChar === 2) {
            characterIconEl.innerHTML = `
                <img src="images/icons/characters/cartoon.png" alt="Walking Logger" class="icon-char" id="characterIcon">
            `;
        }
        if (randomChar === 3) {
            characterIconEl.innerHTML = `
                <img src="images/icons/characters/doctor.png" alt="Walking Logger" class="icon-char" id="characterIcon">
            `;
        }
        if (randomChar === 4) {
            characterIconEl.innerHTML = `
                <img src="images/icons/characters/king.png" alt="Walking Logger" class="icon-char" id="characterIcon">
            `;
        }

        const randomMsg = randomInt(1,10);
        if (randomMsg === 1) {
            welcomeMessageEl.innerHTML = `
                <p class="delete-warning">Welcome back to your personal walking logger app, make sure to get one in <b>every day!</b></p>
            `;
        }
        if (randomMsg === 2) {
            welcomeMessageEl.innerHTML = `
                <p class="delete-warning">Keep moving, keep logging, your future self will thank you!</p>
            `;
        }
        if (randomMsg === 3) {
            welcomeMessageEl.innerHTML = `
                <p class="delete-warning">A sip of water before and after your walk goes a long way.</p>
            `;
        }
        if (randomMsg === 4) {
            welcomeMessageEl.innerHTML = `
                <p class="delete-warning">Welcome back! Every walk counts, get today’s logged.</p>
            `;
        }
        if (randomMsg === 5) {
            welcomeMessageEl.innerHTML = `
                <p class="delete-warning">Walking regularly can reduce your risk of heart disease by up to 30%</p>
            `;
        }
        if (randomMsg === 6) {
            welcomeMessageEl.innerHTML = `
                <p class="delete-warning">Loosen those calves before your next stroll.</p>
            `;
        }
        if (randomMsg === 7) {
            welcomeMessageEl.innerHTML = `
                <p class="delete-warning">Great job logging today’s walk, consistency is key.</p>
            `;
        }
        if (randomMsg === 8) {
            welcomeMessageEl.innerHTML = `
                <p class="delete-warning">Another one logged! Keep the streak alive.</p>
            `;
        }
        if (randomMsg === 9) {
            welcomeMessageEl.innerHTML = `
                <p class="delete-warning">Done walking? Time to relax those feet.</p>
            `;
        }
        if (randomMsg === 10) {
            welcomeMessageEl.innerHTML = `
                <p class="delete-warning">Walking is proven to sharpen memory and focus.</p>
            `;
        }
    }
}

// Check authentication status
async function checkAuthStatus() {
    const token = localStorage.getItem(AUTH_TOKEN_KEY);
    updateDocumentTitle();
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
        updateDocumentTitle();
    } else {
        loginBtn.style.display = 'inline-flex';
        logoutBtn.style.display = 'none';
        updateDocumentTitle();
    }
}

// Event listeners
function setupEventListeners() {
    walkForm.addEventListener('submit', handleFormSubmit);
    exportBtn.addEventListener('click', handleExport);
    importBtn.addEventListener('click', () => csvFileInput.click());
    csvFileInput.addEventListener('change', handleImport);
    
    // Delete all walks button
    const deleteAllBtn = document.getElementById('deleteAllBtn');
    if (deleteAllBtn) {
        deleteAllBtn.addEventListener('click', deleteAllWalks);
    }
    
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
    
    // Goal setting event listener
    const setGoalBtn = document.getElementById('setGoalBtn');
    if (setGoalBtn) {
        setGoalBtn.addEventListener('click', () => {
            const yearlyGoalInput = document.getElementById('yearlyGoal');
            const goalValue = parseFloat(yearlyGoalInput.value);
            
            if (goalValue && goalValue > 0) {
                saveYearlyGoal(goalValue);
                showToast('Yearly goal set successfully!', 'success');
                updateCharts(); // Update cumulative chart with new goal
            } else {
                showToast('Please enter a valid goal distance', 'error');
            }
        });
    }
    
    // Load yearly goal on startup
    loadYearlyGoal();
    
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
    
    updateDocumentTitle();

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

    setChar();
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
    updateDocumentTitle();
    
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
        const userEmail = currentUser && currentUser.email ? currentUser.email : 'user';
        syncText.textContent = `Synced across all devices (${userEmail})`;
        syncStatus.className = 'sync-status online';
    }
}

// Update title with email
function updateDocumentTitle() {
    const baseTitle = 'Walk Logger';
    if (isAuthenticated && currentUser && currentUser.email) {
        //document.title = `${baseTitle} - ${currentUser.email}`;
        appTitleEl.textContent = `Walk Logger - ${currentUser.email}`;
    } else {
        //document.title = baseTitle;
        appTitleEl.textContent = 'Walk Logger';
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
            // Also update Earth progress when switching to charts tab
            const totalDistance = walkData.reduce((sum, walk) => {
                const distance = parseFloat(walk.distance) || 0;
                return sum + distance;
            }, 0);
            updateEarthProgress(totalDistance);
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
        
        // Ensure data types are correct for frontend processing
        const processedData = data.map(walk => ({
            ...walk,
            distance: parseFloat(walk.distance) || 0,
            timeElapsed: parseFloat(walk.timeElapsed) || 0,
            date: walk.date.split('T')[0] // Normalize date to YYYY-MM-DD format
        }));
        
        // Update local storage with processed data
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(processedData));
        
        return processedData;
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

// Goal management functions
function loadYearlyGoal() {
    const currentYear = new Date().getFullYear();
    const goalData = JSON.parse(localStorage.getItem(GOAL_STORAGE_KEY) || '{}');
    yearlyGoal = goalData[currentYear] || 0;
    
    // Update UI
    const yearlyGoalInput = document.getElementById('yearlyGoal');
    if (yearlyGoalInput && yearlyGoal > 0) {
        yearlyGoalInput.value = yearlyGoal;
    }
    
    updateGoalProgress();
}

function saveYearlyGoal(goal) {
    const currentYear = new Date().getFullYear();
    const goalData = JSON.parse(localStorage.getItem(GOAL_STORAGE_KEY) || '{}');
    goalData[currentYear] = parseFloat(goal);
    localStorage.setItem(GOAL_STORAGE_KEY, JSON.stringify(goalData));
    yearlyGoal = parseFloat(goal);
    updateGoalProgress();
}

function updateGoalProgress() {
    const currentYear = new Date().getFullYear();
    const yearProgress = calculateYearProgress();
    
    // Update progress display
    const yearProgressEl = document.getElementById('yearProgress');
    const goalProgressFillEl = document.getElementById('goalProgressFill');
    const goalPercentageEl = document.getElementById('goalPercentage');
    const goalProgressFillBanEl = document.getElementById('goalProgressFillBan');
    const goalPercentageBanEl = document.getElementById('goalPercentageBan');
    const goalLabelEl = document.getElementById('goalLabel');
    
    if (yearProgressEl && goalProgressFillEl && goalPercentageEl) {
        const myPercentage = Math.min((yearProgress / yearlyGoal) * 100);
        if (yearlyGoal > 0) {
            const percentage = Math.min((yearProgress / yearlyGoal) * 100, 100);
            yearProgressEl.textContent = `${yearProgress.toFixed(2)} / ${yearlyGoal}`;
            goalProgressFillEl.style.width = `${percentage}%`;
            goalPercentageEl.textContent = `${percentage.toFixed(1)}%`;
            goalIconEl.innerHTML = `
            <img src="images/icons/target_32.png" alt="" class="icon">
            `;
            goalLabelEl.innerHTML =`
            Year Goal Progress:
            `;
        }
        if (yearlyGoal === 0) {
            yearProgressEl.textContent = `${yearProgress.toFixed(2)} / No Goal Set`;
            goalProgressFillEl.style.width = '0%';
            goalPercentageEl.textContent = '0%';
            goalIconEl.innerHTML = `
            <img src="images/icons/target_32.png" alt="" class="icon">
            `;
            goalLabelEl.innerHTML =`
            Set a goal
            `;
        }
        if (myPercentage > 100) {
            const percentage = Math.min((yearProgress / yearlyGoal) * 100, 100);
            yearProgressEl.textContent = `${yearProgress.toFixed(2)} / ${yearlyGoal}`;
            goalProgressFillEl.style.width = `${percentage}%`;
            goalPercentageEl.textContent = `${percentage.toFixed(1)}%`;
            goalIconEl.innerHTML = `
            <img src="images/icons/party.png" alt="" class="icon">
            `;
            goalLabelEl.innerHTML =`
            CONGRATULATIONS!!!
            `;
        }
    }
    if (goalProgressFillBanEl && goalPercentageBanEl) {
        if (yearlyGoal > 0) {
            const percentage = Math.min((yearProgress / yearlyGoal) * 100, 100);
            goalProgressFillBanEl.style.width = `${percentage}%`;
            goalPercentageBanEl.textContent = `${percentage.toFixed(1)}%`;
        } else {
            goalProgressFillBanEl.style.width = '0%';
            goalPercentageBanEl.textContent = '0%';
        }
    }
}

function calculateYearProgress() {
    const currentYear = new Date().getFullYear();
    return walkData
        .filter(walk => new Date(walk.date).getFullYear() === currentYear)
        .reduce((sum, walk) => sum + (parseFloat(walk.distance) || 0), 0);
}

// Update statistics (same as original but adapted)
function updateStatistics() {
    const totalWalks = walkData.length;
    const totalDistance = walkData.reduce((sum, walk) => {
        const distance = parseFloat(walk.distance) || 0;
        return sum + distance;
    }, 0);
    const totalDistanceBan = walkData.reduce((sum, walk) => {
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
    animateNumber(totalDistanceBanEl, parseFloat(totalDistance.toFixed(2)));
    
    // Update streak displays if elements exist
    if (currentStreakEl) {
        animateNumber(currentStreakEl, streaks.current);
    }
    if (longestStreakEl) {
        animateNumber(longestStreakEl, streaks.longest);
    }
    
    // Update banner streak counter if element exists
    if (bannerCurrentStreakEl) {
        animateNumber(bannerCurrentStreakEl, streaks.current);
        if (streaks.current === 0) {
            bannerCurrentStreakIconEl.innerHTML = `
            <div class="streak-icon" id="bannerStreakIcon"><img src="images/icons/streak_empty.png" alt="" class="icon"></div>
        `;
        return;
        }
        else {
            bannerCurrentStreakIconEl.innerHTML = `
            <div class="streak-icon" id="bannerStreakIcon"><img src="images/icons/streak_fire.gif" alt="" class="icon"></div>
        `;
        return;
        }
    }

    // Update Earth circumference progress
    updateEarthProgress(totalDistance);
    
    // Update weekly comparison if elements exist
    updateWeeklyComparison(weeklyComparison);
}

// Calculate current and longest streaks (fixed timezone issues)
function calculateStreaks() {
    if (walkData.length === 0) {
        return { current: 0, longest: 0 };
    }
    
    // Get unique dates and sort them
    const uniqueDates = [...new Set(walkData.map(walk => walk.date))].sort();
    
    let currentStreak = 0;
    let longestStreak = 0;
    let tempStreak = 0;
    
    // Use local timezone for today's date to match what user sees
    const today = new Date();
    const todayStr = today.getFullYear() + '-' + 
                    String(today.getMonth() + 1).padStart(2, '0') + '-' + 
                    String(today.getDate()).padStart(2, '0');
    
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.getFullYear() + '-' + 
                        String(yesterday.getMonth() + 1).padStart(2, '0') + '-' + 
                        String(yesterday.getDate()).padStart(2, '0');
    
    // Check if we have a walk today or yesterday to start current streak
    const hasWalkToday = uniqueDates.includes(todayStr);
    const hasWalkYesterday = uniqueDates.includes(yesterdayStr);
    
    if (!hasWalkToday && !hasWalkYesterday) {
        currentStreak = 0;
    } else {
        // Calculate current streak by going backwards from today
        let checkDate = hasWalkToday ? new Date(today) : new Date(yesterday);
        
        while (true) {
            const checkDateStr = checkDate.getFullYear() + '-' + 
                                String(checkDate.getMonth() + 1).padStart(2, '0') + '-' + 
                                String(checkDate.getDate()).padStart(2, '0');
            
            if (uniqueDates.includes(checkDateStr)) {
                currentStreak++;
                checkDate.setDate(checkDate.getDate() - 1);
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
            const prevDate = new Date(uniqueDates[i - 1] + 'T00:00:00');
            const currDate = new Date(uniqueDates[i] + 'T00:00:00');
            const dayDiff = Math.round((currDate - prevDate) / (1000 * 60 * 60 * 24));
            
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

// Update Earth circumference progress
function updateEarthProgress(totalDistance) {
    const EARTH_CIRCUMFERENCE = 24901; // miles
    
    // Get DOM elements
    const earthProgressDistanceEl = document.getElementById('earthProgressDistance');
    const earthProgressFillEl = document.getElementById('earthProgressFill');
    const earthPercentageEl = document.getElementById('earthPercentage');
    const earthRemainingEl = document.getElementById('earthRemaining');
    
    // Check if elements exist (they might not be visible if not on charts tab)
    if (!earthProgressDistanceEl || !earthProgressFillEl || !earthPercentageEl || !earthRemainingEl) {
        return;
    }
    
    // Calculate progress
    const percentage = Math.min((totalDistance / EARTH_CIRCUMFERENCE) * 100, 100);
    const remaining = Math.max(EARTH_CIRCUMFERENCE - totalDistance, 0);
    
    // Update the display elements
    animateNumber(earthProgressDistanceEl, parseFloat(totalDistance.toFixed(2)));
    earthProgressFillEl.style.width = `${percentage}%`;
    earthPercentageEl.textContent = `${percentage.toFixed(2)}%`;
    
    // Update remaining distance text
    if (remaining > 0) {
        earthRemainingEl.textContent = `${remaining.toFixed(2)} miles to go`;
    } else {
        earthRemainingEl.textContent = `🎉 You've walked around Earth!`;
    }
    
    // Add special styling if completed
    if (percentage >= 100) {
        earthProgressFillEl.style.background = 'linear-gradient(90deg, #00ff00, #ffff00, #00ff00)';
        earthPercentageEl.style.color = '#008000';
        earthPercentageEl.style.fontWeight = 'bold';
    } else {
        earthProgressFillEl.style.background = '';
        earthPercentageEl.style.color = '';
        earthPercentageEl.style.fontWeight = '';
    }
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
        if (element.id === 'totalDistanceBan') {
            element.textContent = current.toFixed(2);
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
                <div class="walk-content">
                    <div class="walk-date">${formatDate(walk.date)}</div>
                    <div class="walk-stats">
                        <div class="walk-stat">
                            <span><img src="images/icons/walk_black_16.png" alt="📏" class="icon-char"></span>
                            <span>${distance.toFixed(2)}</span>

                            <span><img src="images/icons/clock-0.png" alt="⏱️" class="icon-char"></span>
                            <span>${timeElapsed} min</span>

                            <span><img src="images/icons/timer-0.png" alt="🏃‍♂️" class="icon-char"></span>
                            <span>${calculatePace(timeElapsed, distance)} min/mile</span>
                        </div>
                    </div>
                </div>
                <button class="delete-walk-btn" onclick="deleteWalk('${walk.date}', ${distance}, ${timeElapsed})" title="Delete this walk">
                    <img src="images/icons/recycle_bin_empty-3.png" alt="" class="icon">
                </button>
            </div>
        `;
    }).join('');
}

// Initialize charts (adapted from original)
function initializeCharts() {
    const distanceCtx = document.getElementById('distanceChart').getContext('2d');
    const timeDistanceCtx = document.getElementById('timeDistanceChart').getContext('2d');
    const cumulativeCtx = document.getElementById('cumulativeChart').getContext('2d');
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
                borderColor: '#000080',
                backgroundColor: '#c0c0c0',
                borderWidth: 2,
                fill: false,
                tension: 0.1,
                pointBackgroundColor: '#000080',
                pointBorderColor: '#000000',
                pointBorderWidth: 1,
                pointRadius: 1,
                pointHoverRadius: 1,
                pointStyle: 'rect'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: true,
                    position: 'top',
                    labels: {
                        color: '#000000',
                        font: {
                            family: 'MS Sans Serif, sans-serif',
                            size: 11
                        },
                        boxWidth: 12,
                        boxHeight: 12
                    }
                },
                tooltip: {
                    backgroundColor: '#ffffe1',
                    titleColor: '#000000',
                    bodyColor: '#000000',
                    borderColor: '#000000',
                    borderWidth: 1,
                    callbacks: {
                        label: function(context) {
                            const dataPoint = context.raw;
                            return [
                                `Distance: ${context.parsed.y}`
                            ];
                        }
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    grid: {
                        color: '#808080',
                        lineWidth: 1
                    },
                    ticks: {
                        color: '#000000',
                        font: {
                            family: 'MS Sans Serif, sans-serif',
                            size: 10
                        }
                    },
                    border: {
                        color: '#000000',
                        width: 2
                    }
                },
                x: {
                    grid: {
                        color: '#808080',
                        lineWidth: 1
                    },
                    ticks: {
                        color: '#000000',
                        font: {
                            family: 'MS Sans Serif, sans-serif',
                            size: 5
                        }
                    },
                    border: {
                        color: '#000000',
                        width: 2
                    }
                }
            },
            animation: {
                duration: 0
            },
            interaction: {
                intersect: false
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
                backgroundColor: '#000080',
                borderColor: '#000000',
                borderWidth: 1,
                pointRadius: 2,
                pointHoverRadius: 2,
                pointStyle: 'rect'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: true,
                    position: 'top',
                    labels: {
                        color: '#000000',
                        font: {
                            family: 'MS Sans Serif, sans-serif',
                            size: 11
                        },
                        boxWidth: 12,
                        boxHeight: 12
                    }
                },
                tooltip: {
                    backgroundColor: '#ffffe1',
                    titleColor: '#000000',
                    bodyColor: '#000000',
                    borderColor: '#000000',
                    borderWidth: 1,
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
                        text: 'Time Elapsed (minutes)',
                        color: '#000000',
                        font: {
                            family: 'MS Sans Serif, sans-serif',
                            size: 11
                        }
                    },
                    grid: {
                        color: '#808080',
                        lineWidth: 1
                    },
                    ticks: {
                        color: '#000000',
                        font: {
                            family: 'MS Sans Serif, sans-serif',
                            size: 10
                        }
                    },
                    border: {
                        color: '#000000',
                        width: 2
                    }
                },
                y: {
                    title: {
                        display: true,
                        text: 'Distance',
                        color: '#000000',
                        font: {
                            family: 'MS Sans Serif, sans-serif',
                            size: 11
                        }
                    },
                    grid: {
                        color: '#808080',
                        lineWidth: 1
                    },
                    ticks: {
                        color: '#000000',
                        font: {
                            family: 'MS Sans Serif, sans-serif',
                            size: 10
                        }
                    },
                    border: {
                        color: '#000000',
                        width: 2
                    }
                }
            },
            animation: {
                duration: 0
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
                    borderColor: '#800000',
                    backgroundColor: '#c0c0c0',
                    borderWidth: 2,
                    fill: false,
                    tension: 0,
                    pointRadius: 1.5,
                    pointBackgroundColor: '#800000',
                    pointBorderColor: '#000000',
                    pointBorderWidth: 1,
                    pointStyle: 'circle'
                },
                {
                    label: '14-day Average',
                    data: [],
                    borderColor: '#008000',
                    backgroundColor: '#c0c0c0',
                    borderWidth: 2,
                    fill: false,
                    tension: 0,
                    pointRadius: 1.5,
                    pointBackgroundColor: '#008000',
                    pointBorderColor: '#000000',
                    pointBorderWidth: 1,
                    pointStyle: 'triangle'
                },
                {
                    label: '30-day Average',
                    data: [],
                    borderColor: '#000080',
                    backgroundColor: '#c0c0c0',
                    borderWidth: 2,
                    fill: false,
                    tension: 0,
                    pointRadius: 1.5,
                    pointBackgroundColor: '#000080',
                    pointBorderColor: '#000000',
                    pointBorderWidth: 1,
                    pointStyle: 'rect'
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
                        color: '#000000',
                        font: {
                            family: 'MS Sans Serif, sans-serif',
                            size: 10
                        },
                        boxWidth: 12,
                        boxHeight: 12
                    }
                },
                tooltip: {
                    backgroundColor: '#ffffe1',
                    titleColor: '#000000',
                    bodyColor: '#000000',
                    borderColor: '#000000',
                    borderWidth: 1,
                    callbacks: {
                        label: function(context) {
                            const dataPoint = context.raw;
                            return [
                                `Distance: ${context.parsed.y}`
                            ];
                        }
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    grid: {
                        color: '#808080',
                        lineWidth: 1
                    },
                    ticks: {
                        color: '#000000',
                        font: {
                            family: 'MS Sans Serif, sans-serif',
                            size: 10
                        }
                    },
                    border: {
                        color: '#000000',
                        width: 2
                    }
                },
                x: {
                    grid: {
                        color: '#808080',
                        lineWidth: 1
                    },
                    ticks: {
                        color: '#000000',
                        font: {
                            family: 'MS Sans Serif, sans-serif',
                            size: 5
                        }
                    },
                    border: {
                        color: '#000000',
                        width: 2
                    }
                }
            },
            animation: {
                duration: 0
            }
        }
    });
    
    // Pace Trends Chart
    paceTrendsChart = new Chart(paceTrendsCtx, {
        type: 'line',
        data: {
            labels: [],
            datasets: [{
                label: 'Pace (min/mile)',
                data: [],
                borderColor: '#008080',
                backgroundColor: '#c0c0c0',
                borderWidth: 2,
                fill: false,
                tension: 0.1,
                pointBackgroundColor: '#008080',
                pointBorderColor: '#000000',
                pointBorderWidth: 1,
                pointRadius: 1,
                pointHoverRadius: 1,
                pointStyle: 'circle'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: true,
                    position: 'top',
                    labels: {
                        color: '#000000',
                        font: {
                            family: 'MS Sans Serif, sans-serif',
                            size: 11
                        },
                        boxWidth: 12,
                        boxHeight: 12
                    }
                },
                tooltip: {
                    backgroundColor: '#ffffe1',
                    titleColor: '#000000',
                    bodyColor: '#000000',
                    borderColor: '#000000',
                    borderWidth: 1,
                    callbacks: {
                        label: function(context) {
                            const dataPoint = context.raw;
                            return [
                                `Pace: ${context.parsed.y}`
                            ];
                        }
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: false,
                    grid: {
                        color: '#808080',
                        lineWidth: 1
                    },
                    ticks: {
                        color: '#000000',
                        font: {
                            family: 'MS Sans Serif, sans-serif',
                            size: 10
                        }
                    },
                    border: {
                        color: '#000000',
                        width: 2
                    },
                    title: {
                        display: true,
                        text: 'Pace (min/mile)',
                        color: '#000000',
                        font: {
                            family: 'MS Sans Serif, sans-serif',
                            size: 11
                        }
                    }
                },
                x: {
                    grid: {
                        color: '#808080',
                        lineWidth: 1
                    },
                    ticks: {
                        color: '#000000',
                        font: {
                            family: 'MS Sans Serif, sans-serif',
                            size: 5
                        }
                    },
                    border: {
                        color: '#000000',
                        width: 2
                    }
                }
            },
            animation: {
                duration: 0
            }
        }
    });
    
    // Cumulative Distance Progress Chart
    cumulativeChart = new Chart(cumulativeCtx, {
        type: 'line',
        data: {
            labels: [],
            datasets: [
                {
                    label: 'Cumulative Distance',
                    data: [],
                    borderColor: '#000080',
                    backgroundColor: 'transparent',
                    borderWidth: 2,
                    fill: false,
                    tension: 0,
                    pointRadius: 0,
                    pointHoverRadius: 0
                },
                {
                    label: 'Goal Line',
                    data: [],
                    borderColor: '#ff0000',
                    backgroundColor: 'transparent',
                    borderWidth: 3,
                    borderDash: [7, 5],
                    fill: false,
                    tension: 0,
                    pointRadius: 0,
                    pointHoverRadius: 0
                },
                {
                    label: 'Trend Line',
                    data: [],
                    borderColor: '#808080',
                    backgroundColor: 'transparent',
                    borderWidth: 3,
                    borderDash: [5, 3],
                    fill: false,
                    tension: 0,
                    pointRadius: 0,
                    pointHoverRadius: 0
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
                        color: '#000000',
                        font: {
                            family: 'MS Sans Serif, sans-serif',
                            size: 10
                        },
                        boxWidth: 12,
                        boxHeight: 12
                    }
                },
                tooltip: {
                    backgroundColor: '#ffffe1',
                    titleColor: '#000000',
                    bodyColor: '#000000',
                    borderColor: '#000000',
                    borderWidth: 1,
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    grid: {
                        color: '#808080',
                        lineWidth: 1
                    },
                    ticks: {
                        color: '#000000',
                        font: {
                            family: 'MS Sans Serif, sans-serif',
                            size: 10
                        }
                    },
                    border: {
                        color: '#000000',
                        width: 2
                    }
                },
                x: {
                    grid: {
                        color: '#808080',
                        lineWidth: 1
                    },
                    ticks: {
                        color: '#000000',
                        font: {
                            family: 'MS Sans Serif, sans-serif',
                            size: 5
                        }
                    },
                    border: {
                        color: '#000000',
                        width: 2
                    }
                }
            },
            animation: {
                duration: 0
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
    
    if (cumulativeChart) {
        updateCumulativeChart();
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
    const yAxisTitle = currentMovingAverageView === 'distance' ? 'Distance' : 'Pace (min/mile)';
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

// Update cumulative chart
function updateCumulativeChart() {
    if (!cumulativeChart) return;
    
    const currentYear = new Date().getFullYear();
    const startOfYear = new Date(currentYear, 0, 1);
    const endOfYear = new Date(currentYear, 11, 31);
    const totalDaysInYear = Math.ceil((endOfYear - startOfYear) / (1000 * 60 * 60 * 24)) + 1;
    
    // Generate full year timeline (every day of the year)
    const fullYearLabels = [];
    const fullYearData = [];
    
    // Filter walks for current year and create lookup map
    const yearWalks = walkData
        .filter(walk => new Date(walk.date).getFullYear() === currentYear)
        .sort((a, b) => new Date(a.date) - new Date(b.date));
    
    // Create a map of date -> cumulative distance for walks
    const walkMap = {};
    let runningTotal = 0;
    yearWalks.forEach(walk => {
        runningTotal += parseFloat(walk.distance) || 0;
        walkMap[walk.date] = runningTotal;
    });
    
    // Generate data for every day of the year
    let currentCumulative = 0;
    for (let dayOfYear = 1; dayOfYear <= totalDaysInYear; dayOfYear++) {
        const currentDate = new Date(currentYear, 0, dayOfYear);
        const dateString = currentDate.toISOString().split('T')[0];
        
        // Check if there's a walk on this date
        if (walkMap[dateString] !== undefined) {
            currentCumulative = walkMap[dateString];
        }
        
        // Add every 7th day to reduce label density (weekly markers)
        if (dayOfYear % 7 === 1 || dayOfYear === 1 || dayOfYear === totalDaysInYear) {
            fullYearLabels.push(formatDate(dateString));
        } else {
            fullYearLabels.push(''); // Empty label for non-marker days
        }
        
        fullYearData.push(currentCumulative);
    }
    
    // Update cumulative distance data
    cumulativeChart.data.labels = fullYearLabels;
    cumulativeChart.data.datasets[0].data = fullYearData;
    
    // Calculate goal line and projection if goal is set
    if (yearlyGoal > 0) {
        // Goal line - straight line from 0 to goal over the full year
        const goalLineData = [];
        for (let dayOfYear = 1; dayOfYear <= totalDaysInYear; dayOfYear++) {
            const expectedDistance = (yearlyGoal * dayOfYear) / totalDaysInYear;
            goalLineData.push(expectedDistance);
        }
        cumulativeChart.data.datasets[1].data = goalLineData;
        
        // Calculate trend line using linear regression on actual walk dates
        const trendLineData = [];
        
        if (yearWalks.length >= 2) {
            // Prepare data points for linear regression (day of year vs cumulative distance)
            const dataPoints = [];
            let cumulativeForTrend = 0;
            
            yearWalks.forEach(walk => {
                cumulativeForTrend += parseFloat(walk.distance) || 0;
                const walkDate = new Date(walk.date);
                const dayOfYear = Math.ceil((walkDate - startOfYear) / (1000 * 60 * 60 * 24)) + 1;
                dataPoints.push({ x: dayOfYear, y: cumulativeForTrend });
            });
            
            // Calculate linear regression (y = mx + b)
            const n = dataPoints.length;
            const sumX = dataPoints.reduce((sum, point) => sum + point.x, 0);
            const sumY = dataPoints.reduce((sum, point) => sum + point.y, 0);
            const sumXY = dataPoints.reduce((sum, point) => sum + (point.x * point.y), 0);
            const sumXX = dataPoints.reduce((sum, point) => sum + (point.x * point.x), 0);
            
            const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
            const intercept = (sumY - slope * sumX) / n;
            
            // Generate trend line for full year
            for (let dayOfYear = 1; dayOfYear <= totalDaysInYear; dayOfYear++) {
                const trendValue = slope * dayOfYear + intercept;
                trendLineData.push(Math.max(0, trendValue)); // Ensure non-negative values
            }
            
            cumulativeChart.data.datasets[2].data = trendLineData;
        } else {
            cumulativeChart.data.datasets[2].data = [];
        }
    } else {
        // No goal set, clear goal line and projection
        cumulativeChart.data.datasets[1].data = [];
        cumulativeChart.data.datasets[2].data = [];
    }
    
    cumulativeChart.update('active');
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
            medal = '<img src="images/icons/medal_1.png" alt="" class="icon">';
        } else if (index === 1) {
            rankClass = 'silver';
            medal = '<img src="images/icons/medal_2.png" alt="" class="icon">';
        } else if (index === 2) {
            rankClass = 'bronze';
            medal = '<img src="images/icons/medal_3.png" alt="" class="icon">';
        }
        
        const distance = parseFloat(walk.distance) || 0;
        const timeElapsed = parseFloat(walk.timeElapsed) || 0;
        
        const displayValue = currentLeaderboardView === 'distance' 
            ? distance.toFixed(2)
            : calculatePace(timeElapsed, distance);
        
        const detailsText = currentLeaderboardView === 'distance'
            ? `${timeElapsed} min • ${calculatePace(timeElapsed, distance)} min/mile`
            : `${distance.toFixed(2)} mi • ${timeElapsed} min`;
        
        return `
            <div class="leaderboard-item ${rankClass}">

                <div class="leaderboard-rank">
                    <div class="rank-number">${index + 1}.</div>
                </div>
                <div class="leaderboard-distance">
                    ${displayValue}${currentLeaderboardView === 'pace' ? ' min/mile' : ''}
                </div>

                <div class="leaderboard-details">
                    ${detailsText}
                </div>

                <div class="leaderboard-date">${formatDateShort(walk.date)}</div>
                
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

function formatDateShort(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString(  "en-GB", { timeZone: "UTC" }  );
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

// Help Dialog Update
function updateHelpDialog(newText) {
    if (helpDialog) {
        helpDialog.textContent = newText;
    }
}

// Delete a specific walk
async function deleteWalk(date, distance, timeElapsed) {
    const confirmed = await showConfirmDialog('Delete Walk', 'Are you sure you want to delete this walk?');
    if (!confirmed) {
        return;
    }
    
    showLoading(true);
    
    try {
        // Delete from local storage first
        await deleteWalkLocally(date, distance, timeElapsed);
        
        // Try to delete from server if authenticated and online
        if (isAuthenticated && isOnline) {
            await deleteWalkFromServer(date);
        } else if (isAuthenticated) {
            // Queue for later sync (delete operation)
            syncQueue.push({ action: 'delete', data: { date, distance, timeElapsed } });
            saveSyncQueue();
        }
        
        showToast('Walk deleted successfully!', 'success');
        
        // Reload data and update UI
        await loadWalkData();
        
    } catch (error) {
        showToast('Error deleting walk: ' + error.message, 'error');
    }
    
    showLoading(false);
}

// Delete walk from local storage
async function deleteWalkLocally(date, distance, timeElapsed) {
    const existingData = JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEY) || '[]');
    const filteredData = existingData.filter(walk => {
        // Match by date, distance, and timeElapsed to find the exact walk
        return !(walk.date === date && 
                Math.abs(parseFloat(walk.distance) - distance) < 0.01 && 
                Math.abs(parseFloat(walk.timeElapsed) - timeElapsed) < 0.01);
    });
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(filteredData));
}

// Delete walk from server
async function deleteWalkFromServer(date) {
    const token = localStorage.getItem(AUTH_TOKEN_KEY);
    if (!token) throw new Error('Not authenticated');
    
    showSyncSpinner(true);
    
    try {
        const response = await fetch(`${API_BASE_URL}/api/walks/${encodeURIComponent(date)}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (!response.ok) {
            throw new Error('Failed to delete from server');
        }
        
        return await response.json();
    } finally {
        showSyncSpinner(false);
    }
}

// Delete all walks
async function deleteAllWalks() {
    const firstConfirm = await showConfirmDialog('Delete All Walks', 'Are you sure you want to delete ALL walks? This action cannot be undone!');
    if (!firstConfirm) {
        return;
    }
    
    const secondConfirm = await showConfirmDialog('Final Confirmation', 'This will permanently delete all your walking data. Are you absolutely sure?');
    if (!secondConfirm) {
        return;
    }
    
    showLoading(true);
    
    try {
        // Clear local storage
        localStorage.removeItem(LOCAL_STORAGE_KEY);
        
        // Clear server data if authenticated and online
        if (isAuthenticated && isOnline) {
            await deleteAllWalksFromServer();
        } else if (isAuthenticated) {
            // Queue for later sync (delete all operation)
            syncQueue.push({ action: 'deleteAll', data: {} });
            saveSyncQueue();
        }
        
        // Clear sync queue as well
        syncQueue = [];
        saveSyncQueue();
        
        showToast('All walks deleted successfully!', 'success');
        
        // Reload data and update UI
        await loadWalkData();
        
    } catch (error) {
        showToast('Error deleting all walks: ' + error.message, 'error');
    }
    
    showLoading(false);
}

// Delete all walks from server
async function deleteAllWalksFromServer() {
    const token = localStorage.getItem(AUTH_TOKEN_KEY);
    if (!token) throw new Error('Not authenticated');
    
    showSyncSpinner(true);
    
    try {
        const response = await fetch(`${API_BASE_URL}/api/walks/all`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (!response.ok) {
            throw new Error('Failed to delete all walks from server');
        }
        
        return await response.json();
    } finally {
        showSyncSpinner(false);
    }
}

// Load sync queue on startup
loadSyncQueue();

// Custom Windows 98 style confirmation dialog
let confirmResolve = null;

function showConfirmDialog(title, message) {
    return new Promise((resolve) => {
        confirmResolve = resolve;
        
        // Set dialog content
        document.getElementById('confirmTitle').textContent = title;
        document.getElementById('confirmMessage').textContent = message;
        
        // Show dialog
        document.getElementById('confirmOverlay').style.display = 'block';
    });
}

function hideConfirmDialog() {
    document.getElementById('confirmOverlay').style.display = 'none';
    confirmResolve = null;
}

// Set up confirmation dialog event listeners
document.addEventListener('DOMContentLoaded', () => {
    const confirmYes = document.getElementById('confirmYes');
    const confirmNo = document.getElementById('confirmNo');
    const confirmOverlay = document.getElementById('confirmOverlay');
    
    confirmYes.addEventListener('click', () => {
        if (confirmResolve) {
            confirmResolve(true);
        }
        hideConfirmDialog();
    });
    
    confirmNo.addEventListener('click', () => {
        if (confirmResolve) {
            confirmResolve(false);
        }
        hideConfirmDialog();
    });
    
    // Close dialog when clicking overlay
    confirmOverlay.addEventListener('click', (e) => {
        if (e.target === confirmOverlay) {
            if (confirmResolve) {
                confirmResolve(false);
            }
            hideConfirmDialog();
        }
    });
    
    // Handle escape key
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && confirmOverlay.style.display === 'block') {
            if (confirmResolve) {
                confirmResolve(false);
            }
            hideConfirmDialog();
        }
    });
});
