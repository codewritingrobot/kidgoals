// KidGoals PWA - Main Application Logic

// Constants
const COLORS = [
    '#007AFF', '#5856D6', '#AF52DE', '#FF2D92', 
    '#FF3B30', '#FF9500', '#FFCC02', '#34C759',
    '#00C7BE', '#32ADE6', '#5AC8FA', '#FF6B6B'
];

const ICONS = [
    '🦊', '🐰', '🐻', '🦁', '🐯', '🐸',
    '🐙', '🦄', '🐬', '🦋', '🐼', '🦒',
    '🦘', '🐶', '🐱', '🐨', '🐵', '🐧'
];

// API Configuration
const API_BASE_URL = 'https://api.mcsoko.com'; // Will be set by Terraform
const API_ENDPOINTS = {
    SEND_CODE: '/api/auth/send-code',
    VERIFY_CODE: '/api/auth/verify-code',
    GET_DATA: '/api/user/data',
    SAVE_DATA: '/api/user/data',
    SYNC_DATA: '/api/user/sync',
    HEALTH: '/api/health'
};

// Story themes for different goal types
const STORY_THEMES = {
    countdown: {
        character: "🦊",
        characterName: "Fiona the Fox",
        destination: "🦊",
        destinationName: "fox den",
        trailItem: "🐾",
        trailItemName: "paw print",
        story: "needs to get home before sunset. If she stays on track, she leaves a paw print along the forest trail. When she reaches her den, she's safe and sound!"
    },
    countup: {
        character: "🐰",
        characterName: "Ruby the Rabbit",
        destination: "🏆",
        destinationName: "treasure chest",
        trailItem: "💎",
        trailItemName: "gem",
        story: "is collecting magical gems to unlock the treasure chest. Each gem brings her closer to discovering amazing treasures!"
    },
    daily: {
        character: "🦘",
        characterName: "Kangaroo Kid",
        destination: "⭐",
        destinationName: "star",
        trailItem: "🌟",
        trailItemName: "star",
        story: "is hopping through the day to collect stars. Each star represents a successful day of achieving their goal!"
    },
    weekly: {
        character: "🐨",
        characterName: "Koala Kid",
        destination: "🏆",
        destinationName: "trophy",
        trailItem: "🏅",
        trailItemName: "medal",
        story: "is climbing the tree of success to reach the trophy. Each medal represents a week of consistent progress!"
    },
    timer: {
        character: "🦊",
        characterName: "Fiona the Fox",
        destination: "🦊",
        destinationName: "fox den",
        trailItem: "🐾",
        trailItemName: "paw print",
        story: "needs to get home before sunset. If she stays on track, she leaves a paw print along the forest trail. When she reaches her den, she's safe and sound!"
    }
};

// App State
let currentUser = null;
let children = [];
let goals = [];
let activeTimers = new Map();
let selectedChildId = null;
let editingGoalId = null;
let authToken = null;
let lastSyncTime = null;
let isOnline = navigator.onLine;

// Session Management
const SESSION_KEY = 'kidgoals_session';
const SESSION_DURATION = 7 * 24 * 60 * 60 * 1000; // 7 days
const SELECTED_CHILD_KEY = 'kidgoals_selectedChild';
const LOCAL_DATA_KEY = 'kidgoals_local_data';
const SYNC_TIME_KEY = 'kidgoals_last_sync';

// DOM Elements
const elements = {
    // Screens
    authScreen: document.getElementById('auth-screen'),
    dashboardScreen: document.getElementById('dashboard-screen'),
    
    // Auth elements
    emailInput: document.getElementById('email-input'),
    sendCodeBtn: document.getElementById('send-code-btn'),
    verifyForm: document.querySelector('.verify-form'),
    codeInput: document.getElementById('code-input'),
    verifyCodeBtn: document.getElementById('verify-code-btn'),
    backToEmailBtn: document.getElementById('back-to-email-btn'),
    
    // Dashboard elements
    userEmail: document.getElementById('user-email'),
    logoutBtn: document.getElementById('logout-btn'),
    childAvatars: document.getElementById('child-avatars'),
    addChildBtn: document.getElementById('add-child-btn'),
    addGoalBtn: document.getElementById('add-goal-btn'),
    goalsList: document.getElementById('goals-list'),
    
    // Modals
    addChildModal: document.getElementById('add-child-modal'),
    addGoalModal: document.getElementById('add-goal-modal'),
    goalDetailModal: document.getElementById('goal-detail-modal'),
    confirmModal: document.getElementById('confirm-modal'),
    
    // Forms
    addChildForm: document.getElementById('add-child-form'),
    addGoalForm: document.getElementById('add-goal-form'),
    
    // Pickers
    childColorPicker: document.getElementById('child-color-picker'),
    goalIconPicker: document.getElementById('goal-icon-picker'),
    goalColorPicker: document.getElementById('goal-color-picker'),
    
    // Goal detail elements
    detailGoalName: document.getElementById('detail-goal-name'),
    detailProgressFill: document.getElementById('detail-progress-fill'),
    detailProgressEmoji: document.getElementById('detail-progress-emoji'),
    detailProgressText: document.getElementById('detail-progress-text'),
    detailGoalTime: document.getElementById('detail-goal-time'),
    detailEncouragement: document.getElementById('detail-encouragement'),
    
    // Action buttons
    editGoalBtn: document.getElementById('edit-goal-btn'),
    pauseGoalBtn: document.getElementById('pause-goal-btn'),
    resetGoalBtn: document.getElementById('reset-goal-btn'),
    deleteGoalBtn: document.getElementById('delete-goal-btn'),
    
    // Confirmation modal
    confirmTitle: document.getElementById('confirm-title'),
    confirmMessage: document.getElementById('confirm-message'),
    confirmAction: document.getElementById('confirm-action'),
    
    // Celebration
    celebrationOverlay: document.getElementById('celebration-overlay'),
    celebrationMessage: document.getElementById('celebration-message')
};

// SVG path for the trail (S-curve)
const TRAIL_SVG_PATH = "M 30 120 Q 90 30, 170 120 T 310 120";
const TRAIL_PATH_LENGTH = 280; // Approximate length for 320px width

// API Functions
async function apiCall(endpoint, options = {}) {
    const url = `${API_BASE_URL}${endpoint}`;
    const config = {
        headers: {
            'Content-Type': 'application/json',
            ...options.headers
        },
        ...options
    };

    // Add auth token if available
    if (authToken && endpoint !== API_ENDPOINTS.SEND_CODE && endpoint !== API_ENDPOINTS.VERIFY_CODE) {
        config.headers.Authorization = `Bearer ${authToken}`;
    }

    try {
        const response = await fetch(url, config);
        
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.error || `HTTP ${response.status}`);
        }
        
        return await response.json();
    } catch (error) {
        console.error('API call failed:', error);
        throw error;
    }
}

// Network status monitoring
function updateOnlineStatus() {
    isOnline = navigator.onLine;
    console.log('Network status:', isOnline ? 'online' : 'offline');
    
    if (isOnline && currentUser) {
        // Try to sync when coming back online
        syncDataWithServer();
    }
}

// Data synchronization
async function syncDataWithServer() {
    if (!isOnline || !currentUser || !authToken) return;

    try {
        const localData = loadLocalData();
        const response = await apiCall(API_ENDPOINTS.SYNC_DATA, {
            method: 'POST',
            body: JSON.stringify({
                localChildren: localData.children || [],
                localGoals: localData.goals || [],
                lastSyncTime: lastSyncTime
            })
        });

        // Update local data with server response
        children = response.children || [];
        goals = response.goals || [];
        lastSyncTime = response.lastSyncTime;
        
        // Save to local storage
        saveLocalData();
        saveSyncTime();
        
        // Restart timers
        restartTimers();
        
        // Update UI
        renderGoals();
        
        console.log('Data synced successfully');
    } catch (error) {
        console.error('Failed to sync data:', error);
        // Continue with local data
    }
}

