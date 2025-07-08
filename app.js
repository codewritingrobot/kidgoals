// KidGoals PWA - Clean Client-Server API Interface

// Version information - dynamically generated from Git
const APP_VERSION = window.GIT_VERSION ? window.GIT_VERSION.version : '2.0.0';

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
const API_BASE_URL = 'https://api.mcsoko.com';
const API_ENDPOINTS = {
    SEND_CODE: '/api/auth/send-code',
    VERIFY_CODE: '/api/auth/verify-code',
    CHILDREN: '/api/children',
    GOALS: '/api/goals',
    USER_DATA: '/api/user/data',
    HEALTH: '/health'
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
let isOnline = navigator.onLine;

// Service Worker Management
let swRegistration = null;
let swUpdateAvailable = false;

// Session Management
const SESSION_KEY = 'kidgoals_session';
const SESSION_DURATION = 7 * 24 * 60 * 60 * 1000; // 7 days
const SELECTED_CHILD_KEY = 'kidgoals_selectedChild';

// Service Worker Management Functions
function registerServiceWorker() {
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('/sw.js')
            .then(registration => {
                swRegistration = registration;
                console.log('Service Worker registered successfully:', registration);
                
                // Listen for controller changes (new SW takes control)
                navigator.serviceWorker.addEventListener('controllerchange', () => {
                    console.log('Service Worker controller changed - reloading app');
                    showUpdateNotification();
                });
                
                // Listen for messages from service worker
                navigator.serviceWorker.addEventListener('message', handleServiceWorkerMessage);
                
                // Send cache version to service worker
                if (window.GIT_VERSION && window.GIT_VERSION.cacheVersion) {
                    registration.active.postMessage({
                        type: 'SET_CACHE_VERSION',
                        cacheVersion: window.GIT_VERSION.cacheVersion
                    });
                }
            })
            .catch(error => {
                console.error('Service Worker registration failed:', error);
            });
    }
}

function handleServiceWorkerMessage(event) {
    if (event.data && event.data.type === 'UPDATE_AVAILABLE') {
        swUpdateAvailable = true;
        showUpdateNotification();
    }
}

