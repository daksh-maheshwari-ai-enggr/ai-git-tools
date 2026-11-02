import { Command } from 'commander';
import chalk from 'chalk';
import { execa } from 'execa';
import ora from 'ora';
import { createProvider, buildReleaseNotesPrompt, getGitLog, RELEASE_NOTES_SYSTEM_PROMPT } from '@ai-git-tools/core';

export class ReleaseCommand extends Command {
  constructor() {
    super('release');
    this.description('Generate release notes from git history');
    this.name = 'release';

    this.addCommand(
      new Command('notes')
        .description('Generate release notes')
        .option('-v, --version', 'Release version (e.g., v1.0.0)', 'unreleased')
        .option('-b, --base', 'Git ref to compare against (tag or commit)', 'HEAD~1')
        .option('--no-interactive', 'Skip preview')
        .action((options: { version: string; base: string; interactive: boolean }) =>
          this.handleGenerate(options),
        ),
    );
  }

  async handleGenerate(options: { version: string; base: string; interactive: boolean }) {
    console.log(chalk.cyan('\n📦 Release Notes Generator\n'));

    // Get commits since base
    let spinner = ora(`Collecting commits since ${options.base}...`).start();
    const commits = await getGitLog({ range: options.base });
    spinner.succeed(`Found ${commits.length} commits`);

    if (commits.length === 0) {
      console.log(chalk.yellow('No commits to include in release notes.'));
      process.exit(0);
    }

    // Build release notes prompt
    spinner = ora('Generating release notes...').start();
    const commitText = commits
      .map((c) => {
        const type = c.type ?? 'feat';
        const scope = c.scope ? `(${c.scope})` : '';
        return `- ${type}${scope} ${c.description ?? c.message}`;
      })
      .join('\n');

    const prompt = buildReleaseNotesPrompt({
      commits: commitText,
      version: options.version,
    });

    let releaseNotes: string;
    try {
      const providerId = process.env['GH_AI_PROVIDER'] || 'openai';
      const model = process.env['GH_AI_MODEL'];
      const provider = await createProvider(providerId as any, model);
      const response = await provider.generate({ prompt, systemPrompt: RELEASE_NOTES_SYSTEM_PROMPT });
      releaseNotes = response.text.trim();
    } catch (err) {
      spinner.fail('AI generation failed');
      console.error(chalk.red((err as Error).message));
      process.exit(1);
    }
    spinner.succeed('Generated release notes');

    console.log(chalk.cyan('\n📋 Release Notes:'));
    console.log(chalk.gray('---'));
    console.log(releaseNotes);
    console.log(chalk.gray('---'));

    console.log(chalk.cyan('\n✓ Tip: Save this to CHANGELOG.md or use it for GitHub releases'));
  }
}