// Enhanced data management functions
function loadLocalData() {
    const data = localStorage.getItem(LOCAL_DATA_KEY);
    return data ? JSON.parse(data) : { children: [], goals: [] };
}

function saveLocalData() {
    const data = { children, goals };
    localStorage.setItem(LOCAL_DATA_KEY, JSON.stringify(data));
}

function loadSyncTime() {
    const time = localStorage.getItem(SYNC_TIME_KEY);
    return time ? parseInt(time) : null;
}

function saveSyncTime() {
    if (lastSyncTime) {
        localStorage.setItem(SYNC_TIME_KEY, lastSyncTime.toString());
    }
}

function getPointOnTrail(t) {
    // Ensure t is a valid number between 0 and 1
    if (typeof t !== 'number' || isNaN(t)) {
        console.warn('Invalid t value for getPointOnTrail:', t);
        t = 0;
    }
    t = Math.max(0, Math.min(1, t));
    
    // S-curve: two quadratic Beziers
    // First: 0 <= t < 0.5, Second: 0.5 <= t <= 1
    const p0 = {x:30, y:120};
    const p1 = {x:90, y:30};
    const p2 = {x:170, y:120};
    const p3 = {x:310, y:120};
    if (t <= 0) return p0;
    if (t >= 1) return p3;
    if (t < 0.5) {
        // First segment: p0, p1, p2
        const tt = t * 2;
        const x = (1-tt)*(1-tt)*p0.x + 2*(1-tt)*tt*p1.x + tt*tt*p2.x;
        const y = (1-tt)*(1-tt)*p0.y + 2*(1-tt)*tt*p1.y + tt*tt*p2.y;
        return {x, y};
    } else {
        // Second segment: p2, reflected p1, p3
        const tt = (t-0.5) * 2;
        // The control point for the second segment is the reflection of p1 over p2
        const p1b = {x: p2.x + (p2.x - p1.x), y: p2.y + (p2.y - p1.y)};
        const x = (1-tt)*(1-tt)*p2.x + 2*(1-tt)*tt*p1b.x + tt*tt*p3.x;
        const y = (1-tt)*(1-tt)*p2.y + 2*(1-tt)*tt*p1b.y + tt*tt*p3.y;
        return {x, y};
    }
}

function trophySVG() {
    // Simple SVG trophy
    return `<svg width='40' height='40' viewBox='0 0 40 40'>
        <text x='20' y='22' font-size='16' text-anchor='middle' fill='#FFA500'>🏆</text>
    </svg>`;
}

// Helper: Sample S-curve at many points and compute arc-length
function getArcLengthTable(numSamples = 200) {
    const table = [];
    let prev = getPointOnTrail(0);
    let length = 0;
    table.push({t: 0, length: 0, x: prev.x, y: prev.y});
    for (let i = 1; i <= numSamples; i++) {
        const t = i / numSamples;
        const pt = getPointOnTrail(t);
        const dx = pt.x - prev.x;
        const dy = pt.y - prev.y;
        length += Math.sqrt(dx*dx + dy*dy);
        table.push({t, length, x: pt.x, y: pt.y});
        prev = pt;
    }
    return table;
}

// Helper: Find t for a given arc length
function getTAtArcLength(table, targetLength) {
    for (let i = 1; i < table.length; i++) {
        if (table[i].length >= targetLength) {
            // Linear interpolate between table[i-1] and table[i]
            const prev = table[i-1];
            const curr = table[i];
            const ratio = (targetLength - prev.length) / (curr.length - prev.length);
            return prev.t + (curr.t - prev.t) * ratio;
        }
    }
    return 1;
}

function getEvenlySpacedMilestonePercents(numMilestones, margin=0.0) {
    const table = getArcLengthTable(300);
    const totalLength = table[table.length-1].length;
    const percents = [];
    const startL = totalLength * margin;
    const endL = totalLength * (1 - margin);
    for (let i = 1; i <= numMilestones; i++) {
        const target = startL + (i / (numMilestones + 1)) * (endL - startL);
        percents.push(getTAtArcLength(table, target));
    }
    return percents;
}

function treeSVG() {
    // Simple cartoon tree SVG
    return `<svg width='32' height='48' viewBox='0 0 32 48'>
        <ellipse cx='16' cy='18' rx='14' ry='16' fill='#4caf50'/>
        <rect x='12' y='32' width='8' height='14' rx='3' fill='#8d5524'/>
    </svg>`;
}

function createTrailSVG(goal, progress, isDetailModal = false) {
    const theme = STORY_THEMES[goal.themeType || goal.type];
    const milestones = calculateMilestones(goal);
    
    // Ensure progress is a valid number
    if (typeof progress !== 'number' || isNaN(progress)) {
        console.warn('Invalid progress value for goal:', goal.name, progress);
        progress = 0;
    }
    
    // Fox position: 0-1
    const foxPercent = Math.min(Math.max(progress/100, 0), 1);
    const foxPos = getPointOnTrail(foxPercent);
    // Trophy position: always at end
    const denPos = getPointOnTrail(1);
    // Milestones: evenly spaced by arc length, but not at t=0 or t=1
    const margin = 0.13; // leave 13% at each end for fox/den
    const milestonePercents = getEvenlySpacedMilestonePercents(milestones.length, margin);
    const milestonePoints = milestonePercents.map(getPointOnTrail);
    // Tree positions (safe: corners and far above/below the curve)
    const trees = [
        {x: 30, y: 30},    // top left
        {x: 310, y: 30},   // top right
        {x: 30, y: 150},   // bottom left
        {x: 310, y: 150},  // bottom right
        {x: 170, y: 10}    // top center
    ];
    // Debug: log children used for avatars
    const goalChildrenForAvatars = getGoalChildren(goal);
    // console.log('SVG avatars for goal', goal.name, goalChildrenForAvatars);
    goalChildrenForAvatars.forEach((child, idx) => {
        // console.log(`Child ${idx}:`, child, 'Avatar:', child.avatar, 'Name:', child.name);
    });
    // SVG
    const N = goalChildrenForAvatars.length;
    return `
    <svg width='340' height='160' viewBox='0 0 340 160' class='trail-svg'>
        ${trees.map(tree => `<g class='trail-tree-svg' transform='translate(${tree.x},${tree.y})'>${treeSVG()}</g>`).join('')}
        <path d='${TRAIL_SVG_PATH}' fill='none' stroke='#b97a3a' stroke-width='8' stroke-linecap='round'/>
        <path d='${TRAIL_SVG_PATH}' fill='none' stroke='#ffe0b2' stroke-width='3' stroke-dasharray='8 8' stroke-linecap='round'${isDetailModal ? " id='detail-progress-fill'" : ''}/>
        ${milestonePoints.map((pt, i) => `<g class='trail-milestone-svg' transform='translate(${pt.x},${pt.y})'>
            <circle r='15' cx='0' cy='0' fill='${progress >= (100*(i+1)/(milestones.length+1)) ? goal.color : "#e9ecef"}' stroke='#b97a3a' stroke-width='2'/>
            <text x='0' y='7' text-anchor='middle' font-size='18' font-family='Arial'>🐾</text>
        </g>`).join('')}
        <g class='trail-trophy-svg' transform='translate(${denPos.x},${denPos.y})'>
            <g transform='translate(-20,-30)'>${trophySVG()}</g>
        </g>
        ${goalChildrenForAvatars.filter(child => !!child).map((child, index) => {
            const x = typeof foxPos.x === 'number' && !isNaN(foxPos.x) ? foxPos.x : 30;
            const y = typeof foxPos.y === 'number' && !isNaN(foxPos.y) ? foxPos.y + (index - (N-1)/2) * 32 : 120;
            return `<g class='trail-child-avatar-svg' transform='translate(${x},${y})' onclick="showStoryPopup('${child.name || 'Child'}', 'is on an adventure to reach the trophy! Keep going, ${child.name || 'Child'}!')">
                <text x='0' y='8' font-size='32' text-anchor='middle' style='cursor: pointer;'>${child.avatar || '👤'}</text>
            </g>`;
        }).join('')}
    </svg>
    `;
}

