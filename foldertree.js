// print-structure.js

import fs from 'fs';
import path from 'path';
import ignore from 'ignore';

/**
 * Reads .gitignore from project root (if present) and returns an ignore filter.
 */
function loadGitignore(rootDir) {
  const ig = ignore();
  const gitignorePath = path.join(rootDir, '.gitignore');
  if (fs.existsSync(gitignorePath)) {
    const patterns = fs.readFileSync(gitignorePath, 'utf8').split(/\r?\n/);
    ig.add(patterns);
  }
  return ig;
}

/**
 * Recursively prints directory tree, skipping files/folders ignored by .gitignore or the .git folder itself
 */
function printTree(dirPath, ig, prefix = '') {
  const entries = fs.readdirSync(dirPath, { withFileTypes: true })
    .filter(entry => {
      // Skip the .git directory explicitly
      if (entry.name === '.git') {
        return false;
      }
      // Filter out ignored entries relative to project root
      const rel = path.relative(process.cwd(), path.join(dirPath, entry.name));
      return !ig.ignores(rel);
    });

  const lastIndex = entries.length - 1;
  entries.forEach((entry, i) => {
    const isLast = i === lastIndex;
    const pointer = isLast ? '└── ' : '├── ';
    console.log(prefix + pointer + entry.name);

    if (entry.isDirectory()) {
      const newPrefix = prefix + (isLast ? '    ' : '│   ');
      printTree(path.join(dirPath, entry.name), ig, newPrefix);
    }
  });
}

// === Usage ===
// 1. Install dependencies: `npm install ignore`
// 2. Run the script:
//    node print-structure.js [path]
//    If no path is provided, it defaults to the current working directory.

const targetDir = process.argv[2] || process.cwd();
const ig = loadGitignore(process.cwd());
console.log(path.resolve(targetDir));
printTree(targetDir, ig);
