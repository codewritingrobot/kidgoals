# Service Worker Update System

## Overview

The KidGoals application now includes a comprehensive service worker update system designed to handle iOS PWA updates properly. This system ensures that users get the latest version of the app automatically, with a smooth update experience.

## How It Works

### 1. Service Worker Registration

The service worker is registered when the app starts:

```javascript
function registerServiceWorker() {
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('/sw.js')
            .then(registration => {
                // Set up update checking and monitoring
                setupServiceWorkerUpdates(registration);
                
                // Check for updates immediately
                checkForServiceWorkerUpdate();
                
                // Set up periodic update checks (every hour)
                swUpdateInterval = setInterval(() => {
                    checkForServiceWorkerUpdate();
                }, 1000 * 60 * 60);
            });
    }
}
```

### 2. Update Detection

The system monitors for service worker updates:

```javascript
function setupServiceWorkerUpdates(registration) {
    registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing;
        
        newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                // New service worker is ready
                showUpdateNotification();
            }
        });
    });
}
```

### 3. Update Notification

When an update is available, users see a notification:

```javascript
function showUpdateNotification() {
    const notification = document.createElement('div');
    notification.innerHTML = `
        <div class="update-notification-content">
            <span>🔄 New version available</span>
            <button onclick="applyUpdate()" class="update-btn">Update Now</button>
        </div>
    `;
    // Auto-hide after 10 seconds
}
```

### 4. Update Application

Users can apply updates immediately:

```javascript
function applyUpdate() {
    if (swRegistration && swRegistration.waiting) {
        // Send message to waiting service worker to skip waiting
        swRegistration.waiting.postMessage({ type: 'SKIP_WAITING' });
    } else {
        // Force reload to pick up new service worker
        window.location.reload();
    }
}
```

## Service Worker Features

### Cache Management

- **Version-based caching**: Each update gets a unique cache name
- **Automatic cleanup**: Old caches are deleted when new ones are created
- **Smart caching**: Only successful responses are cached

### Update Strategy

- **Skip waiting**: New service workers activate immediately
- **Client claiming**: New service workers take control of all open pages
- **Message passing**: Communication between app and service worker

### iOS-Specific Handling

- **Immediate activation**: `self.skipWaiting()` ensures updates apply quickly
- **Client claiming**: `self.clients.claim()` takes control of all pages
- **Controller change detection**: App reloads when new service worker takes control

## Update Flow

1. **App starts** → Service worker registers
2. **Periodic checks** → Every hour, check for updates
3. **Update found** → New service worker downloads and installs
4. **User notified** → Update notification appears
5. **User applies update** → Service worker activates and app reloads
6. **New version loads** → Fresh assets from new cache

## Cache Versioning

The service worker uses a version-based cache system:

```javascript
const CACHE_VERSION = 'kidgoals-v2'; // Increment for updates
const CACHE_NAME = `${CACHE_VERSION}-${Date.now()}`; // Unique per update
```

To force an update, increment `CACHE_VERSION` in `sw.js`.

## Testing

### Manual Testing

1. **Start the app** and check console for service worker registration
2. **Modify sw.js** (change CACHE_VERSION or add console.log)
3. **Reload the app** - should see update notification
4. **Click "Update Now"** - app should reload with new version

### Automated Testing

Use the test file `test-service-worker.html` to:
- Check service worker status
- Test update detection
- Force updates manually
- Monitor update events

## Best Practices

### For Developers

1. **Increment cache version** when deploying updates
2. **Test updates** on iOS devices specifically
3. **Monitor console logs** for update events
4. **Use the test page** to verify update system

### For Users

1. **Accept updates** when notified for best experience
2. **Updates are automatic** - no manual intervention needed
3. **App will reload** to apply updates
4. **Data is preserved** during updates

## Troubleshooting

### Common Issues

1. **Updates not showing**: Check if service worker is registered
2. **Update not applying**: Verify cache version was incremented
3. **iOS not updating**: Ensure `skipWaiting()` and `clients.claim()` are used
4. **Cache issues**: Clear browser cache and reload

### Debug Commands

```javascript
// Check service worker status
navigator.serviceWorker.getRegistration().then(reg => console.log(reg));

// Force update check
navigator.serviceWorker.getRegistration().then(reg => reg.update());

// Clear all caches
caches.keys().then(names => names.forEach(name => caches.delete(name)));
```

## Files

- `sw.js` - Service worker with update logic
- `app.js` - Service worker registration and update handling
- `test-service-worker.html` - Test page for update system
- `SERVICE_WORKER_UPDATES.md` - This documentation

## Benefits

✅ **Automatic updates** - No manual intervention required  
✅ **iOS compatibility** - Works properly on iOS PWA  
✅ **Smooth experience** - Users notified of updates  
✅ **Immediate activation** - Updates apply quickly  
✅ **Cache management** - Automatic cleanup of old caches  
✅ **Offline support** - App works without internet  

## Example Update Sequence

1. Developer deploys new version with updated `CACHE_VERSION`
2. User opens app → Service worker checks for updates
3. New service worker downloads and installs
4. User sees "🔄 New version available" notification
5. User clicks "Update Now" → App reloads with new version
6. New service worker takes control and serves fresh assets 