// Utility Functions
function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

function convertToMilliseconds(duration, unit) {
    const multipliers = {
        hours: 60 * 60 * 1000,
        days: 24 * 60 * 60 * 1000,
        weeks: 7 * 24 * 60 * 60 * 1000
    };
    return duration * multipliers[unit];
}

function formatSimpleTime(milliseconds, type) {
    if (milliseconds <= 0) return type === 'countdown' ? 'Complete!' : '0 minutes';
    
    const hours = Math.floor(milliseconds / (60 * 60 * 1000));
    const minutes = Math.floor((milliseconds % (60 * 60 * 1000)) / (60 * 1000));
    
    if (hours > 0) {
        return `${hours} hour${hours !== 1 ? 's' : ''} ${minutes > 0 ? `${minutes} minute${minutes !== 1 ? 's' : ''}` : ''}`;
    }
    return `${minutes} minute${minutes !== 1 ? 's' : ''}`;
}

function formatTimeRemaining(milliseconds, goal = null) {
    if (milliseconds <= 0) return 'Complete!';
    
    // Handle waiting goals
    if (goal && goal.status === 'waiting') {
        if (goal.period === 'daily') {
            return 'Try again tomorrow!';
        } else if (goal.period === 'weekly') {
            return 'Try again next week!';
        }
    }
    
    const hours = Math.floor(milliseconds / (60 * 60 * 1000));
    const minutes = Math.floor((milliseconds % (60 * 60 * 1000)) / (60 * 1000));
    
    if (hours > 24) {
        const days = Math.floor(hours / 24);
        return `${days} day${days !== 1 ? 's' : ''} left`;
    } else if (hours > 0) {
        return `${hours} hour${hours !== 1 ? 's' : ''} left`;
    } else {
        return `${minutes} minute${minutes !== 1 ? 's' : ''} left`;
    }
}

function getEncouragement(percentage, type, goal = null) {
    // Handle waiting goals
    if (goal && goal.status === 'waiting') {
        if (goal.period === 'daily') {
            return '🌅 New day, new chance!';
        } else if (goal.period === 'weekly') {
            return '📅 Fresh week ahead!';
        }
    }
    
    if (percentage >= 100) return '🎉 Amazing job!';
    if (percentage >= 80) return '🌟 Almost there!';
    if (percentage >= 60) return '💪 You\'re doing great!';
    if (percentage >= 40) return '👍 Keep going!';
    if (percentage >= 20) return '🚀 You can do it!';
    return type === 'countdown' ? '💪 Stay strong!' : '🎯 Let\'s start!';
}

function getProgressEmoji(percentage, goal = null) {
    // Handle waiting goals
    if (goal && goal.status === 'waiting') {
        if (goal.period === 'daily') {
            return '🌅';
        } else if (goal.period === 'weekly') {
            return '📅';
        }
    }
    
    if (percentage >= 100) return '🏆';
    if (percentage >= 80) return '⭐';
    if (percentage >= 60) return '💪';
    if (percentage >= 40) return '👍';
    if (percentage >= 20) return '🚀';
    return '🎯';
}

// Session Management Functions
function saveSession(user, token) {
    const session = {
        user: user,
        token: token,
        loginTime: Date.now(),
        expiresAt: Date.now() + SESSION_DURATION
    };
    localStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

function loadSession() {
    const sessionData = localStorage.getItem(SESSION_KEY);
    if (!sessionData) return null;
    
    try {
        const session = JSON.parse(sessionData);
        const now = Date.now();
        
        // Check if session is expired
        if (now > session.expiresAt) {
            localStorage.removeItem(SESSION_KEY);
            return null;
        }
        
        return session;
    } catch (error) {
        console.error('Error loading session:', error);
        localStorage.removeItem(SESSION_KEY);
        return null;
    }
}

function clearSession() {
    localStorage.removeItem(SESSION_KEY);
}

function saveSelectedChild(childId) {
    if (childId) {
        localStorage.setItem(SELECTED_CHILD_KEY, childId);
    } else {
        localStorage.removeItem(SELECTED_CHILD_KEY);
    }
}

function loadSelectedChild() {
    return localStorage.getItem(SELECTED_CHILD_KEY);
}

// Authentication Functions
async function sendMagicCode() {
    const email = elements.emailInput.value.trim();
    if (!email || !email.includes('@')) {
        alert('Please enter a valid email address');
        return;
    }
    
    try {
        elements.sendCodeBtn.disabled = true;
        elements.sendCodeBtn.textContent = 'Sending...';
        
        await apiCall(API_ENDPOINTS.SEND_CODE, {
            method: 'POST',
            body: JSON.stringify({ email })
        });
        
        // Show verification form
        document.querySelector('.auth-form').classList.add('hidden');
        elements.verifyForm.classList.remove('hidden');
        
        alert('Check your email for the magic code!');
    } catch (error) {
        alert(`Failed to send code: ${error.message}`);
    } finally {
        elements.sendCodeBtn.disabled = false;
        elements.sendCodeBtn.textContent = 'Send Magic Code';
    }
}

async function verifyCode() {
    const code = elements.codeInput.value.trim();
    const email = elements.emailInput.value.trim();
    
    if (!code || !email) {
        alert('Please enter both email and code');
        return;
    }
    
    try {
        elements.verifyCodeBtn.disabled = true;
        elements.verifyCodeBtn.textContent = 'Verifying...';
        
        const response = await apiCall(API_ENDPOINTS.VERIFY_CODE, {
            method: 'POST',
            body: JSON.stringify({ email, code })
        });
        
        // Set authentication token and user
        authToken = response.token;
        currentUser = response.user;
        
        // Save session
        saveSession(currentUser, authToken);
        
        // Load user data
        await loadUserData();
        
        // Show dashboard
        showDashboard();
        
    } catch (error) {
        alert(`Verification failed: ${error.message}`);
    } finally {
        elements.verifyCodeBtn.disabled = false;
        elements.verifyCodeBtn.textContent = 'Verify Code';
    }
}

function logout() {
    // Clear timers
    activeTimers.forEach(timer => clearInterval(timer));
    activeTimers.clear();
    
    // Clear session and selected child
    clearSession();
    saveSelectedChild(null);
    
    // Clear state
    currentUser = null;
    authToken = null;
    children = [];
    goals = [];
    selectedChildId = null;
    
    // Show auth screen
    showAuthScreen();
}

// Data Management Functions
async function loadUserData() {
    try {
        // Try to load from server first
        if (isOnline && authToken) {
            const serverData = await apiCall(API_ENDPOINTS.GET_DATA);
            children = serverData.children || [];
            goals = serverData.goals || [];
            lastSyncTime = Date.now();
        } else {
            // Fall back to local data
            const localData = loadLocalData();
            children = localData.children || [];
            goals = localData.goals || [];
            lastSyncTime = loadSyncTime();
        }
        
        // Save to local storage
        saveLocalData();
        saveSyncTime();
        
        // Restore timers
        restartTimers();
    } catch (error) {
        console.error('Error loading user data:', error);
        // Fall back to local data
        const localData = loadLocalData();
        children = localData.children || [];
        goals = localData.goals || [];
        lastSyncTime = loadSyncTime();
        restartTimers();
    }
}

async function saveUserData() {
    // Always save to local storage first
    saveLocalData();
    
    // Try to save to server if online
    if (isOnline && authToken && currentUser) {
        try {
            await apiCall(API_ENDPOINTS.SAVE_DATA, {
                method: 'POST',
                body: JSON.stringify({
                    children: children,
                    goals: goals
                })
            });
            lastSyncTime = Date.now();
            saveSyncTime();
        } catch (error) {
            console.error('Failed to save to server:', error);
            // Data is still saved locally
        }
    }
}

// UI Management Functions
function showAuthScreen() {
    elements.authScreen.classList.add('active');
    elements.dashboardScreen.classList.remove('active');
    
    // Reset forms
    elements.emailInput.value = '';
    elements.codeInput.value = '';
    document.querySelector('.auth-form').classList.remove('hidden');
    elements.verifyForm.classList.add('hidden');
}

function showDashboard() {
    elements.authScreen.classList.remove('active');
    elements.dashboardScreen.classList.add('active');
    
    // Update user info
    elements.userEmail.textContent = currentUser.email;
    
    // Load selected child from storage
    const savedChildId = loadSelectedChild();
    if (savedChildId && children.find(c => c.id === savedChildId)) {
        selectedChildId = savedChildId;
    } else if (children.length > 0) {
        // Auto-select first child if no saved selection
        selectedChildId = children[0].id;
        saveSelectedChild(selectedChildId);
    }
    
    // Render child avatars
    renderChildAvatars();
    
    // Show goals
    renderGoals();
}

function selectChild(childId) {
    selectedChildId = childId;
    saveSelectedChild(childId);
    renderChildAvatars();
    renderGoals();
}

function renderChildAvatars() {
    const container = document.getElementById('child-avatars');
    container.innerHTML = '';
    children.forEach(child => {
        const div = document.createElement('div');
        div.className = 'child-avatar-container';
        div.style.setProperty('--child-color', child.color);
        // Avatar emoji
        const emoji = document.createElement('div');
        emoji.className = 'child-avatar-emoji' + (child.id === selectedChildId ? ' selected' : '');
        emoji.textContent = child.avatar || '🦊';
        emoji.onclick = () => selectChild(child.id);
        div.appendChild(emoji);
        // Edit button (monochrome SVG pencil, floats outside top right)
        const editBtn = document.createElement('button');
        editBtn.className = 'child-avatar-edit-btn';
        editBtn.title = 'Edit';
        editBtn.innerHTML = `<svg width='16' height='16' viewBox='0 0 20 20' fill='none' xmlns='http://www.w3.org/2000/svg'><path d='M14.7 2.29a1 1 0 0 1 1.42 0l1.59 1.59a1 1 0 0 1 0 1.42l-9.3 9.3-2.83.71.71-2.83 9.3-9.3zM3 17h14v2H3v-2z' fill='#888'/></svg>`;
        editBtn.onclick = (e) => {
            e.stopPropagation();
            openEditChildModal(child);
        };
        div.appendChild(editBtn);
        // Name
        const name = document.createElement('div');
        name.className = 'child-avatar-name';
        name.textContent = child.name;
        div.appendChild(name);
        container.appendChild(div);
    });
}

function openEditChildModal(child) {
    document.getElementById('edit-child-name').value = child.name;
    // Render avatar picker
    const avatarPicker = document.getElementById('edit-child-avatar-picker');
    avatarPicker.innerHTML = '';
    ICONS.forEach(icon => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'icon-option' + (icon === (child.avatar || '🦊') ? ' selected' : '');
        btn.textContent = icon;
        btn.onclick = () => {
            avatarPicker.querySelectorAll('.icon-option').forEach(b => b.classList.remove('selected'));
            btn.classList.add('selected');
        };
        avatarPicker.appendChild(btn);
    });
    // Render color picker
    const colorPicker = document.getElementById('edit-child-color-picker');
    colorPicker.innerHTML = '';
    COLORS.forEach(color => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'color-option' + (color === child.color ? ' selected' : '');
        btn.style.setProperty('--color', color);
        btn.onclick = () => {
            colorPicker.querySelectorAll('.color-option').forEach(b => b.classList.remove('selected'));
            btn.classList.add('selected');
        };
        colorPicker.appendChild(btn);
    });
    // Save handler
    const form = document.getElementById('edit-child-form');
    form.onsubmit = function(e) {
        e.preventDefault();
        child.name = document.getElementById('edit-child-name').value;
        child.avatar = avatarPicker.querySelector('.icon-option.selected').textContent;
        child.color = colorPicker.querySelector('.color-option.selected').style.getPropertyValue('--color');
        saveUserData();
        renderChildAvatars();
        renderGoals();
        hideModal('edit-child-modal');
    };
    showModal('edit-child-modal');
}

