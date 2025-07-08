# Version Checking Feature

## Overview

The app now includes automatic version checking that monitors the version number in the footer and triggers service worker updates when the version changes. This ensures users get the latest version when you deploy updates.

## How It Works

### Version Monitoring

1. **Periodic Checking** - Every 30 seconds, the app checks the version number displayed in the footer
2. **Change Detection** - When the version changes, it triggers a service worker update check
3. **User Notification** - Shows an update notification to prompt the user to apply the update
4. **Automatic Update** - The service worker can apply the update immediately

### Version Sources

The version number comes from:
- **Git Version** - When `version.js` is generated from Git (preferred)
- **Fallback** - Static version `1.0.0` when Git version is not available

## Implementation Details

### Client-Side Logic

```javascript
// Version checking runs every 30 seconds
function checkForVersionUpdate() {
    const currentVersion = document.querySelector('.app-version').textContent.replace('v', '');
    
    if (lastKnownVersion === null) {
        lastKnownVersion = currentVersion;
        return;
    }
    
    if (currentVersion !== lastKnownVersion) {
        // Version changed - trigger update
        checkForServiceWorkerUpdate();
        showUpdateNotification();
    }
}
```

### Integration Points

1. **App Startup** - Version checking starts when user logs in
2. **Online/Offline** - Stops when offline, restarts when back online
3. **Logout** - Stops when user logs out
4. **Page Unload** - Cleans up intervals when page closes

## Benefits

### 1. **Automatic Updates**
- Users get notified of new versions automatically
- No need to manually refresh or check for updates
- Works even when the app is running in the background

### 2. **Seamless Experience**
- Version checking is transparent to users
- Only shows notifications when updates are available
- Doesn't interfere with normal app usage

### 3. **Reliable Detection**
- Monitors the actual displayed version
- Works with both Git-generated and static versions
- Handles version format changes gracefully

## Testing

Use `test-version.html` to test the version checking functionality:

1. **Open the test page**
2. **Click version buttons** to simulate version changes
3. **Watch the logs** to see what would happen in the main app
4. **Test the timing** with the automatic 5-second checks

## Configuration

### Check Interval
- **Production**: 30 seconds (configurable)
- **Testing**: 5 seconds (for faster feedback)

### Version Sources
- **Primary**: `window.GIT_VERSION.version` (from Git)
- **Fallback**: Static version `1.0.0`

## Deployment Workflow

1. **Make code changes**
2. **Commit to Git**
3. **Deploy to server**
4. **GitHub Actions generates new `version.js`**
5. **Users automatically detect version change**
6. **Service worker updates and notifies users**

## Troubleshooting

### Version Not Detected
- Check that `version.js` is being generated correctly
- Verify the footer displays the correct version
- Check browser console for version checking logs

### Update Not Triggered
- Ensure service worker is registered
- Check that version checking is running (logs every 30 seconds)
- Verify the version number format is consistent

### Too Many Notifications
- Version checking only triggers on actual changes
- Each version change triggers only one notification
- Users can dismiss notifications

## Future Enhancements

1. **Smart Checking** - Only check when app is active
2. **Version History** - Track version changes over time
3. **Update Preferences** - Let users control update behavior
4. **Background Updates** - Apply updates without user interaction

## Conclusion

The version checking feature ensures users always have the latest version of the app without manual intervention. It's a key component of the seamless update experience, working alongside the service worker to provide automatic updates. 