function showUpdateNotification() {
    const notification = document.createElement('div');
    notification.className = 'update-notification';
    notification.innerHTML = `
        <div class="update-content">
            <span>🔄 New version available!</span>
            <button onclick="applyUpdate()">Update Now</button>
        </div>
    `;
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: #007AFF;
        color: white;
        padding: 15px 20px;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        z-index: 10000;
        font-family: Arial, sans-serif;
    `;
    
    const updateContent = notification.querySelector('.update-content');
    updateContent.style.cssText = `
        display: flex;
        align-items: center;
        gap: 15px;
    `;
    
    const button = notification.querySelector('button');
    button.style.cssText = `
        background: white;
        color: #007AFF;
        border: none;
        padding: 8px 16px;
        border-radius: 4px;
        cursor: pointer;
        font-weight: bold;
    `;
    
    document.body.appendChild(notification);
    
    // Auto-remove after 10 seconds
    setTimeout(() => {
        if (notification.parentNode) {
            notification.parentNode.removeChild(notification);
        }
    }, 10000);
}

function applyUpdate() {
    if (swRegistration && swRegistration.waiting) {
        swRegistration.waiting.postMessage({ type: 'SKIP_WAITING' });
    } else {
        window.location.reload();
    }
}

// API Functions
async function apiCall(endpoint, options = {}) {
    const url = `${API_BASE_URL}${endpoint}`;
    
    const defaultOptions = {
        headers: {
            'Content-Type': 'application/json',
            ...(authToken && { 'Authorization': `Bearer ${authToken}` })
        }
    };
    
    const finalOptions = { ...defaultOptions, ...options };
    
    try {
        const response = await fetch(url, finalOptions);
        
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.error || `HTTP ${response.status}`);
        }
        
        return await response.json();
    } catch (error) {
        console.error(`API call failed for ${endpoint}:`, error);
        throw error;
    }
}

// Network status management
function updateOnlineStatus() {
    isOnline = navigator.onLine;
    const statusIndicator = document.getElementById('network-status');
    if (statusIndicator) {
        statusIndicator.className = `status ${isOnline ? 'online' : 'offline'}`;
        statusIndicator.textContent = isOnline ? '🟢 Online' : '🔴 Offline';
    }
}

window.addEventListener('online', updateOnlineStatus);
window.addEventListener('offline', updateOnlineStatus);

// Data loading functions
async function loadChildren() {
    try {
        children = await apiCall(API_ENDPOINTS.CHILDREN);
        console.log('Loaded children:', children);
        return children;
    } catch (error) {
        console.error('Failed to load children:', error);
        children = [];
        return [];
    }
}

async function loadGoals() {
    try {
        goals = await apiCall(API_ENDPOINTS.GOALS);
        console.log('Loaded goals:', goals);
        return goals;
    } catch (error) {
        console.error('Failed to load goals:', error);
        goals = [];
        return [];
    }
}

async function loadAllData() {
    try {
        await Promise.all([loadChildren(), loadGoals()]);
        renderChildAvatars();
        renderGoals();
    } catch (error) {
        console.error('Failed to load data:', error);
        showError('Failed to load data. Please try again.');
    }
}

// Utility functions
function getPointOnTrail(t) {
    // Complex trail calculation for smooth animation
    const x = 50 + 40 * Math.cos(t * Math.PI);
    const y = 50 + 40 * Math.sin(t * Math.PI);
    return { x, y };
}

function trophySVG() {
    return `<svg viewBox="0 0 100 100" class="trophy-icon">
        <path d="M30 70 L30 50 Q30 40 40 40 L60 40 Q70 40 70 50 L70 70 Z" fill="gold"/>
        <path d="M25 70 L75 70 L75 75 L25 75 Z" fill="gold"/>
        <circle cx="50" cy="35" r="8" fill="gold"/>
    </svg>`;
}

function getArcLengthTable(numSamples = 200) {
    const table = [];
    for (let i = 0; i <= numSamples; i++) {
        const t = i / numSamples;
        const point = getPointOnTrail(t);
        table.push({ t, point });
    }
    return table;
}

function getTAtArcLength(table, targetLength) {
    for (let i = 0; i < table.length - 1; i++) {
        const current = table[i];
        const next = table[i + 1];
        const length = Math.sqrt(
            Math.pow(next.point.x - current.point.x, 2) + 
            Math.pow(next.point.y - current.point.y, 2)
        );
        if (length >= targetLength) {
            return current.t + (targetLength / length) * (next.t - current.t);
        }
    }
    return 1.0;
}

function getEvenlySpacedMilestonePercents(numMilestones, margin=0.0) {
    const percents = [];
    const step = (1.0 - 2 * margin) / (numMilestones - 1);
    for (let i = 0; i < numMilestones; i++) {
        percents.push(margin + i * step);
    }
    return percents;
}

function treeSVG() {
    return `<svg viewBox="0 0 100 100" class="tree-icon">
        <path d="M50 80 L30 60 L40 60 L50 40 L60 60 L70 60 L50 80 Z" fill="green"/>
        <rect x="45" y="80" width="10" height="20" fill="brown"/>
    </svg>`;
}

function createTrailSVG(goal, progress, isDetailModal = false) {
    const theme = STORY_THEMES[goal.themeType] || STORY_THEMES.countdown;
    const size = isDetailModal ? 200 : 120;
    const strokeWidth = isDetailModal ? 4 : 2;
    
    const trailPath = `M 20 ${size/2} Q ${size/2} 20 ${size-20} ${size/2}`;
    const progressPath = `M 20 ${size/2} Q ${size/2} ${20 + (size-40) * (1-progress)} ${size-20} ${size/2}`;
    
    return `<svg viewBox="0 0 ${size} ${size}" class="trail-svg">
        <defs>
            <linearGradient id="trailGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" style="stop-color:#e0e0e0"/>
                <stop offset="100%" style="stop-color:#d0d0d0"/>
            </linearGradient>
        </defs>
        <path d="${trailPath}" stroke="url(#trailGradient)" stroke-width="${strokeWidth}" fill="none"/>
        <path d="${progressPath}" stroke="${goal.color}" stroke-width="${strokeWidth}" fill="none" stroke-linecap="round"/>
        <circle cx="20" cy="${size/2}" r="8" fill="${goal.color}"/>
        <text x="20" y="${size/2 + 4}" text-anchor="middle" font-size="12" fill="white">${theme.character}</text>
        <circle cx="${size-20}" cy="${size/2}" r="8" fill="#FFD700"/>
        <text x="${size-20}" y="${size/2 + 4}" text-anchor="middle" font-size="12">${theme.destination}</text>
    </svg>`;
}

function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

function convertToMilliseconds(duration, unit) {
    const multipliers = {
        'seconds': 1000,
        'minutes': 60 * 1000,
        'hours': 60 * 60 * 1000,
        'days': 24 * 60 * 60 * 1000
    };
    return duration * (multipliers[unit] || 1000);
}

function formatSimpleTime(milliseconds, type) {
    if (type === 'timer') {
        const seconds = Math.floor(milliseconds / 1000);
        const minutes = Math.floor(seconds / 60);
        const hours = Math.floor(minutes / 60);
        
        if (hours > 0) {
            return `${hours}h ${minutes % 60}m`;
        } else if (minutes > 0) {
            return `${minutes}m ${seconds % 60}s`;
        } else {
            return `${seconds}s`;
        }
    }
    return '';
}

function formatTimeRemaining(milliseconds, goal = null) {
    if (milliseconds <= 0) return 'Time\'s up!';
    
    const seconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    
    if (days > 0) {
        return `${days}d ${hours % 24}h`;
    } else if (hours > 0) {
        return `${hours}h ${minutes % 60}m`;
    } else if (minutes > 0) {
        return `${minutes}m ${seconds % 60}s`;
    } else {
        return `${seconds}s`;
    }
}

function getEncouragement(percentage, type, goal = null) {
    if (percentage >= 100) return "🎉 Amazing job! You did it!";
    if (percentage >= 80) return "🌟 Almost there! Keep going!";
    if (percentage >= 60) return "💪 You're doing great!";
    if (percentage >= 40) return "🚀 Keep up the good work!";
    if (percentage >= 20) return "⭐ You've got this!";
    return "🌱 Every journey starts with a single step!";
}

function getProgressEmoji(percentage, goal = null) {
    if (percentage >= 100) return "🏆";
    if (percentage >= 80) return "⭐";
    if (percentage >= 60) return "🌟";
    if (percentage >= 40) return "✨";
    if (percentage >= 20) return "💫";
    return "🌱";
}

// Session Management
function saveSession(user, token) {
    const session = {
        user,
        token,
        expiresAt: Date.now() + SESSION_DURATION
    };
    localStorage.setItem(SESSION_KEY, JSON.stringify(session));
    authToken = token;
    currentUser = user;
}

function loadSession() {
    const sessionData = localStorage.getItem(SESSION_KEY);
    if (!sessionData) return null;
    
    try {
        const session = JSON.parse(sessionData);
        if (session.expiresAt < Date.now()) {
            localStorage.removeItem(SESSION_KEY);
            return null;
        }
        
        authToken = session.token;
        currentUser = session.user;
        return session;
    } catch (error) {
        localStorage.removeItem(SESSION_KEY);
        return null;
    }
}

function clearSession() {
    localStorage.removeItem(SESSION_KEY);
    localStorage.removeItem(SELECTED_CHILD_KEY);
    authToken = null;
    currentUser = null;
    children = [];
    goals = [];
    selectedChildId = null;
}

function saveSelectedChild(childId) {
    if (childId) {
        localStorage.setItem(SELECTED_CHILD_KEY, childId);
    } else {
        localStorage.removeItem(SELECTED_CHILD_KEY);
    }
    selectedChildId = childId;
}

function loadSelectedChild() {
    return localStorage.getItem(SELECTED_CHILD_KEY);
}

// Authentication functions
async function sendMagicCode() {
    const email = document.getElementById('email').value.trim();
    
    if (!email) {
        showError('Please enter your email address');
        return;
    }
    
    const sendButton = document.getElementById('send-code-btn');
    const originalText = sendButton.textContent;
    sendButton.textContent = 'Sending...';
    sendButton.disabled = true;
    
    try {
        await apiCall(API_ENDPOINTS.SEND_CODE, {
            method: 'POST',
            body: JSON.stringify({ email })
        });
        
        showSuccess('Magic code sent! Check your email.');
        document.getElementById('code-section').style.display = 'block';
        document.getElementById('email').disabled = true;
        sendButton.style.display = 'none';
    } catch (error) {
        showError(error.message || 'Failed to send magic code');
        sendButton.textContent = originalText;
        sendButton.disabled = false;
    }
}

async function verifyCode() {
    const email = document.getElementById('email').value.trim();
    const code = document.getElementById('code').value.trim();
    
    if (!code) {
        showError('Please enter the magic code');
        return;
    }
    
    const verifyButton = document.getElementById('verify-code-btn');
    const originalText = verifyButton.textContent;
    verifyButton.textContent = 'Verifying...';
    verifyButton.disabled = true;
    
    try {
        const response = await apiCall(API_ENDPOINTS.VERIFY_CODE, {
            method: 'POST',
            body: JSON.stringify({ email, code })
        });
        
        saveSession(response.user, response.token);
        showDashboard();
        await loadAllData();
    } catch (error) {
        showError(error.message || 'Invalid magic code');
        verifyButton.textContent = originalText;
        verifyButton.disabled = false;
    }
}

function logout() {
    clearSession();
    showAuthScreen();
}

async function loadUserData() {
    if (!authToken) {
        showAuthScreen();
        return;
    }
    
    try {
        await loadAllData();
        selectedChildId = loadSelectedChild();
        if (children.length > 0 && !selectedChildId) {
            selectedChildId = children[0].id;
            saveSelectedChild(selectedChildId);
        }
    } catch (error) {
        console.error('Failed to load user data:', error);
        if (error.message.includes('401') || error.message.includes('403')) {
            clearSession();
            showAuthScreen();
        }
    }
}

// UI Functions
function showAuthScreen() {
    document.getElementById('auth-screen').style.display = 'block';
    document.getElementById('dashboard').style.display = 'none';
    document.getElementById('email').disabled = false;
    document.getElementById('send-code-btn').style.display = 'block';
    document.getElementById('code-section').style.display = 'none';
    document.getElementById('send-code-btn').textContent = 'Send Magic Code';
    document.getElementById('send-code-btn').disabled = false;
}

function showDashboard() {
    document.getElementById('auth-screen').style.display = 'none';
    document.getElementById('dashboard').style.display = 'block';
}

function selectChild(childId) {
    selectedChildId = childId;
    saveSelectedChild(childId);
    renderChildAvatars();
    renderGoals();
}

function renderChildAvatars() {
    const container = document.getElementById('child-avatars');
    if (!container) return;
    
    container.innerHTML = '';
    
    children.forEach(child => {
        const avatar = document.createElement('div');
        avatar.className = `child-avatar ${selectedChildId === child.id ? 'selected' : ''}`;
        avatar.style.backgroundColor = child.color;
        avatar.innerHTML = `
            <div class="avatar-icon">${child.avatar}</div>
            <div class="child-name">${child.name}</div>
        `;
        avatar.onclick = () => selectChild(child.id);
        container.appendChild(avatar);
    });
    
    // Add child button
    const addButton = document.createElement('div');
    addButton.className = 'child-avatar add-child';
    addButton.innerHTML = `
        <div class="avatar-icon">➕</div>
        <div class="child-name">Add Child</div>
    `;
    addButton.onclick = () => showModal('add-child-modal');
    container.appendChild(addButton);
}

function openEditChildModal(child) {
    const modal = document.getElementById('edit-child-modal');
    const form = modal.querySelector('form');
    
    form.querySelector('#edit-child-name').value = child.name;
    form.querySelector('#edit-child-avatar').value = child.avatar;
    form.querySelector('#edit-child-color').value = child.color;
    
    // Set up form submission
    form.onsubmit = async function(e) {
        e.preventDefault();
        
        const updatedChild = {
            name: form.querySelector('#edit-child-name').value.trim(),
            avatar: form.querySelector('#edit-child-avatar').value,
            color: form.querySelector('#edit-child-color').value
        };
        
        if (!updatedChild.name) {
            showError('Please enter a name');
            return;
        }
        
        try {
            await apiCall(`${API_ENDPOINTS.CHILDREN}/${child.id}`, {
                method: 'PUT',
                body: JSON.stringify(updatedChild)
            });
            
            await loadChildren();
            renderChildAvatars();
            hideModal('edit-child-modal');
            showSuccess('Child updated successfully!');
        } catch (error) {
            showError(error.message || 'Failed to update child');
        }
    };
    
    showModal('edit-child-modal');
}

function renderGoals() {
    const container = document.getElementById('goals-container');
    if (!container) return;
    
    container.innerHTML = '';
    
    if (children.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">👶</div>
                <h3>No children yet</h3>
                <p>Add your first child to start creating goals!</p>
                <button onclick="showModal('add-child-modal')" class="btn-primary">Add Child</button>
            </div>
        `;
        return;
    }
    
    if (goals.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">🎯</div>
                <h3>No goals yet</h3>
                <p>Create your first goal to start tracking progress!</p>
                <button onclick="showModal('add-goal-modal')" class="btn-primary">Create Goal</button>
            </div>
        `;
        return;
    }
    
    // Filter goals by selected child if one is selected
    let filteredGoals = goals;
    if (selectedChildId) {
        filteredGoals = goals.filter(goal => goal.childId === selectedChildId);
    }
    
    if (filteredGoals.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">🎯</div>
                <h3>No goals for this child</h3>
                <p>Create a goal for ${children.find(c => c.id === selectedChildId)?.name || 'this child'}!</p>
                <button onclick="showModal('add-goal-modal')" class="btn-primary">Create Goal</button>
            </div>
        `;
        return;
    }
    
    // Group goals by groupId
    const goalGroups = {};
    filteredGoals.forEach(goal => {
        if (goal.groupId) {
            if (!goalGroups[goal.groupId]) {
                goalGroups[goal.groupId] = [];
            }
            goalGroups[goal.groupId].push(goal);
        } else {
            // Single goal
            goalGroups[goal.id] = [goal];
        }
    });
    
    Object.values(goalGroups).forEach(goalGroup => {
        const goal = goalGroup[0]; // Use first goal for group info
        const card = createGoalCard(goal, goalGroup);
        container.appendChild(card);
    });
}