function renderGoals() {
    if (!selectedChildId) {
        elements.goalsList.innerHTML = '<p style="text-align: center; color: #666; padding: 40px;">Select a child to see their goals</p>';
        return;
    }
    
    // Get all goals that include the selected child
    let relevantGoals = goals.filter(goal => goal.childId === selectedChildId);
    
    // Also include goals from groups that contain the selected child
    const groupIds = relevantGoals.map(goal => goal.groupId).filter(Boolean);
    const groupGoals = goals.filter(goal => groupIds.includes(goal.groupId));
    
    // Combine and deduplicate by groupId, keeping one goal per group
    const allRelevantGoals = [...relevantGoals, ...groupGoals];
    const uniqueGoals = [];
    const seenGroupIds = new Set();
    
    allRelevantGoals.forEach(goal => {
        if (goal.groupId) {
            if (!seenGroupIds.has(goal.groupId)) {
                uniqueGoals.push(goal);
                seenGroupIds.add(goal.groupId);
            }
        } else {
            // For goals without groupId, include them directly
            uniqueGoals.push(goal);
        }
    });
    
    if (uniqueGoals.length === 0) {
        elements.goalsList.innerHTML = '<p style="text-align: center; color: #666; padding: 40px;">No goals yet. Create your first goal!</p>';
        return;
    }
    
    elements.goalsList.innerHTML = uniqueGoals.map(goal => createGoalCard(goal)).join('');
}

function calculateMilestones(goal) {
    let numMilestones;
    let totalDuration;
    
    // Set number of milestones based on goal type
    if (goal.type === 'daily') {
        numMilestones = 6; // 6 milestones for a day
        totalDuration = 24 * 60 * 60 * 1000; // 24 hours
    } else if (goal.type === 'weekly') {
        numMilestones = 7; // 7 milestones for a week (one per day)
        totalDuration = 7 * 24 * 60 * 60 * 1000; // 7 days
    } else {
        // For timer goals, calculate based on duration
        totalDuration = goal.totalDuration;
        if (!totalDuration || isNaN(totalDuration)) {
            totalDuration = 60 * 60 * 1000; // Default to 1 hour
        }
        
        if (totalDuration <= 60 * 60 * 1000) { // 1 hour or less
            numMilestones = 3;
        } else if (totalDuration <= 24 * 60 * 60 * 1000) { // 1 day or less
            numMilestones = 6;
        } else if (totalDuration <= 7 * 24 * 60 * 60 * 1000) { // 1 week or less
            numMilestones = 12;
        } else {
            numMilestones = 24;
        }
    }
    
    const milestones = [];
    
    // Create milestones with spacing to avoid overlap with start/end
    const spacing = 80 / (numMilestones + 1); // Leave 10% space on each end
    
    for (let i = 0; i < numMilestones; i++) {
        const percentage = 10 + (spacing * (i + 1)); // Start at 10%, end at 90%
        milestones.push({
            index: i,
            time: (totalDuration / numMilestones) * i,
            percentage: percentage
        });
    }
    
    return milestones;
}

function getGoalChildren(goal) {
    // Check if this goal is part of a group by looking for other goals with the same name and type
    const relatedGoals = goals.filter(g => 
        g.name === goal.name && 
        g.type === goal.type && 
        g.id !== goal.id &&
        Math.abs(g.createdAt - goal.createdAt) < 5000 // Created within 5 seconds
    );
    
    if (relatedGoals.length > 0 || goal.groupId) {
        // This is a group goal - find all related goals
        const groupId = goal.groupId || goal.id;
        const allRelatedGoals = [goal, ...relatedGoals];
        const childIds = Array.from(new Set(allRelatedGoals.map(g => g.childId)));
        const goalChildren = children.filter(c => childIds.includes(c.id));
        return goalChildren;
    } else {
        const goalChild = children.filter(c => c.id === goal.childId);
        return goalChild;
    }
}

