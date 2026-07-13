import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

// 1. Run esbuild
console.log('Building bridge-cli.js...');
execSync('npx esbuild src/bridge-cli.ts --bundle --platform=node --target=node20 --outfile=dist/bridge-cli.js', { stdio: 'inherit' });

// 2. Create wrapper scripts
const batContent = `@echo off
set ELECTRON_RUN_AS_NODE=1
if exist "%~dp0..\\..\\..\\ticks.exe" (
  "%~dp0..\\..\\..\\ticks.exe" "%~dp0bridge-cli.js" %*
) else (
  node "%~dp0bridge-cli.js" %*
)
`;

const shContent = `#!/bin/bash
export ELECTRON_RUN_AS_NODE=1
DIR="$( cd "$( dirname "\${BASH_SOURCE[0]}" )" && pwd )"
if [ -f "$DIR/../../../MacOS/ticks" ]; then
  exec "$DIR/../../../MacOS/ticks" "$DIR/bridge-cli.js" "$@"
elif [ -f "$DIR/../../../MacOS/Ticks" ]; then
  exec "$DIR/../../../MacOS/Ticks" "$DIR/bridge-cli.js" "$@"
elif [ -f "$DIR/../../../ticks" ]; then
  exec "$DIR/../../../ticks" "$DIR/bridge-cli.js" "$@"
else
  exec node "$DIR/bridge-cli.js" "$@"
fi
`;

const distDir = path.join(process.cwd(), 'dist');
if (!fs.existsSync(distDir)) fs.mkdirSync(distDir);

fs.writeFileSync(path.join(distDir, 'Ticks-MCP-Bridge.bat'), batContent);
fs.writeFileSync(path.join(distDir, 'Ticks-MCP-Bridge.sh'), shContent);
fs.chmodSync(path.join(distDir, 'Ticks-MCP-Bridge.sh'), 0o755);

console.log('Bridge wrappers created successfully!');