function calculateMilestones(goal) {
    const milestones = [];
    const totalMilestones = 5;
    
    for (let i = 1; i <= totalMilestones; i++) {
        const percentage = (i / totalMilestones) * 100;
        const progress = goal.progress || 0;
        
        milestones.push({
            percentage,
            achieved: progress >= percentage,
            position: getPointOnTrail(i / totalMilestones)
        });
    }
    
    return milestones;
}

function getGoalChildren(goal) {
    if (goal.groupId) {
        // Get all children for this goal group
        const groupGoals = goals.filter(g => g.groupId === goal.groupId);
        return groupGoals.map(g => children.find(c => c.id === g.childId)).filter(Boolean);
    } else {
        // Single child goal
        return [children.find(c => c.id === goal.childId)].filter(Boolean);
    }
}

function createGoalCard(goal, goalGroup = [goal]) {
    const card = document.createElement('div');
    card.className = 'goal-card';
    card.style.borderColor = goal.color;
    
    const progress = calculateProgress(goal);
    const milestones = calculateMilestones(goal);
    const goalChildren = getGoalChildren(goal);
    
    card.innerHTML = `
        <div class="goal-header">
            <div class="goal-info">
                <h3>${goal.name}</h3>
                <div class="goal-children">
                    ${goalChildren.map(child => `
                        <span class="child-tag" style="background-color: ${child.color}">
                            ${child.avatar} ${child.name}
                        </span>
                    `).join('')}
                </div>
            </div>
            <div class="goal-actions">
                <button onclick="openGoalDetail('${goal.id}')" class="btn-icon">👁️</button>
                <button onclick="editGoal('${goal.id}')" class="btn-icon">✏️</button>
                <button onclick="deleteGoal('${goal.id}')" class="btn-icon">🗑️</button>
            </div>
        </div>
        <div class="goal-progress">
            <div class="progress-bar">
                <div class="progress-fill" style="width: ${progress}%; background-color: ${goal.color}"></div>
            </div>
            <div class="progress-text">${Math.round(progress)}%</div>
        </div>
        <div class="goal-trail">
            ${createTrailSVG(goal, progress / 100)}
        </div>
        <div class="goal-status">
            <span class="status-badge ${goal.status}">${goal.status}</span>
            ${goal.type === 'timer' ? `<span class="timer-info">${formatTimeRemaining(goal.totalDuration - (Date.now() - goal.startTime))}</span>` : ''}
        </div>
    `;
    
    return card;
}