function createGoalCard(goal) {
    const progress = calculateProgress(goal);
    const theme = STORY_THEMES[goal.themeType || goal.type];
    const milestones = calculateMilestones(goal);
    const completedMilestones = milestones.filter((_,i) => progress >= (100*(i+1)/(milestones.length+1)));
    // Avatars row (for header)
    const goalChildren = getGoalChildren(goal);
    const avatarsRow = `<div class='goal-avatars-row-inline'>${goalChildren.map(c => `<span class='goal-avatar-emoji' style='background:${c.color}'>${c.avatar || '🦊'}</span>`).join('')}</div>`;
    return `
        <div class="goal-card" data-goal-id="${goal.id}" data-status="${goal.status}" style="--goal-color: ${goal.color}; cursor: pointer;" onclick="openGoalDetail('${goal.id}')">
            <div class="goal-header">
                <div class="goal-title">${goal.name}</div>
                ${avatarsRow}
            </div>
            <div class="story-trail">
                <div class="trail-svg-container">${createTrailSVG(goal, progress)}</div>
                <div class="trail-progress-text">
                    ${goal.status === 'waiting' ? 
                        `Try again ${goal.period === 'daily' ? 'tomorrow' : 'next week'}!` :
                        `${completedMilestones.length} of ${milestones.length} ${theme.trailItemName}${milestones.length !== 1 ? 's' : ''} collected`
                    }
                </div>
            </div>
        </div>
    `;
}

// Modal Functions
function showModal(modalId) {
    const modal = document.getElementById(modalId);
    modal.classList.add('active');
    // Initialize pickers if needed
    if (modalId === 'add-child-modal') {
        initializeColorPicker(elements.childColorPicker, COLORS[0]);
        initializeAvatarPicker(document.getElementById('add-child-avatar-picker'), ICONS[0]);
    } else if (modalId === 'add-goal-modal') {
        initializeColorPicker(elements.goalColorPicker, COLORS[0]);
        renderChildMultiselect();
        initializeGoalTypeSections();
    }
    if (modalId === 'add-child-modal') {
        elements.addChildForm.addEventListener('submit', handleAddChildSubmit, { once: true });
    }
    
    // Attach modal close event listeners
    attachModalEventListeners(modalId);
}

function hideModal(modalId) {
    const modal = document.getElementById(modalId);
    modal.classList.remove('active');
    
    // Reset forms
    if (modalId === 'add-child-modal') {
        elements.addChildForm.reset();
    } else if (modalId === 'add-goal-modal') {
        elements.addGoalForm.reset();
    }
}

function attachModalEventListeners(modalId) {
    const modal = document.getElementById(modalId);
    
    // Close button event listeners
    const closeBtn = modal.querySelector('.close-btn');
    if (closeBtn) {
        closeBtn.addEventListener('click', () => hideModal(modalId), { once: true });
    }
    
    // Cancel button event listeners
    const cancelBtn = modal.querySelector('.btn-secondary[data-modal]');
    if (cancelBtn) {
        cancelBtn.addEventListener('click', () => hideModal(modalId), { once: true });
    }
    
    // Click outside modal to close
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            hideModal(modalId);
        }
    }, { once: true });
}

function renderChildMultiselect() {
    const container = document.getElementById('goal-child-multiselect');
    if (!container) return;
    
    container.innerHTML = '';
    
    if (children.length === 0) {
        container.innerHTML = '<p style="color: #666; text-align: center; padding: 20px;">No children added yet. Please add a child first.</p>';
        return;
    }
    
    children.forEach(child => {
        const childOption = document.createElement('div');
        childOption.className = 'child-option';
        childOption.innerHTML = `
            <div class="child-avatar-selector" data-child-id="${child.id}" style="display: flex; flex-direction: column; align-items: center; gap: 4px; cursor: pointer; padding: 12px; border-radius: 12px; transition: all 0.2s; border: 2px solid transparent;">
                <span class="child-avatar" style="font-size: 32px; filter: grayscale(100%); opacity: 0.5; transition: all 0.2s;">${child.avatar}</span>
                <span class="child-name" style="color: ${child.color}; font-weight: 500; font-size: 12px; text-align: center;">${child.name}</span>
                <input type="checkbox" name="goal-children" value="${child.id}" style="display: none;">
            </div>
        `;
        
        // Add click handler for avatar selection
        const avatarSelector = childOption.querySelector('.child-avatar-selector');
        const checkbox = childOption.querySelector('input[type="checkbox"]');
        const avatar = childOption.querySelector('.child-avatar');
        
        avatarSelector.addEventListener('click', () => {
            const isSelected = checkbox.checked;
            checkbox.checked = !isSelected;
            
            if (checkbox.checked) {
                // Selected state
                avatar.style.filter = 'grayscale(0%)';
                avatar.style.opacity = '1';
                avatarSelector.style.borderColor = child.color;
                avatarSelector.style.backgroundColor = `${child.color}20`;
            } else {
                // Unselected state
                avatar.style.filter = 'grayscale(100%)';
                avatar.style.opacity = '0.5';
                avatarSelector.style.borderColor = 'transparent';
                avatarSelector.style.backgroundColor = 'transparent';
            }
        });
        
        container.appendChild(childOption);
    });
}

function initializeColorPicker(container, defaultColor) {
    container.innerHTML = '';
    COLORS.forEach(color => {
        const option = document.createElement('div');
        option.className = 'color-option';
        option.style.setProperty('--color', color);
        if (color === defaultColor) option.classList.add('selected');
        
        option.addEventListener('click', () => {
            container.querySelectorAll('.color-option').forEach(opt => opt.classList.remove('selected'));
            option.classList.add('selected');
        });
        
        container.appendChild(option);
    });
}

function initializeAvatarPicker(container, defaultAvatar) {
    container.innerHTML = '';
    ICONS.forEach(icon => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'icon-option' + (icon === defaultAvatar ? ' selected' : '');
        btn.textContent = icon;
        btn.onclick = () => {
            container.querySelectorAll('.icon-option').forEach(b => b.classList.remove('selected'));
            btn.classList.add('selected');
        };
        container.appendChild(btn);
    });
}

// Goal Logic Functions
function createGoal(goalData) {
    if (goalData.children.length === 0) {
        alert('Please select at least one child for this goal');
        return;
    }
    
    // Create a group ID to link related goals together
    const groupId = generateId();
    
    // Create a goal for each selected child
    goalData.children.forEach(childId => {
        // Set appropriate start time based on goal type
        let startTime;
        if (goalData.type === 'daily') {
            const now = new Date();
            startTime = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
        } else if (goalData.type === 'weekly') {
            startTime = getStartOfWeek(new Date()).getTime();
        } else {
            startTime = Date.now();
        }
        
        const goal = {
            id: generateId(),
            childId: childId,
            groupId: groupId, // Link goals together
            name: goalData.name,
            type: goalData.type,
            color: goalData.color,
            status: 'active',
            startTime: startTime,
            createdAt: Date.now()
        };
        
        // Add timer-specific properties if it's a timer goal
        if (goalData.type === 'timer') {
            goal.duration = goalData.duration;
            goal.unit = goalData.unit;
            goal.timerType = goalData.timerType;
            goal.totalDuration = convertToMilliseconds(goalData.duration, goalData.unit);
            // For timer goals, use the timerType (countdown/countup) as the theme key
            goal.themeType = goalData.timerType;
        } else {
            // For daily/weekly goals, use the goal type as the theme key
            goal.themeType = goalData.type;
        }
        
        goals.push(goal);
        
        // Start timer for the goal if it's a timer type
        if (goalData.type === 'timer') {
            startGoalTimer(goal);
        }
    });
    
    saveUserData();
    
    // Update UI
    renderGoals();
    hideModal('add-goal-modal');
}

