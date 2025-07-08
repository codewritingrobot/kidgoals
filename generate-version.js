#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

function getGitVersion() {
    try {
        // Try to get the latest tag
        const tag = execSync('git describe --tags --abbrev=0', { encoding: 'utf8' }).trim();
        const commitCount = execSync(`git rev-list --count ${tag}..HEAD`, { encoding: 'utf8' }).trim();
        const shortHash = execSync('git rev-parse --short HEAD', { encoding: 'utf8' }).trim();
        
        if (commitCount === '0') {
            // We're exactly on a tag
            return tag;
        } else {
            // We're ahead of the tag
            return `${tag}+${commitCount}-${shortHash}`;
        }
    } catch (error) {
        // Fallback to short hash if no tags exist
        try {
            const shortHash = execSync('git rev-parse --short HEAD', { encoding: 'utf8' }).trim();
            return `dev-${shortHash}`;
        } catch (fallbackError) {
            return 'unknown';
        }
    }
}

function getGitInfo() {
    try {
        const commitHash = execSync('git rev-parse HEAD', { encoding: 'utf8' }).trim();
        const shortHash = execSync('git rev-parse --short HEAD', { encoding: 'utf8' }).trim();
        const commitDate = execSync('git log -1 --format=%cd --date=iso', { encoding: 'utf8' }).trim();
        const commitMessage = execSync('git log -1 --format=%s', { encoding: 'utf8' }).trim();
        
        return {
            version: getGitVersion(),
            commitHash,
            shortHash,
            commitDate,
            commitMessage,
            buildDate: new Date().toISOString(),
            cacheVersion: `kidgoals-${shortHash}` // Use commit hash for cache versioning
        };
    } catch (error) {
        return {
            version: 'unknown',
            commitHash: 'unknown',
            shortHash: 'unknown',
            commitDate: 'unknown',
            commitMessage: 'unknown',
            buildDate: new Date().toISOString(),
            cacheVersion: 'kidgoals-unknown'
        };
    }
}

// Generate version info
const versionInfo = getGitInfo();

// Create version.js file
const versionJsContent = `// Auto-generated version file - do not edit manually
window.GIT_VERSION = ${JSON.stringify(versionInfo, null, 2)};
`;

// Write to version.js
fs.writeFileSync(path.join(__dirname, 'version.js'), versionJsContent);

console.log('Generated version.js with:', versionInfo); 