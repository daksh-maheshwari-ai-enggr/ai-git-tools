#!/usr/bin/env node
import { App } from './components/App.tsx';
import { render } from 'ink';
import commander from 'commander';
import { HelpCommand } from './components/HelpCommand.js';
import { VersionCommand } from './components/VersionCommand.js';
import { ConfigCommand } from './commands/config/index.js';
import { AuthCommand } from './commands/auth/index.js';
import { CommitCommand } from './commands/commit/index.js';
import { PrCommand } from './commands/pr/index.js';
import { ReleaseCommand } from './commands/release/index.js';

const program = new commander.Command();
program
  .name('gh-ai')
  .alias('ai')
  .description('GitHub AI Help Toolkit — enhance your Git workflow with AI')
  .version('0.1.0')
  .command('help', 'show help')
  .addHelpCommand(new HelpCommand())
  .addCommand(new VersionCommand())
  .addCommand(new ConfigCommand())
  .addCommand(new AuthCommand())
  .addCommand(new CommitCommand())
  .addCommand(new PrCommand())
  .addCommand(new ReleaseCommand());

program.parse(process.argv);

// Fallback: if no command given, show interactive TUI
if (process.argv.length <= 2) {
  render(<App />);
}