function calculateProgress(goal) {
    if (goal.status === 'completed') return 100;
    
    switch (goal.type) {
        case 'countdown':
            return Math.min(100, ((goal.current || 0) / goal.target) * 100);
        case 'countup':
            return Math.min(100, ((goal.current || 0) / goal.target) * 100);
        case 'timer':
            const elapsed = Date.now() - goal.startTime;
            return Math.min(100, (elapsed / goal.totalDuration) * 100);
        case 'daily':
        case 'weekly':
            return goal.progress || 0;
        default:
            return goal.progress || 0;
    }
}

// Modal functions
function showModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.style.display = 'flex';
        attachModalEventListeners(modalId);
    }
}

function hideModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.style.display = 'none';
    }
}

function attachModalEventListeners(modalId) {
    const modal = document.getElementById(modalId);
    if (!modal) return;
    
    // Close on backdrop click
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            hideModal(modalId);
        }
    });
    
    // Close on escape key
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            hideModal(modalId);
        }
    });
}

// Child management functions
async function createChild(childData) {
    try {
        const newChild = await apiCall(API_ENDPOINTS.CHILDREN, {
            method: 'POST',
            body: JSON.stringify(childData)
        });
        
        await loadChildren();
        renderChildAvatars();
        
        if (children.length === 1) {
            // First child, select it
            selectChild(newChild.id);
        }
        
        hideModal('add-child-modal');
        showSuccess('Child created successfully!');
        return newChild;
    } catch (error) {
        showError(error.message || 'Failed to create child');
        throw error;
    }
}

