/**
 * Git log parsing.
 * Parses `git log --format` output into structured Commit objects.
 */

import { execa } from 'execa';
import type { Commit, CommitType } from '../types/index.js';

export interface GitLogOptions {
  /** Number of commits to fetch */
  limit?: number;
  /** Since date (ISO string or relative like "1 day ago") */
  since?: string;
  /** Until date */
  until?: string;
  /** Specific ref range */
  range?: string;
  /** Custom format string */
  format?: string;
}

/**
 * Run `git log` and parse into structured commits.
 */
export async function getGitLog(options: GitLogOptions = {}): Promise<Commit[]> {
  const args = ['log', '--no-color', `--format=%H%x1f%h%x1f%s%x1f%an%x1f%aI`];

  if (options.limit) args.push(`-${options.limit}`);
  if (options.since) args.push(`--since=${options.since}`);
  if (options.until) args.push(`--until=${options.until}`);
  if (options.range) args.push(options.range);

  const { stdout } = await execa('git', args, { reject: false });

  return stdout
    .split('\n')
    .filter(Boolean)
    .map((line) => {
      const [hash, shortHash, message, author, date] = line.split('\x1f');
      return parseCommit(hash, shortHash, message, author, date);
    });
}

/**
 * Parse a single commit message into Conventional Commit fields.
 */
export function parseCommit(
  hash: string,
  shortHash: string,
  message: string,
  author: string,
  date: string,
): Commit {
  const match = message.match(
    /^(?<type>\w+)(?:\((?<scope>[^)]+)\))?(?!\w*!):\s+(?<desc>.+)$/,
  );

  const commit: Commit = { hash, shortHash, message, author, date };

  if (match?.groups) {
    const type = match.groups.type.toLowerCase() as CommitType;
    commit.type = type;
    commit.scope = match.groups.scope;
    commit.description = match.groups.desc.trim();
  }

  return commit;
}

/**
 * Get commits since a date as a compact summary for the LLM.
 */
export async function getCommitsSince(since: string, limit = 50): Promise<string> {
  const commits = await getGitLog({ since, limit });
  if (commits.length === 0) return '(no commits)';

  return commits
    .map((c) => {
      const type = c.type ? `[${c.type}]` : '';
      const scope = c.scope ? `(${c.scope})` : '';
      return `- ${c.shortHash} ${type}${scope} ${c.description ?? c.message} (${c.author})`;
    })
    .join('\n');
}