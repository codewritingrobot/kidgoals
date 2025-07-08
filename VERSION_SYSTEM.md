# Dynamic Version System

## Overview

The KidGoals application now uses a dynamic version system that automatically generates version information from Git commits and tags. This eliminates the need to manually update version numbers in the code.

## How It Works

### 1. Version Generation Script (`generate-version.js`)

The `generate-version.js` script extracts Git information and creates a `version.js` file with:

```javascript
window.GIT_VERSION = {
  "version": "dev-f58b6b3",
  "commitHash": "f58b6b35c997b84de9ec0b30bd153d5fa7a465bd",
  "shortHash": "f58b6b3",
  "commitDate": "2025-07-08 12:24:04 -0500",
  "commitMessage": "Fix repeating goals",
  "buildDate": "2025-07-08T17:27:17.443Z"
};
```

### 2. Version Format

The version follows this pattern:
- **Tagged releases**: `v1.0.0` (exact tag)
- **Development builds**: `v1.0.0+5-f58b6b3` (tag + commits ahead + short hash)
- **No tags**: `dev-f58b6b3` (development + short hash)

### 3. GitHub Actions Integration

The version generation is integrated into the deployment workflow:

```yaml
- name: Generate Version File
  run: |
    echo "📝 Generating version file from Git..."
    node generate-version.js
    echo "✅ Version file generated:"
    cat version.js
```

This step runs before the frontend deployment, ensuring the latest version information is included.

## Usage

### Local Development

1. **Generate version file**:
   ```bash
   node generate-version.js
   ```

2. **The version will appear in the footer** of the application

### Production Deployment

The version is automatically generated during GitHub Actions deployment and will show:
- **Commit hash** for development builds
- **Tag name** for tagged releases
- **Build date** for tracking when the deployment was created

## Version Information Available

The `window.GIT_VERSION` object contains:

- `version`: The formatted version string (shown in footer)
- `commitHash`: Full Git commit hash
- `shortHash`: Short Git commit hash (7 characters)
- `commitDate`: When the commit was made
- `commitMessage`: The commit message
- `buildDate`: When the version file was generated

## Best Practices

### Creating Releases

1. **Create a Git tag** for releases:
   ```bash
   git tag v1.0.0
   git push origin v1.0.0
   ```

2. **The version will automatically show** as `v1.0.0` in production

### Development Workflow

1. **Make changes** and commit them
2. **Version will show** as `dev-<short-hash>` or `v1.0.0+<commits>-<hash>`
3. **Deploy to production** - version is automatically generated

## Files

- `generate-version.js` - Version generation script
- `version.js` - Auto-generated version file (not committed)
- `.gitignore` - Excludes `version.js` from Git
- `.github/workflows/deploy.yml` - Includes version generation step
- `app.js` - Uses dynamic version from `window.GIT_VERSION`

## Benefits

1. **No manual version updates** - automatically generated from Git
2. **Accurate version tracking** - always reflects the actual code state
3. **Deployment transparency** - shows exactly which commit is deployed
4. **Release management** - use Git tags for proper releases
5. **Development tracking** - distinguish between development and release builds

## Example Versions

- `v1.0.0` - Tagged release
- `v1.0.0+5-f58b6b3` - 5 commits ahead of v1.0.0 tag
- `dev-f58b6b3` - Development build with no tags
- `unknown` - Fallback when Git information is unavailable 