async function updateChild(childId, updates) {
    try {
        const updatedChild = await apiCall(`${API_ENDPOINTS.CHILDREN}/${childId}`, {
            method: 'PUT',
            body: JSON.stringify(updates)
        });
        
        await loadChildren();
        renderChildAvatars();
        return updatedChild;
    } catch (error) {
        showError(error.message || 'Failed to update child');
        throw error;
    }
}

async function deleteChild(childId) {
    try {
        await apiCall(`${API_ENDPOINTS.CHILDREN}/${childId}`, {
            method: 'DELETE'
        });
        
        await loadAllData();
        
        if (selectedChildId === childId) {
            selectedChildId = children.length > 0 ? children[0].id : null;
            saveSelectedChild(selectedChildId);
        }
        
        showSuccess('Child deleted successfully!');
    } catch (error) {
        showError(error.message || 'Failed to delete child');
        throw error;
    }
}

// Goal management functions
async function createGoal(goalData) {
    try {
        const newGoals = await apiCall(API_ENDPOINTS.GOALS, {
            method: 'POST',
            body: JSON.stringify(goalData)
        });
        
        await loadGoals();
        renderGoals();
        
        hideModal('add-goal-modal');
        showSuccess('Goal created successfully!');
        return newGoals;
    } catch (error) {
        showError(error.message || 'Failed to create goal');
        throw error;
    }
}

