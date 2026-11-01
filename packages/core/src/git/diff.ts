/**
 * Git diff parsing.
 * Parses the output of `git diff --no-color --unified=3` into structured hunks.
 * Handles added, modified, and renamed files.
 */

import { execa } from 'execa';
import type { DiffHunk } from '../types/index.js';

export interface GitDiffOptions {
  /** Staged changes only */
  staged?: boolean;
  /** Specific files */
  paths?: string[];
  /** Base ref to compare against */
  base?: string;
  /** Number of context lines */
  context?: number;
}

export interface GitDiffResult {
  raw: string;
  hunks: DiffHunk[];
  totalAdditions: number;
  totalDeletions: number;
}

/**
 * Run `git diff` and parse the output into structured hunks.
 */
export async function getGitDiff(options: GitDiffOptions = {}): Promise<GitDiffResult> {
  const args = ['diff', '--no-color', `--unified=${options.context ?? 3}`];

  if (options.staged) args.push('--cached');
  if (options.base) args.push(options.base);
  if (options.paths?.length) args.push('--', ...options.paths);

  const { stdout: raw } = await execa('git', args, { reject: false });

  return parseDiff(raw);
}

/**
 * Parse the raw diff text into structured hunks.
 */
export function parseDiff(raw: string): GitDiffResult {
  const hunks: DiffHunk[] = [];
  const lines = raw.split('\n');
  let currentFile: DiffHunk | null = null;
  let additions = 0;
  let deletions = 0;

  for (const line of lines) {
    // New file entry
    if (line.startsWith('diff --git ')) {
      // Save previous file
      if (currentFile) hunks.push(currentFile);

      const match = line.match(/^diff --git a\/(.+) b\/(.+)$/);
      const oldPath = match?.[1];
      const newPath = match?.[2];

      currentFile = {
        file: newPath,
        status: 'modified',
        additions: 0,
        deletions: 0,
        diff: '',
        oldPath: oldPath !== newPath ? oldPath : undefined,
      };
      continue;
    }

    // New file
    if (line.startsWith('--- /dev/null')) {
      if (currentFile) {
        currentFile.status = 'added';
      }
      continue;
    }

    // Deleted file
    if (line.startsWith('+++ /dev/null')) {
      if (currentFile) {
        currentFile.status = 'deleted';
      }
      continue;
    }

    // Renamed file
    if (line.startsWith('rename from ') || line.startsWith('rename to ')) {
      if (currentFile) {
        currentFile.status = 'renamed';
      }
      continue;
    }

    // Hunk content
    if (currentFile && (line.startsWith('+') || line.startsWith('-') || line.startsWith(' '))) {
      currentFile.diff += line + '\n';
      if (line.startsWith('+') && !line.startsWith('+++')) {
        currentFile.additions++;
        additions++;
      } else if (line.startsWith('-') && !line.startsWith('---')) {
        currentFile.deletions++;
        deletions++;
      }
    }
  }

  // Save last file
  if (currentFile) hunks.push(currentFile);

  return {
    raw,
    hunks,
    totalAdditions: additions,
    totalDeletions: deletions,
  };
}

/**
 * Get a compact summary of a diff for sending to the LLM.
 * Truncates large diffs to stay within token budgets.
 */
export function summarizeDiff(diff: GitDiffResult, maxChars = 6000): string {
  const fileSummary = diff.hunks
    .map((h) => `  ${h.status}: ${h.file} (+${h.additions} -${h.deletions})`)
    .join('\n');

  const header = `Files changed: ${diff.hunks.length} (+${diff.totalAdditions} -${diff.totalDeletions})\n\n${fileSummary}\n\n`;

  // Include actual diff content up to the char budget
  const budget = maxChars - header.length;
  if (budget <= 0) return header.trim();

  let content = '';
  for (const hunk of diff.hunks) {
    const block = `--- ${h.file} ---\n${hunk.diff}`;
    if (content.length + block.length > budget) break;
    content += block;
  }

  return (header + content).trim();
}