#!/usr/bin/env node
const { spawnSync } = require('child_process');

const RESET = '\x1b[0m';
const CYAN  = '\x1b[36m';
const GREEN = '\x1b[32m';
const YELLOW = '\x1b[33m';

function installed(cmd) {
  return spawnSync(cmd, ['--version'], { stdio: 'ignore' }).status === 0;
}

console.log(`\n${CYAN}  DevFlow AI CLI — checking prerequisites${RESET}\n`);

const ghOk = installed('gh');
const azOk = installed('az');

if (ghOk) {
  console.log(`${GREEN}  ✓ gh CLI found${RESET}`);
} else {
  console.log(`${YELLOW}  ! gh CLI not found — needed for GitHub repos${RESET}`);
  console.log(`    Install: https://cli.github.com`);
  console.log(`    Then run: gh auth login\n`);
}

if (azOk) {
  console.log(`${GREEN}  ✓ az CLI found${RESET}`);
} else {
  console.log(`${YELLOW}  ! az CLI not found — needed for Azure DevOps repos${RESET}`);
  console.log(`    Install: https://aka.ms/installazurecliwindows`);
  console.log(`    Then run: az extension add --name azure-devops && az login\n`);
}

console.log(`\n  Quick setup:`);
console.log(`    devflow config set llm.groq.apiKey gsk_...`);
console.log(`    devflow status\n`);