async function updateGoal(goalId, updates) {
    try {
        const updatedGoal = await apiCall(`${API_ENDPOINTS.GOALS}/${goalId}`, {
            method: 'PUT',
            body: JSON.stringify(updates)
        });
        
        await loadGoals();
        renderGoals();
        return updatedGoal;
    } catch (error) {
        showError(error.message || 'Failed to update goal');
        throw error;
    }
}

async function deleteGoal(goalId) {
    try {
        await apiCall(`${API_ENDPOINTS.GOALS}/${goalId}`, {
            method: 'DELETE'
        });
        
        await loadGoals();
        renderGoals();
        showSuccess('Goal deleted successfully!');
    } catch (error) {
        showError(error.message || 'Failed to delete goal');
        throw error;
    }
}

// UI Helper functions
function showSuccess(message) {
    // Simple success notification
    alert(message); // Replace with better UI
}

function showError(message) {
    // Simple error notification
    alert('Error: ' + message); // Replace with better UI
}

// Initialize app
document.addEventListener('DOMContentLoaded', function() {
    console.log('KidGoals app initializing...');
    
    // Register service worker
    registerServiceWorker();
    
    // Check for existing session
    const session = loadSession();
    if (session) {
        showDashboard();
        loadUserData();
    } else {
        showAuthScreen();
    }
    
    // Set up event listeners
    setupEventListeners();
    
    // Update online status
    updateOnlineStatus();
    
    console.log('KidGoals app initialized');
});

