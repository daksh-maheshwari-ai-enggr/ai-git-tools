import { Command } from 'commander';
import chalk from 'chalk';

export class VersionCommand extends Command {
  constructor() {
    super('version');
    this.description('Show version information');
    this.name = 'version';
    this.action(() => {
      console.log(chalk.cyan('gh-ai v0.1.0'));
      console.log(chalk.gray('GitHub AI Help Toolkit'));
    });
  }
}