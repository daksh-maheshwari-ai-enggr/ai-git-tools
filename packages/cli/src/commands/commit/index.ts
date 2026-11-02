import { Command } from 'commander';
import chalk from 'chalk';
import { execa } from 'execa';
import ora from 'ora';
import { createProvider } from '@ai-git-tools/core';
import { buildCommitPrompt, summarizeDiff, getGitDiff, type GenerateResponse } from '@ai-git-tools/core';
import { config } from '../../config/ConfigProvider.js';

const COMMIT_SYSTEM_PROMPT = `You are an expert software engineer writing commit messages.
Rules:
- Use Conventional Commits format: <type>(<scope>): <description>
- Types: feat, fix, docs, style, refactor, perf, test, build, ci, chore, revert
- Description: imperative mood, lowercase, no trailing period, max 72 chars
- Body: optional, bullet points for breaking changes or key decisions
- Breaking changes: append "!" after type/scope, or add "BREAKING CHANGE:" in body
- Be concise and accurate. Do NOT invent changes not present in the diff.
- Output ONLY the commit message. No preamble, no markdown, no explanation.`;

export class CommitCommand extends Command {
  constructor() {
    super('commit');
    this.description('Generate commit message from staged diff and commit');
    this.name = 'commit';
    this.option('-d, --dry-run', 'Preview commit message without committing');
    this.option('--no-interactive', 'Skip interactive editing');
    this.option('--signoff', 'Add Signed-off-by line', false);
    this.option('-m, --message', 'Message string (skips AI generation)');
    this.action((options: { dryRun: boolean; interactive: boolean; signoff: boolean; message: string }) =>
      this.handleCommit(options),
    );
  }

  async handleCommit(options: { dryRun: boolean; interactive: boolean; signoff: boolean; message: string }) {
    console.log(chalk.cyan('\n🤖 AI Commit Generator\n'));

    // Check git repo
    try {
      await execa('git', ['rev-parse', '--is-inside-work-tree']);
    } catch {
      console.error(chalk.red('✗ Not a git repository'));
      process.exit(1);
    }

    // Check for staged changes
    const { stdout: status } = await execa('git', ['status', '--porcelain'], { reject: false });
    if (!status) {
      console.log(chalk.yellow('Nothing to commit. Working directory clean.'));
      process.exit(0);
    }

    const staged = status
      .split('\n')
      .filter((l) => l.startsWith('M') || l.startsWith('A') || l.startsWith('D') || l.startsWith('R'))
      .join('\n');
    if (!staged) {
      console.log(chalk.yellow('No staged changes found. Run `git add .` first.'));
      process.exit(0);
    }

    // If message provided directly
    if (options.message) {
      await this.commitMessage(options.message, options);
      return;
    }

    // Get staged diff
    let spinner = ora('Reading staged diff...').start();
    let diffResult;
    try {
      diffResult = await getGitDiff({ staged: true });
    } catch (err) {
      spinner.fail('Failed to read diff');
      console.error(chalk.red((err as Error).message));
      process.exit(1);
    }
    spinner.succeed(`Found ${diffResult.totalAdditions} additions, ${diffResult.totalDeletions} deletions across ${diffResult.hunks.length} files`);

    // Build prompt
    const prompt = buildCommitPrompt({
      diff: summarizeDiff(diffResult, 8000),
      language: 'en',
    });

    // Generate commit message
    spinner = ora('Generating commit message...').start();
    let commitMessage: string;
    try {
      const providerId = config.get('provider') as string || 'openai';
      const model = config.get('model') as string;
      const provider = await createProvider(providerId, model);
      const response = await provider.generate({ prompt, systemPrompt: COMMIT_SYSTEM_PROMPT });
      commitMessage = response.text.trim();
    } catch (err) {
      spinner.fail('AI generation failed');
      console.error(chalk.red((err as Error).message));
      console.log(chalk.gray('\nFalling back to basic git commit message...'));
      const basicMsg = `# Changes: (+${diffResult.totalAdditions} -${diffResult.totalDeletions})`;
      commitMessage = basicMsg;
    }
    spinner.succeed('Generated commit message');

    // Interactive edit
    if (options.interactive) {
      // In non-interactive mode, skip
    } else {
      // Simple terminal input for preview
      console.log(chalk.cyan('\n📝 Suggested commit message:'));
      console.log(chalk.gray('---'));
      console.log(chalk.white(commitMessage));
      console.log(chalk.gray('---'));
      console.log('');

      const proceed = await this.promptUser('\nUse this message? (y/n): ');
      if (proceed.toLowerCase() !== 'y') {
        console.log(chalk.yellow('Commit cancelled.'));
        process.exit(0);
      }
    }

    await this.commitMessage(commitMessage, options);
  }

  async commitMessage(message: string, options: { dryRun: boolean; interactive: boolean; signoff: boolean }) {
    console.log(chalk.cyan('\n📝 Final commit message:'));
    console.log(chalk.gray('---'));
    console.log(message);
    console.log(chalk.gray('---'));

    if (options.dryRun) {
      console.log(chalk.cyan('\nDry run mode - not committing'));
      process.exit(0);
    }

    const parts = message.split('\n');
    const subject = parts[0];
    const body = parts.slice(1).join('\n') || undefined;

    const args = ['commit', '-m', subject];
    if (body) args.push('-m', body);
    if (options.signoff) args.push('--signoff');

    const spinner = ora('Creating commit...').start();
    try {
      await execa('git', args, { stdin: 'inherit' });
      spinner.succeed('Commit created!');
      console.log(chalk.green('\n✓ Done. Happy committing!'));
    } catch (err) {
      spinner.fail('Commit failed');
      console.error(chalk.red((err as Error).message));
      process.exit(1);
    }
  }

  async promptUser(query: string): Promise<string> {
    return new Promise((resolve) => {
      process.stdout.write(query);
      process.stdin.setEncoding('utf8');
      process.stdin.once('data', (data) => {
        resolve(data.trim());
        process.stdin.pause();
      });
    });
  }
}

const COMMIT_SYSTEM_PROMPT = `You are an expert software engineer writing commit messages.
Rules:
- Use Conventional Commits format: <type>(<scope>): <description>
- Types: feat, fix, docs, style, refactor, perf, test, build, ci, chore, revert
- Description: imperative mood, lowercase, no trailing period, max 72 chars
- Body: optional, bullet points for breaking changes or key decisions
- Breaking changes: append "!" after type/scope, or add "BREAKING CHANGE:" in body
- Be concise and accurate. Do NOT invent changes not present in the diff.
- Output ONLY the commit message. No preamble, no markdown, no explanation.`;