#!/usr/bin/env node
/**
 * scripts/setup-git-hooks.ts
 * 
 * Configures local Git hooks for GALXAI maintainers:
 * 1. pre-commit: Runs `npx tsc --noEmit` and validates changed TypeScript files.
 * 2. commit-msg: Validates Conventional Commits 1.0.0 message format.
 * 
 * Usage:
 *   npm run hooks:install
 *   npx tsx scripts/setup-git-hooks.ts
 */

import * as fs from 'fs';
import * as path from 'path';

function setupGitHooks() {
  console.log('\n======================================================================');
  console.log('  🪝 GALXAI: MAINTAINER GIT HOOKS INSTALLATION ENGINE');
  console.log('======================================================================\n');

  const gitDir = path.join(process.cwd(), '.git');
  if (!fs.existsSync(gitDir)) {
    console.warn('⚠️  Not a git repository root. Skipping git hook installation.');
    return;
  }

  const hooksDir = path.join(gitDir, 'hooks');
  if (!fs.existsSync(hooksDir)) {
    fs.mkdirSync(hooksDir, { recursive: true });
  }

  // 1. Pre-commit Hook
  const preCommitPath = path.join(hooksDir, 'pre-commit');
  const preCommitScript = `#!/bin/sh
# GALXAI Pre-Commit Invariant Gate
echo "🔍 Running pre-commit TypeScript strict check..."
npx tsc --noEmit
if [ $? -ne 0 ]; then
  echo "❌ TypeScript typecheck failed. Please fix compilation errors before committing."
  exit 1
fi
echo "✅ Pre-commit verification passed."
exit 0
`;
  fs.writeFileSync(preCommitPath, preCommitScript, { mode: 0o755 });
  console.log('  ✅ Installed pre-commit hook (.git/hooks/pre-commit)');

  // 2. Commit-msg Hook
  const commitMsgPath = path.join(hooksDir, 'commit-msg');
  const commitMsgScript = `#!/bin/sh
# GALXAI Commit-Msg Conventional Commits Validator
COMMIT_MSG_FILE=$1
COMMIT_MSG=$(cat "$COMMIT_MSG_FILE" | head -n 1)

# Regex for Conventional Commits
PATTERN="^(feat|fix|docs|style|refactor|perf|test|build|ci|chore|revert)(\\([a-zA-Z0-9_-]+\\))?: .+"

if ! echo "$COMMIT_MSG" | grep -Eq "$PATTERN"; then
  echo "❌ Invalid commit message format: '$COMMIT_MSG'"
  echo "   Standard: <type>(<scope>): <short description>"
  echo "   Examples: feat(broccolidb): add DICOM imaging compactor"
  echo "             fix(vault): correct AAD tenant validation"
  echo "             docs(maintainers): update onboarding roadmap"
  exit 1
fi
echo "✅ Conventional commit message format verified."
exit 0
`;
  fs.writeFileSync(commitMsgPath, commitMsgScript, { mode: 0o755 });
  console.log('  ✅ Installed commit-msg hook (.git/hooks/commit-msg)');

  console.log('\n🎉 Git hooks successfully installed and configured!\n');
}

setupGitHooks();
