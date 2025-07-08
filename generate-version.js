#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');

try {
  // Get Git information
  const commitHash = execSync('git rev-parse --short HEAD', { encoding: 'utf8' }).trim();
  const commitDate = execSync('git log -1 --format=%cd --date=iso', { encoding: 'utf8' }).trim();
  const branch = execSync('git rev-parse --abbrev-ref HEAD', { encoding: 'utf8' }).trim();
  
  // Get package.json version if it exists
  let packageVersion = '1.0.0';
  try {
    const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
    packageVersion = packageJson.version || '1.0.0';
  } catch (error) {
    // package.json doesn't exist or is invalid, use default version
  }
  
  // Create version object
  const versionInfo = {
    version: packageVersion,
    commit: commitHash,
    date: commitDate,
    branch: branch,
    buildTime: new Date().toISOString()
  };
  
  // Generate the version.js file content
  const versionFileContent = `// Auto-generated version file
// Generated on: ${new Date().toISOString()}
// Git commit: ${commitHash}
// Branch: ${branch}

window.APP_VERSION = ${JSON.stringify(versionInfo, null, 2)};

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
  module.exports = window.APP_VERSION;
}
`;
  
  // Write the version file
  fs.writeFileSync('version.js', versionFileContent);
  
  console.log('✅ Version file generated successfully');
  console.log(`📦 Version: ${versionInfo.version}`);
  console.log(`🔗 Commit: ${versionInfo.commit}`);
  console.log(`🌿 Branch: ${versionInfo.branch}`);
  console.log(`📅 Date: ${versionInfo.date}`);
  
} catch (error) {
  console.error('❌ Error generating version file:', error.message);
  
  // Create a fallback version file
  const fallbackVersion = {
    version: '1.0.0',
    commit: 'unknown',
    date: new Date().toISOString(),
    branch: 'unknown',
    buildTime: new Date().toISOString(),
    error: 'Could not read Git information'
  };
  
  const fallbackContent = `// Auto-generated version file (fallback)
// Generated on: ${new Date().toISOString()}
// Error: Could not read Git information

window.APP_VERSION = ${JSON.stringify(fallbackVersion, null, 2)};

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
  module.exports = window.APP_VERSION;
}
`;
  
  fs.writeFileSync('version.js', fallbackContent);
  console.log('⚠️ Created fallback version file');
} 