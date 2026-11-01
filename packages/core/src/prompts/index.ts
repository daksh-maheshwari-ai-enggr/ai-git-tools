/**
 * Prompt templates for each tool.
 * Versioned and customizable per team. Keep them focused — the LLM does
 * better work with tight, well-scoped prompts.
 */

import type { CommitType } from '../types/index.js';

export const COMMIT_SYSTEM_PROMPT = `You are an expert software engineer writing commit messages.
Rules:
- Use Conventional Commits format: <type>(<scope>): <description>
- Types: feat, fix, docs, style, refactor, perf, test, build, ci, chore, revert
- Description: imperative mood, lowercase, no trailing period, max 72 chars
- Body: optional, bullet points for breaking changes or key decisions
- Breaking changes: append "!" after type/scope, or add "BREAKING CHANGE:" in body
- Be concise and accurate. Do NOT invent changes not present in the diff.
- Output ONLY the commit message. No preamble, no markdown, no explanation.`;

export interface CommitPromptOptions {
  diff: string;
  /** Project-specific Conventional Commits rules */
  allowedTypes?: CommitType[];
  /** Project language for messages */
  language?: 'en' | 'es' | 'fr' | 'de';
  /** Additional context */
  context?: string;
}

export function buildCommitPrompt(options: CommitPromptOptions): string {
  const types = options.allowedTypes?.join(', ') ?? 'feat, fix, docs, style, refactor, perf, test, build, ci, chore, revert';
  const context = options.context ? `\n\nProject context: ${options.context}` : '';

  return `Generate a Conventional Commit message for the following staged changes.

Allowed types: ${types}
Language: ${options.language ?? 'en'}${context}

Diff:
${options.diff}

Output format (strict):
<type>(<scope>): <description>

<body if needed>

Only output the commit message, nothing else.`;
}

export const PR_SYSTEM_PROMPT = `You are an expert software engineer writing pull request descriptions.
Rules:
- Title: concise, imperative, describes the WHAT not the WHY
- Body: structured with sections: Summary, Changes, Testing, Related Issues
- Be specific. Reference file paths and function names where relevant.
- Do NOT invent features not present in the diff.
- Output ONLY the PR description. No preamble.`;

export interface PrPromptOptions {
  title?: string;
  diff: string;
  branch?: string;
  base?: string;
  context?: string;
}

export function buildPrPrompt(options: PrPromptOptions): string {
  return `Generate a pull request description for the following changes.

Branch: ${options.branch ?? '(unknown)'} → ${options.base ?? '(unknown)'}
${options.title ? `Suggested title: ${options.title}` : ''}${options.context ? `\n\nProject context: ${options.context}` : ''}

Diff:
${options.diff}

Output format:
## Summary
<2-3 sentences describing what this PR does>

## Changes
- <file path>: <what changed>

## Testing
<how to test these changes>

## Related Issues
<issue references if any, otherwise "None">

Only output the PR description, nothing else.`;
}

export const RELEASE_NOTES_SYSTEM_PROMPT = `You are a technical writer generating release notes from git history.
Rules:
- Group commits by type (feat, fix, docs, etc.)
- Use imperative mood, lowercase, no trailing period
- Highlight breaking changes prominently
- Skip chore/ci/build commits unless they're user-visible
- Output ONLY the release notes. No preamble.`;

export interface ReleaseNotesPromptOptions {
  commits: string;
  version?: string;
  previousVersion?: string;
  includeBreaking?: boolean;
}

export function buildReleaseNotesPrompt(options: ReleaseNotesPromptOptions): string {
  return `Generate release notes for version ${options.version ?? 'unreleased'}${options.previousVersion ? ` (changes since ${options.previousVersion})` : ''}.

Commits:
${options.commits}

Output format:
## [${options.version ?? 'Unreleased'}] - ${new Date().toISOString().split('T')[0]}

### Features
- <description>

### Bug Fixes
- <description>

### Breaking Changes
- <description>

Only output the release notes, nothing else.`;
}

export const REVIEW_SYSTEM_PROMPT = `You are a senior code reviewer. Review the following diff.
Rules:
- Flag potential bugs, security issues, and logic errors
- Note code style violations and maintainability concerns
- Suggest improvements concisely
- Be constructive, not critical
- Output ONLY the review. No preamble.`;

export interface ReviewPromptOptions {
  diff: string;
  focus?: string[];
  context?: string;
}

export function buildReviewPrompt(options: ReviewPromptOptions): string {
  const focus = options.focus?.length ? `\nFocus areas: ${options.focus.join(', ')}` : '';
  return `Review the following code changes for quality, correctness, and security.${options.context ? `\n\nProject context: ${options.context}` : ''}${focus}

Diff:
${options.diff}

Output format:
## Issues
- **[severity]** <file>: <description>

## Suggestions
- <file>: <improvement>

## Summary
<overall assessment>

Only output the review, nothing else.`;
}