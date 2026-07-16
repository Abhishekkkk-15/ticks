const fs = require('fs');
const path = require('path');
const os = require('os');

const root = path.join(os.homedir(), 'AILearningWorkspace');

function listDir(dir, indent = '') {
  if (!fs.existsSync(dir)) return;
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      console.log(`${indent}[DIR] ${file}`);
      listDir(fullPath, indent + '  ');
    } else {
      console.log(`${indent}${file}`);
    }
  }
}

console.log(`Contents of ${root}:`);
listDir(root);
