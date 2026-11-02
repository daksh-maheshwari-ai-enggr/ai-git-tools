import { Command } from 'commander';
import chalk from 'chalk';
import { execa } from 'execa';
import { open } from 'open';
import { config } from '../../config/ConfigProvider.js';

export class AuthCommand extends Command {
  constructor() {
    super('auth');
    this.description('Manage GitHub authentication');
    this.name = 'auth';

    this.addCommand(
      new Command('login')
        .description('Authenticate with GitHub CLI')
        .action(() => this.handleLogin()),
    );

    this.addCommand(
      new Command('status')
        .description('Check authentication status')
        .action(() => this.handleStatus()),
    );
  }

  async handleLogin() {
    console.log(chalk.cyan('🔐 Authenticating with GitHub CLI...\n'));

    try {
      // Check if gh is installed
      await execa('gh', ['--version']);
    } catch {
      console.error(chalk.red('✗ GitHub CLI (gh) is not installed.'));
      console.error(chalk.gray('Install it from: https://cli.github.com/'));
      process.exit(1);
    }

    // Try to get the current token
    try {
      const { stdout: token } = await execa('gh', ['auth', 'token']);
      if (token && token.trim()) {
        console.log(chalk.green('✓ Already authenticated with GitHub!'));
        console.log(chalk.gray(`Token scope: $(gh auth status 2>/dev/null | grep -o 'scope:[^ ]*' || echo 'unknown')`));
        return;
      }
    } catch {
      // Not logged in
    }

    console.log(chalk.yellow('Not authenticated. Starting GitHub CLI login...\n'));
    console.log(chalk.gray('Tip: Choose "GitHub CLI" as the authentication method.'));
    console.log(chalk.gray('Select "Login with a web browser".\n'));

    // Open the browser for GitHub OAuth
    const loginUrl = 'https://github.com/login/device';
    console.log(chalk.blue(`Opening ${loginUrl} in your browser...`));

    try {
      await open(loginUrl);
    } catch {
      console.log(chalk.gray('Could not open browser. Please visit:'));
      console.log(chalk.cyan(loginUrl));
    }

    console.log(chalk.cyan('\nAfter authenticating, return here and continue.'));
    console.log(chalk.gray('Run: gh auth login'));

    // Run gh auth login interactively
    try {
      await execa('gh', ['auth', 'login'], {
        stdin: 'inherit',
        stdio: ['inherit', 'inherit', 'inherit'],
      });

      // Store the token for our API
      const { stdout: newToken } = await execa('gh', ['auth', 'token']);
      config.set('githubToken', newToken.trim());

      console.log(chalk.green('\n✓ Successfully authenticated!'));
    } catch (err) {
      console.error(chalk.red('\n✗ Authentication failed or was cancelled.'));
      process.exit(1);
    }
  }

  async handleStatus() {
    try {
      await execa('gh', ['auth', 'status'], { stdio: 'pipe' });
      console.log(chalk.green('✓ GitHub CLI: Authenticated'));

      // Check API token (if stored)
      const storedToken = config.get('githubToken') as string;
      if (storedToken) {
        console.log(chalk.green('✓ API Token: Configured'));
      } else {
        console.log(chalk.yellow('⚠ API Token: Not configured'));
        console.log(chalk.gray('Run `gh-ai auth login` to configure.'));
      }
    } catch {
      console.log(chalk.red('✗ GitHub CLI: Not authenticated'));
      console.log(chalk.gray('Run `gh auth login` to authenticate.'));
    }
  }
}