function calculateProgress(goal) {
    // For group goals, calculate average progress across all children
    if (goal.groupId) {
        const groupGoals = goals.filter(g => g.groupId === goal.groupId);
        const individualProgresses = groupGoals.map(g => calculateIndividualProgress(g));
        const averageProgress = individualProgresses.reduce((sum, p) => sum + p, 0) / individualProgresses.length;
        return averageProgress;
    } else {
        return calculateIndividualProgress(goal);
    }
}

function calculateIndividualProgress(goal) {
    if (goal.status === 'completed') return 100;
    if (goal.status === 'paused') return goal.pausedProgress ? (goal.pausedProgress / goal.totalDuration) * 100 : 0;
    if (goal.status === 'waiting') return 0;
    
    // Handle different goal types
    if (goal.type === 'daily') {
        return calculateDailyProgress(goal);
    } else if (goal.type === 'weekly') {
        return calculateWeeklyProgress(goal);
    } else if (goal.type === 'countdown' || goal.type === 'countup') {
        // Timer goals
        const elapsed = Date.now() - goal.startTime;
        if (goal.type === 'countdown') {
            const remaining = goal.totalDuration - elapsed;
            return Math.max(0, Math.min(100, ((goal.totalDuration - remaining) / goal.totalDuration) * 100));
        } else {
            return Math.min(100, (elapsed / goal.totalDuration) * 100);
        }
    } else {
        // Default fallback
        return 0;
    }
}

function calculateDailyProgress(goal) {
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startTime = new Date(goal.startTime);
    const startOfGoalDay = new Date(startTime.getFullYear(), startTime.getMonth(), startTime.getDate());
    
    // If it's a different day, the goal should be reset
    if (startOfDay.getTime() !== startOfGoalDay.getTime()) {
        // console.log('Daily goal reset - different day:', goal.name);
        return 0;
    }
    
    // Calculate progress within the current day (0-100%)
    const elapsedToday = now.getTime() - startOfDay.getTime();
    const dayDuration = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
    const progress = Math.min(100, (elapsedToday / dayDuration) * 100);
    
    // console.log(`Daily goal "${goal.name}" progress: ${progress.toFixed(1)}% (${(elapsedToday/1000/60/60).toFixed(1)} hours elapsed)`);
    return progress;
}

function calculateWeeklyProgress(goal) {
    const now = new Date();
    const startOfWeek = getStartOfWeek(now);
    const startTime = new Date(goal.startTime);
    const startOfGoalWeek = getStartOfWeek(startTime);
    
    // If it's a different week, the goal should be reset
    if (startOfWeek.getTime() !== startOfGoalWeek.getTime()) {
        // console.log('Weekly goal reset - different week:', goal.name);
        return 0;
    }
    
    // Calculate progress within the current week (0-100%)
    const elapsedThisWeek = now.getTime() - startOfWeek.getTime();
    const weekDuration = 7 * 24 * 60 * 60 * 1000; // 7 days in milliseconds
    const progress = Math.min(100, (elapsedThisWeek / weekDuration) * 100);
    
    // console.log(`Weekly goal "${goal.name}" progress: ${progress.toFixed(1)}% (${(elapsedThisWeek/1000/60/60/24).toFixed(1)} days elapsed)`);
    return progress;
}

function getStartOfWeek(date) {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Adjust when day is Sunday
    return new Date(d.setDate(diff));
}

function startGoalTimer(goal) {
    if (goal.status !== 'active') return;
    
    const milestones = calculateMilestones(goal);
    let lastMilestoneIndex = -1;
    
    const timer = setInterval(() => {
        const progress = calculateProgress(goal);
        
        // Check for milestone completion
        const currentMilestoneIndex = milestones.findIndex(m => m.percentage > progress);
        if (currentMilestoneIndex !== lastMilestoneIndex && currentMilestoneIndex > lastMilestoneIndex) {
            // Milestone reached!
            celebrateMilestone(goal, milestones[currentMilestoneIndex - 1]);
            lastMilestoneIndex = currentMilestoneIndex;
        }
        
        // Check if goal is completed
        if (progress >= 100 && goal.status === 'active') {
            completeGoal(goal);
        }
        
        // Update UI if this goal is currently displayed
        if (selectedChildId === goal.childId || (goal.groupId && goals.some(g => g.groupId === goal.groupId && g.childId === selectedChildId))) {
            renderGoals();
        }
    }, 1000);
    
    activeTimers.set(goal.id, timer);
}

// Milestone celebration tracking
function hasMilestoneCelebrationBeenShown(goalId, milestoneIndex) {
    const data = JSON.parse(localStorage.getItem('milestoneCelebrations') || '{}');
    return data[goalId] && data[goalId].includes(milestoneIndex);
}
function markMilestoneCelebrationShown(goalId, milestoneIndex) {
    const data = JSON.parse(localStorage.getItem('milestoneCelebrations') || '{}');
    if (!data[goalId]) data[goalId] = [];
    if (!data[goalId].includes(milestoneIndex)) data[goalId].push(milestoneIndex);
    localStorage.setItem('milestoneCelebrations', JSON.stringify(data));
}

// Update celebrateMilestone to check and mark
function celebrateMilestone(goal, milestone) {
    const theme = STORY_THEMES[goal.themeType || goal.type];
    // Only show if not already shown
    if (hasMilestoneCelebrationBeenShown(goal.id, milestone.index)) return;
    markMilestoneCelebrationShown(goal.id, milestone.index);
    // Create celebration notification
    const celebration = document.createElement('div');
    celebration.className = 'milestone-celebration';
    celebration.innerHTML = `
        <div class="celebration-content">
            <div class="celebration-emoji">${theme.trailItem}</div>
            <div class="celebration-text">${theme.trailItemName} collected!</div>
        </div>
    `;
    // Style the celebration
    celebration.style.cssText = `
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: white;
        padding: 20px;
        border-radius: 15px;
        box-shadow: 0 10px 30px rgba(0,0,0,0.3);
        z-index: 3000;
        animation: milestoneCelebration 1s ease-out;
        pointer-events: none;
    `;
    document.body.appendChild(celebration);
    setTimeout(() => {
        if (celebration.parentNode) {
            celebration.parentNode.removeChild(celebration);
        }
    }, 1000);
    playCelebrationSound();
}

function playCelebrationSound() {
    // Create a simple chime sound using Web Audio API
    try {
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
        oscillator.frequency.setValueAtTime(1000, audioContext.currentTime + 0.1);
        oscillator.frequency.setValueAtTime(1200, audioContext.currentTime + 0.2);
        
        gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
        
        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 0.3);
    } catch (error) {
        // Fallback: no sound if Web Audio API is not supported
        // console.log('Audio not supported');
    }
}

function showStoryPopup(characterName, story) {
    // Create story popup
    const popup = document.createElement('div');
    popup.className = 'story-popup';
    // Find the child to get their avatar
    const child = children.find(c => c.name === characterName);
    const avatar = child ? child.avatar : '👤';
    popup.innerHTML = `
        <div class="story-popup-content">
            <div class="story-popup-character">${avatar}</div>
            <div class="story-popup-text">${characterName} ${story}</div>
            <button class="story-popup-close" onclick="this.parentElement.parentElement.remove()">Got it!</button>
        </div>
    `;
    document.body.appendChild(popup);
    // Auto-remove after 5 seconds
    setTimeout(() => {
        if (popup.parentNode) {
            popup.parentNode.removeChild(popup);
        }
    }, 5000);
}

function restartTimers() {
    goals.forEach(goal => {
        if (goal.status === 'active') {
            startGoalTimer(goal);
        } else if (goal.status === 'waiting' && goal.nextStartTime) {
            const timeUntilNext = goal.nextStartTime - Date.now();
            if (timeUntilNext > 0) {
                const timer = setTimeout(() => {
                    goal.status = 'active';
                    goal.startTime = Date.now();
                    goal.nextStartTime = null;
                    saveUserData();
                    startGoalTimer(goal);
                    renderGoals();
                }, timeUntilNext);
                activeTimers.set(`waiting_${goal.id}`, timer);
            } else {
                goal.status = 'active';
                goal.startTime = Date.now();
                goal.nextStartTime = null;
                saveUserData();
                startGoalTimer(goal);
            }
        }
    });
}