function setupEventListeners() {
    // Auth form listeners
    const sendCodeBtn = document.getElementById('send-code-btn');
    const verifyCodeBtn = document.getElementById('verify-code-btn');
    
    if (sendCodeBtn) {
        sendCodeBtn.addEventListener('click', sendMagicCode);
    }
    
    if (verifyCodeBtn) {
        verifyCodeBtn.addEventListener('click', verifyCode);
    }
    
    // Add child form
    const addChildForm = document.getElementById('add-child-form');
    if (addChildForm) {
        addChildForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const formData = new FormData(addChildForm);
            const childData = {
                name: formData.get('name').trim(),
                avatar: formData.get('avatar'),
                color: formData.get('color')
            };
            
            if (!childData.name) {
                showError('Please enter a name');
                return;
            }
            
            try {
                await createChild(childData);
                addChildForm.reset();
            } catch (error) {
                console.error('Failed to create child:', error);
            }
        });
    }
    
    // Add goal form
    const addGoalForm = document.getElementById('add-goal-form');
    if (addGoalForm) {
        addGoalForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const formData = new FormData(addGoalForm);
            const goalData = {
                name: formData.get('name').trim(),
                type: formData.get('type'),
                color: formData.get('color'),
                childIds: Array.from(formData.getAll('children')),
                repeat: formData.get('repeat') === 'on',
                repeatSchedule: formData.get('repeatSchedule') || null
            };
            
            // Add type-specific data
            if (goalData.type === 'timer') {
                goalData.duration = parseInt(formData.get('duration'));
                goalData.unit = formData.get('unit');
                goalData.timerType = formData.get('timerType');
                goalData.totalDuration = convertToMilliseconds(goalData.duration, goalData.unit);
            } else if (goalData.type === 'countdown' || goalData.type === 'countup') {
                goalData.target = parseInt(formData.get('target'));
                goalData.current = 0;
            }
            
            if (!goalData.name || goalData.childIds.length === 0) {
                showError('Please enter a name and select at least one child');
                return;
            }
            
            try {
                await createGoal(goalData);
                addGoalForm.reset();
            } catch (error) {
                console.error('Failed to create goal:', error);
            }
        });
    }
    
    // Logout button
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', logout);
    }
    
    // Initialize color pickers and avatar pickers
    initializeColorPicker('add-child-color', '#007AFF');
    initializeColorPicker('edit-child-color', '#007AFF');
    initializeAvatarPicker('add-child-avatar', '🦊');
    initializeAvatarPicker('edit-child-avatar', '🦊');
}

