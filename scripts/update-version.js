import { readFileSync, writeFileSync } from 'fs';
import { execSync } from 'child_process';

function readGitInfo(command, fallback) {
  try {
    return execSync(command, { stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim();
  } catch {
    return fallback;
  }
}

const commitHash =
  process.env.VERCEL_GIT_COMMIT_SHA ||
  process.env.GIT_COMMIT ||
  readGitInfo('git rev-parse HEAD', 'unknown');

const commitDate = readGitInfo(
  'git log -1 --format=%cd --date=iso-strict',
  new Date().toISOString()
);

const commitMessage = readGitInfo('git log -1 --format=%s', 'docker deployment');

// Read current version
const versionFile = './public/version.json';
const versionData = JSON.parse(readFileSync(versionFile));

// Update version data
if (process.env.VERSION_INCREMENT !== 'false') {
  versionData.buildNumber += 1;
}
versionData.lastCommit = commitHash;
versionData.lastCommitDate = commitDate;
versionData.deploymentDate = new Date().toISOString();
versionData.lastCommitMessage = commitMessage;

// Write updated version
writeFileSync(versionFile, JSON.stringify(versionData, null, 2));

console.log(`Version updated to build ${versionData.buildNumber}`);