function handleAddChildSubmit(e) {
    // console.log('addChildForm submit');
    e.preventDefault();
    const formData = new FormData(e.target);
    const avatarPicker = document.getElementById('add-child-avatar-picker');
    const child = {
        id: generateId(),
        name: formData.get('child-name'),
        avatar: avatarPicker.querySelector('.icon-option.selected').textContent,
        color: elements.childColorPicker.querySelector('.color-option.selected').style.getPropertyValue('--color'),
        createdAt: Date.now()
    };
    children.push(child);
    saveUserData();
    // Select the newly added child
    selectChild(child.id);
    hideModal('add-child-modal');
}

document.addEventListener('DOMContentLoaded', () => {
    // Set up network status monitoring
    window.addEventListener('online', updateOnlineStatus);
    window.addEventListener('offline', updateOnlineStatus);
    
    // Restore session if available
    const savedSession = loadSession();
    if (savedSession) {
        currentUser = savedSession.user;
        authToken = savedSession.token;
        loadUserData();
        showDashboard();
    }

    elements.sendCodeBtn.addEventListener('click', sendMagicCode);
    elements.verifyCodeBtn.addEventListener('click', verifyCode);
    elements.addChildForm.addEventListener('submit', handleAddChildSubmit, { once: true });
    elements.addGoalForm.addEventListener('submit', function(e) {
        e.preventDefault();
        const formData = new FormData(e.target);
        
        // Get selected children
        const selectedChildren = Array.from(e.target.querySelectorAll('input[name="goal-children"]:checked'))
            .map(checkbox => checkbox.value);
        
        if (selectedChildren.length === 0) {
            alert('Please select at least one child for this goal');
            return;
        }
        
        // Get goal type
        const goalType = e.target.querySelector('input[name="goal-type-radio"]:checked').value;
        
        // Get color
        const color = elements.goalColorPicker.querySelector('.color-option.selected').style.getPropertyValue('--color');
        
        // Create goal data object
        const goalData = {
            name: formData.get('goal-name'),
            type: goalType,
            color: color,
            children: selectedChildren
        };
        
        // Add timer-specific data if it's a timer goal
        if (goalType === 'timer') {
            goalData.duration = parseInt(document.getElementById('goal-timer-duration').value);
            goalData.unit = document.getElementById('goal-timer-unit').value;
            goalData.timerType = document.getElementById('goal-timer-direction').value;
        }
        
        if (editingGoalId) {
            // --- EDIT EXISTING GOAL(S) ---
            const goal = goals.find(g => g.id === editingGoalId);
            if (!goal) return;
            // If group, update all in group
            const groupId = goal.groupId;
            let toUpdate = groupId ? goals.filter(g => g.groupId === groupId) : [goal];
            // Remove children that are no longer selected
            toUpdate = toUpdate.filter(g => selectedChildren.includes(g.childId));
            // Remove goals for children that are no longer selected
            goals.forEach((g, i) => {
                if (groupId && g.groupId === groupId && !selectedChildren.includes(g.childId)) {
                    goals.splice(i, 1);
                }
            });
            // Update existing goals
            toUpdate.forEach(g => {
                g.name = goalData.name;
                g.type = goalData.type;
                g.color = goalData.color;
                if (goalType === 'timer') {
                    g.duration = goalData.duration;
                    g.unit = goalData.unit;
                    g.timerType = goalData.timerType;
                    g.totalDuration = convertToMilliseconds(goalData.duration, goalData.unit);
                    g.themeType = goalData.timerType;
                } else {
                    g.duration = undefined;
                    g.unit = undefined;
                    g.timerType = undefined;
                    g.totalDuration = undefined;
                    g.themeType = goalData.type;
                }
            });
            // Add new goals for newly selected children
            selectedChildren.forEach(childId => {
                if (!toUpdate.some(g => g.childId === childId)) {
                    // Set appropriate start time based on goal type
                    let startTime;
                    if (goalData.type === 'daily') {
                        const now = new Date();
                        startTime = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
                    } else if (goalData.type === 'weekly') {
                        startTime = getStartOfWeek(new Date()).getTime();
                    } else {
                        startTime = Date.now();
                    }
                    const newGoal = {
                        id: generateId(),
                        childId: childId,
                        groupId: groupId,
                        name: goalData.name,
                        type: goalData.type,
                        color: goalData.color,
                        status: 'active',
                        startTime: startTime,
                        createdAt: Date.now(),
                        themeType: goalType === 'timer' ? goalData.timerType : goalData.type
                    };
                    if (goalType === 'timer') {
                        newGoal.duration = goalData.duration;
                        newGoal.unit = goalData.unit;
                        newGoal.timerType = goalData.timerType;
                        newGoal.totalDuration = convertToMilliseconds(goalData.duration, goalData.unit);
                    }
                    goals.push(newGoal);
                }
            });
            saveUserData();
            editingGoalId = null;
            renderGoals();
            hideModal('add-goal-modal');
        } else {
            // --- CREATE NEW GOAL(S) ---
            createGoal(goalData);
        }
    });

    elements.addChildBtn.addEventListener('click', () => showModal('add-child-modal'));
    elements.addGoalBtn.addEventListener('click', () => showModal('add-goal-modal'));
    
    // Goal detail action buttons
    elements.editGoalBtn.addEventListener('click', handleEditGoal);
    elements.pauseGoalBtn.addEventListener('click', handlePauseGoal);
    elements.resetGoalBtn.addEventListener('click', handleResetGoal);
    elements.deleteGoalBtn.addEventListener('click', handleDeleteGoal);
    
    // Confirmation modal action button
    elements.confirmAction.addEventListener('click', handleConfirmAction);
    
    // Handle goal type radio button changes
    document.addEventListener('change', function(e) {
        if (e.target.name === 'goal-type-radio') {
            updateGoalTypeSections(e.target.value);
        }
    });
    elements.logoutBtn.addEventListener('click', logout);
});

function initializeGoalTypeSections() {
    // Get the currently selected goal type
    const selectedRadio = document.querySelector('input[name="goal-type-radio"]:checked');
    if (selectedRadio) {
        updateGoalTypeSections(selectedRadio.value);
    }
}

function updateGoalTypeSections(goalType) {
    const timerOptions = document.getElementById('timer-options-group');
    const repeatGroup = document.getElementById('repeat-group');
    
    if (goalType === 'timer') {
        timerOptions.style.display = 'block';
        repeatGroup.style.display = 'none';
    } else {
        timerOptions.style.display = 'none';
        repeatGroup.style.display = 'block';
    }
}

function openGoalDetail(goalId) {
    // Find the goal (could be part of a group)
    const goal = goals.find(g => g.id === goalId);
    if (!goal) return;
    
    // If this is a group goal, get the representative goal
    const representativeGoal = goal.groupId ? 
        goals.find(g => g.groupId === goal.groupId) : goal;
    
    // Populate the goal detail modal
    populateGoalDetailModal(representativeGoal);
    
    // Show the modal
    showModal('goal-detail-modal');
}

