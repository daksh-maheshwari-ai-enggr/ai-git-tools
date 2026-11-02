import { Command } from 'commander';
import chalk from 'chalk';

export class HelpCommand extends Command {
  constructor() {
    super('help');
    this.description('Show help information');
    this.name = 'help';
    this.action(() => {
      console.log(chalk.cyan('\nUsage: gh-ai [options] [command]\n'));
      console.log(chalk.bold('Commands:'));
      console.log('  commit     Generate commit message from staged diff');
      console.log('  pr         Pull request commands (create, review)');
      console.log('  release    Generate release notes');
      console.log('  config     Configure AI provider and settings');
      console.log('  auth       Manage GitHub authentication');
      console.log('  version    Show version');
      console.log('  help       Show this help\n');
      console.log(chalk.gray('Run `gh-ai commit` to get started with AI-assisted commits.'));
    });
  }
}