import { createHash } from 'crypto';
import { readFileSync, readdirSync, statSync, writeFileSync } from 'fs';
import { execSync } from 'child_process';
import { join, relative } from 'path';

const sourceRoots = [
  'actions', 'app', 'components', 'contexts', 'lib', 'migrations', 'public',
  'scripts', 'Dockerfile', 'docker-compose.lhr.yml', 'middleware.ts',
  'next.config.mjs', 'package.json', 'package-lock.json'
]

function collectSourceFiles(path, files = []) {
  const stat = statSync(path)
  if (stat.isDirectory()) {
    for (const entry of readdirSync(path).sort()) {
      collectSourceFiles(join(path, entry), files)
    }
  } else if (path !== 'public/version.json') {
    files.push(path)
  }
  return files
}

function calculateSourceRevision() {
  const hash = createHash('sha256')
  const files = sourceRoots.flatMap(path => collectSourceFiles(path)).sort()
  for (const file of files) {
    hash.update(relative('.', file))
    hash.update('\0')
    hash.update(readFileSync(file))
    hash.update('\0')
  }
  return hash.digest('hex')
}

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
const sourceRevision = commitHash === 'unknown'
  ? calculateSourceRevision()
  : commitHash;

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
versionData.sourceRevision = sourceRevision;
versionData.lastCommitDate = commitDate;
versionData.deploymentDate = new Date().toISOString();
versionData.lastCommitMessage = commitMessage;

// Write updated version
writeFileSync(versionFile, JSON.stringify(versionData, null, 2));

console.log(`Version updated to build ${versionData.buildNumber}`);