function populateGoalDetailModal(goal) {
    const progress = calculateProgress(goal);
    const theme = STORY_THEMES[goal.themeType || goal.type];
    const goalChildren = getGoalChildren(goal);
    
    // Update modal content
    elements.detailGoalName.textContent = goal.name;
    // Render SVG with id for progress fill
    const trailContainer = document.querySelector('#goal-detail-modal .trail-svg-container');
    if (trailContainer) {
        trailContainer.innerHTML = createTrailSVG(goal, progress, true);
    }
    // Now get the progress fill element
    const progressFill = document.getElementById('detail-progress-fill');
    if (progressFill) {
        progressFill.style.strokeDasharray = `${progress * 3.14159}, 100`;
    }
    if (elements.detailProgressEmoji) elements.detailProgressEmoji.textContent = getProgressEmoji(progress, goal);
    if (elements.detailProgressText) elements.detailProgressText.textContent = `${Math.round(progress)}%`;
    
    // Update time information
    if (goal.type === 'timer') {
        const remaining = goal.totalDuration - (Date.now() - goal.startTime);
        if (elements.detailGoalTime) elements.detailGoalTime.textContent = formatTimeRemaining(remaining, goal);
    } else if (goal.type === 'daily') {
        const now = new Date();
        const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const elapsedToday = now.getTime() - startOfDay.getTime();
        const remaining = (24 * 60 * 60 * 1000) - elapsedToday;
        if (elements.detailGoalTime) elements.detailGoalTime.textContent = formatTimeRemaining(remaining, goal);
    } else if (goal.type === 'weekly') {
        const now = new Date();
        const startOfWeek = getStartOfWeek(now);
        const elapsedThisWeek = now.getTime() - startOfWeek.getTime();
        const remaining = (7 * 24 * 60 * 60 * 1000) - elapsedThisWeek;
        if (elements.detailGoalTime) elements.detailGoalTime.textContent = formatTimeRemaining(remaining, goal);
    }
    
    // Update encouragement
    if (elements.detailEncouragement) elements.detailEncouragement.textContent = getEncouragement(progress, goal.type, goal);
    
    // Update children avatars
    const childrenAvatars = goalChildren.map(c => 
        `<span class="goal-avatar-emoji" style="background:${c.color}">${c.avatar || '🦊'}</span>`
    ).join('');
    
    const avatarsContainer = document.querySelector('#goal-detail-modal .goal-avatars-row');
    if (avatarsContainer) {
        avatarsContainer.innerHTML = childrenAvatars;
    }
    
    // Store the goal ID for action buttons
    document.getElementById('goal-detail-modal').setAttribute('data-current-goal-id', goal.id);
}

function handleEditGoal() {
    const goalId = document.getElementById('goal-detail-modal').getAttribute('data-current-goal-id');
    const goal = goals.find(g => g.id === goalId);
    if (!goal) return;
    editingGoalId = goalId;

    // Pre-fill the add-goal modal with goal data
    const form = elements.addGoalForm;
    form.reset();
    form.querySelector('#goal-name').value = goal.name;
    // Set color
    const colorOptions = elements.goalColorPicker.querySelectorAll('.color-option');
    colorOptions.forEach(opt => {
        if (opt.style.getPropertyValue('--color') === goal.color) {
            opt.classList.add('selected');
        } else {
            opt.classList.remove('selected');
        }
    });
    // Set type
    const typeRadio = form.querySelector(`input[name="goal-type-radio"][value="${goal.type}"]`);
    if (typeRadio) typeRadio.checked = true;
    updateGoalTypeSections(goal.type);
    // Set timer fields if timer
    if (goal.type === 'timer') {
        form.querySelector('#goal-timer-duration').value = goal.duration || '';
        form.querySelector('#goal-timer-unit').value = goal.unit || 'minutes';
        form.querySelector('#goal-timer-direction').value = goal.timerType || 'countdown';
    }

    // Show the modal first
    hideModal('goal-detail-modal');
    showModal('add-goal-modal');
    
    // Now set children after the modal is shown and multiselect is rendered
    setTimeout(() => {
        const childCheckboxes = form.querySelectorAll('input[name="goal-children"]');
        const groupChildren = getGoalChildren(goal).map(c => c.id);
        childCheckboxes.forEach(cb => {
            const isSelected = groupChildren.includes(cb.value);
            cb.checked = isSelected;
            
            // Update visual state
            const avatarSelector = cb.closest('.child-avatar-selector');
            if (avatarSelector) {
                const avatar = avatarSelector.querySelector('.child-avatar');
                const child = children.find(c => c.id === cb.value);
                if (child) {
                    if (isSelected) {
                        // Selected state
                        avatar.style.filter = 'grayscale(0%)';
                        avatar.style.opacity = '1';
                        avatarSelector.style.borderColor = child.color;
                        avatarSelector.style.backgroundColor = `${child.color}20`;
                    } else {
                        // Unselected state
                        avatar.style.filter = 'grayscale(100%)';
                        avatar.style.opacity = '0.5';
                        avatarSelector.style.borderColor = 'transparent';
                        avatarSelector.style.backgroundColor = 'transparent';
                    }
                }
            }
        });
    }, 100);
}

function handlePauseGoal() {
    const goalId = document.getElementById('goal-detail-modal').getAttribute('data-current-goal-id');
    const goal = goals.find(g => g.id === goalId);
    if (!goal) return;
    
    if (goal.status === 'active') {
        goal.status = 'paused';
        elements.pauseGoalBtn.textContent = '▶️ Resume';
    } else if (goal.status === 'paused') {
        goal.status = 'active';
        elements.pauseGoalBtn.textContent = '⏸️ Pause';
    }
    
    saveUserData();
    renderGoals();
}

function handleResetGoal() {
    const goalId = document.getElementById('goal-detail-modal').getAttribute('data-current-goal-id');
    const goal = goals.find(g => g.id === goalId);
    if (!goal) return;
    
    // Show confirmation modal
    elements.confirmTitle.textContent = 'Reset Goal';
    elements.confirmMessage.textContent = `Are you sure you want to reset "${goal.name}"? This will start the goal over from the beginning.`;
    elements.confirmAction.textContent = 'Reset Goal';
    elements.confirmAction.className = 'btn-secondary';
    
    // Store the goal ID for the confirmation action
    document.getElementById('confirm-modal').setAttribute('data-action-goal-id', goalId);
    document.getElementById('confirm-modal').setAttribute('data-action-type', 'reset');
    
    hideModal('goal-detail-modal');
    showModal('confirm-modal');
}

function handleDeleteGoal() {
    const goalId = document.getElementById('goal-detail-modal').getAttribute('data-current-goal-id');
    const goal = goals.find(g => g.id === goalId);
    if (!goal) return;
    
    // Show confirmation modal
    elements.confirmTitle.textContent = 'Delete Goal';
    elements.confirmMessage.textContent = `Are you sure you want to delete "${goal.name}"? This action cannot be undone.`;
    elements.confirmAction.textContent = 'Delete Goal';
    elements.confirmAction.className = 'btn-danger';
    
    // Store the goal ID for the confirmation action
    document.getElementById('confirm-modal').setAttribute('data-action-goal-id', goalId);
    document.getElementById('confirm-modal').setAttribute('data-action-type', 'delete');
    
    hideModal('goal-detail-modal');
    showModal('confirm-modal');
}

function handleConfirmAction() {
    const goalId = document.getElementById('confirm-modal').getAttribute('data-action-goal-id');
    const actionType = document.getElementById('confirm-modal').getAttribute('data-action-type');
    const goal = goals.find(g => g.id === goalId);
    
    if (!goal) {
        hideModal('confirm-modal');
        return;
    }
    
    if (actionType === 'reset') {
        // Reset the goal
        goal.startTime = Date.now();
        goal.status = 'active';
        
        // If it's a group goal, reset all related goals
        if (goal.groupId) {
            goals.filter(g => g.groupId === goal.groupId).forEach(g => {
                g.startTime = Date.now();
                g.status = 'active';
            });
        }
        
        saveUserData();
        renderGoals();
        
    } else if (actionType === 'delete') {
        // Delete the goal
        if (goal.groupId) {
            // Delete all goals in the group
            goals = goals.filter(g => g.groupId !== goal.groupId);
        } else {
            // Delete single goal
            goals = goals.filter(g => g.id !== goalId);
        }
        
        saveUserData();
        renderGoals();
    }
    
    hideModal('confirm-modal');
}