function initializeColorPicker(containerId, defaultColor) {
    const container = document.getElementById(containerId);
    if (!container) return;
    
    container.innerHTML = '';
    COLORS.forEach(color => {
        const colorOption = document.createElement('div');
        colorOption.className = 'color-option';
        colorOption.style.backgroundColor = color;
        colorOption.dataset.color = color;
        colorOption.onclick = () => {
            container.querySelectorAll('.color-option').forEach(opt => opt.classList.remove('selected'));
            colorOption.classList.add('selected');
            container.dataset.selectedColor = color;
        };
        container.appendChild(colorOption);
        
        if (color === defaultColor) {
            colorOption.classList.add('selected');
            container.dataset.selectedColor = color;
        }
    });
}

function initializeAvatarPicker(containerId, defaultAvatar) {
    const container = document.getElementById(containerId);
    if (!container) return;
    
    container.innerHTML = '';
    ICONS.forEach(icon => {
        const iconOption = document.createElement('div');
        iconOption.className = 'avatar-option';
        iconOption.textContent = icon;
        iconOption.dataset.avatar = icon;
        iconOption.onclick = () => {
            container.querySelectorAll('.avatar-option').forEach(opt => opt.classList.remove('selected'));
            iconOption.classList.add('selected');
            container.dataset.selectedAvatar = icon;
        };
        container.appendChild(iconOption);
        
        if (icon === defaultAvatar) {
            iconOption.classList.add('selected');
            container.dataset.selectedAvatar = icon;
        }
    });
}

// Goal detail and management functions
function openGoalDetail(goalId) {
    const goal = goals.find(g => g.id === goalId);
    if (!goal) return;
    
    const modal = document.getElementById('goal-detail-modal');
    const content = modal.querySelector('.modal-content');
    
    const progress = calculateProgress(goal);
    const milestones = calculateMilestones(goal);
    const goalChildren = getGoalChildren(goal);
    
    content.innerHTML = `
        <div class="goal-detail-header">
            <h2>${goal.name}</h2>
            <button onclick="hideModal('goal-detail-modal')" class="btn-close">×</button>
        </div>
        <div class="goal-detail-content">
            <div class="goal-info-section">
                <h3>Goal Information</h3>
                <p><strong>Type:</strong> ${goal.type}</p>
                <p><strong>Status:</strong> ${goal.status}</p>
                <p><strong>Progress:</strong> ${Math.round(progress)}%</p>
                <p><strong>Children:</strong> ${goalChildren.map(c => c.name).join(', ')}</p>
            </div>
            <div class="goal-trail-section">
                <h3>Progress Trail</h3>
                ${createTrailSVG(goal, progress / 100, true)}
            </div>
            <div class="goal-actions-section">
                <button onclick="editGoal('${goal.id}')" class="btn-primary">Edit Goal</button>
                <button onclick="deleteGoal('${goal.id}')" class="btn-danger">Delete Goal</button>
            </div>
        </div>
    `;
    
    showModal('goal-detail-modal');
}

function editGoal(goalId) {
    const goal = goals.find(g => g.id === goalId);
    if (!goal) return;
    
    // Populate edit form
    const form = document.getElementById('edit-goal-form');
    form.querySelector('#edit-goal-name').value = goal.name;
    form.querySelector('#edit-goal-type').value = goal.type;
    form.querySelector('#edit-goal-color').value = goal.color;
    
    // Set up form submission
    form.onsubmit = async function(e) {
        e.preventDefault();
        
        const updates = {
            name: form.querySelector('#edit-goal-name').value.trim(),
            color: form.querySelector('#edit-goal-color').value
        };
        
        try {
            await updateGoal(goalId, updates);
            hideModal('edit-goal-modal');
            showSuccess('Goal updated successfully!');
        } catch (error) {
            console.error('Failed to update goal:', error);
        }
    };
    
    showModal('edit-goal-modal');
}

// Export functions for global access
window.KidGoals = {
    createChild,
    updateChild,
    deleteChild,
    createGoal,
    updateGoal,
    deleteGoal,
    openGoalDetail,
    editGoal,
    selectChild,
    logout
};