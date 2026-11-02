import { Command } from 'commander';
import chalk from 'chalk';
import { execa } from 'execa';
import ora from 'ora';
import { createProvider } from '@ai-git-tools/core';
import { buildPrPrompt, summarizeDiff, getGitDiff } from '@ai-git-tools/core';
import { config } from '../../config/ConfigProvider.js';

export class PrCommand extends Command {
  constructor() {
    super('pr');
    this.description('Pull request operations');
    this.name = 'pr';

    this.addCommand(
      new Command('create')
        .description('Generate PR title/description and create PR')
        .option('-d, --dry-run', 'Preview but do not create')
        .option('--no-interactive', 'Skip interactive editing')
        .option('--base', 'Base branch (default: main or master)', 'main')
        .option('--draft', 'Create as draft PR', false)
        .action((options: { dryRun: boolean; interactive: boolean; base: string; draft: boolean }) =>
          this.handleCreate(options),
        ),
    );
  }

  async handleCreate(options: { dryRun: boolean; interactive: boolean; base: string; draft: boolean }) {
    console.log(chalk.cyan('\n📝 PR Description Generator\n'));

    // Check git repo
    try {
      await execa('git', ['rev-parse', '--is-inside-work-tree']);
    } catch {
      console.error(chalk.red('✗ Not a git repository'));
      process.exit(1);
    }

    // Get current branch
    const { stdout: branch } = await execa('git', ['rev-parse', '--abbrev-ref', 'HEAD']);
    const branchName = branch.trim();

    // Check for remote
    const { stdout: remotes } = await execa('git', ['remote']);
    const remoteName = remotes.trim().split('\n')[0] ?? 'origin';

    // Get diff against base
    let spinner = ora(`Reading diff vs ${options.base}...`).start();
    let diffResult;
    try {
      diffResult = await getGitDiff({ staged: true });
    } catch (err) {
      spinner.fail('Failed to read diff');
      console.error(chalk.red((err as Error).message));
      process.exit(1);
    }

    if (diffResult.totalAdditions === 0 && diffResult.totalDeletions === 0) {
      console.log(chalk.yellow('No changes to include in PR.'));
      process.exit(0);
    }

    spinner.succeed(`Found ${diffResult.hunks.length} files changed`);

    // Generate PR description
    spinner = ora('Generating PR description...').start();
    const prompt = buildPrPrompt({
      diff: summarizeDiff(diffResult, 6000),
      branch: branchName,
      base: options.base,
      context: `Branch: ${branchName}`,
    });

    let prBody: string;
    try {
      const providerId = config.get('provider') as string || 'openai';
      const model = config.get('model') as string;
      const provider = await createProvider(providerId, model);
      const response = await provider.generate({ prompt, systemPrompt: PR_SYSTEM_PROMPT });
      prBody = response.text.trim();
    } catch (err) {
      spinner.fail('AI generation failed');
      console.error(chalk.red((err as Error).message));
      process.exit(1);
    }
    spinner.succeed('Generated PR description');

    console.log(chalk.cyan('\n📋 Suggested PR body:'));
    console.log(chalk.gray('---'));
    console.log(prBody);
    console.log(chalk.gray('---'));

    if (options.dryRun) {
      console.log(chalk.cyan('\nDry run mode - not creating PR'));
      process.exit(0);
    }

    // Create PR using gh CLI
    spinner = ora('Creating pull request...').start();
    const titleMatch = prBody.match(/^## Summary\s*\n([^#\n]+)/i);
    const title = titleMatch?.[1]?.trim() ?? branchName;
    const bodyLines = prBody.split('\n');
    const body = bodyLines.slice(1).join('\n');

    try {
      const args = ['pr', 'create', '--title', title, '--body', body, '--base', options.base];
      if (options.draft) args.push('--draft');

      const { stdout: prUrl } = await execa('gh', [...args], { input: '' });
      spinner.succeed('Created pull request!');
      console.log(chalk.green(`\n✓ PR created: ${prUrl}`));
    } catch (err) {
      spinner.fail('PR creation failed');
      console.error(chalk.red((err as Error).message));
      console.log(chalk.gray('\nTip: Make sure you have a remote set up and push your branch first.'));
      process.exit(1);
    }
  }
}

const PR_SYSTEM_PROMPT = `You are an expert software engineer writing pull request descriptions.
Rules:
- Title: concise, imperative, describes the WHAT not the WHY
- Body: structured with sections: Summary, Changes, Testing, Related Issues
- Be specific. Reference file paths and function names where relevant.
- Output ONLY the PR description starting with ## Summary. No preamble.`;