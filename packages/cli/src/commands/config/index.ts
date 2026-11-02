import { Command } from 'commander';
import chalk from 'chalk';
import { config } from '../../config/ConfigProvider.js';
import { type ProviderId, PROVIDER_CONFIGS } from '@ai-git-tools/core';

export class ConfigCommand extends Command {
  constructor() {
    super('config');
    this.description('Configure AI provider and settings');
    this.name = 'config';

    this.addCommand(
      new Command('list')
        .description('Show current configuration')
        .action(() => this.listConfig()),
    );

    this.addCommand(
      new Command('provider')
        .description('Set AI provider')
        .arguments('<provider>')
        .action((provider: string) => this.setProvider(provider)),
    );

    this.addCommand(
      new Command('model')
        .description('Set AI model')
        .arguments('<model>')
        .action((model: string) => this.setModel(model)),
    );

    this.addCommand(
      new Command('api-url')
        .description('Set API server URL')
        .arguments('<url>')
        .action((url: string) => this.setApiUrl(url)),
    );

    this.addCommand(
      new Command('set-key')
        .description('Set API key for current provider')
        .arguments('<key>')
        .action((key: string) => this.setApiKey(key)),
    );
  }

  listConfig() {
    const currentProvider = config.get('provider') as string;
    const currentModel = config.get('model') as string;
    const apiUrl = config.get('apiUrl') as string;
    const githubToken = config.get('githubToken') as string;

    console.log(chalk.cyan('\n📋 Current Configuration:'));
    console.log('');
    console.log(`  Provider:    ${chalk.yellow(currentProvider)}`);
    console.log(`  Model:       ${chalk.yellow(currentModel || '(default)')}`);
    console.log(`  API URL:     ${chalk.yellow(apiUrl)}`);
    console.log(`  GitHub API:  ${chalk.yellow(githubToken ? 'Configured' : 'Not set')}`);
    console.log('');

    console.log(chalk.cyan('Available Providers:'));
    for (const [id, cfg] of Object.entries(PROVIDER_CONFIGS)) {
      const current = id === currentProvider ? chalk.green(' (current)') : '';
      console.log(`  ${chalk.yellow(id)}: ${cfg.label}${current}`);
    }
    console.log('');
  }

  setProvider(provider: string) {
    if (!PROVIDER_CONFIGS[provider as ProviderId]) {
      console.error(chalk.red(`✗ Unknown provider: ${provider}`));
      console.log(chalk.gray('Run `gh-ai config list` to see available providers.'));
      process.exit(1);
    }

    config.set('provider', provider);
    console.log(chalk.green(`✓ Provider set to: ${provider}`));
  }

  setModel(model: string) {
    config.set('model', model);
    console.log(chalk.green(`✓ Model set to: ${model}`));
  }

  setApiUrl(url: string) {
    config.set('apiUrl', url);
    console.log(chalk.green(`✓ API URL set to: ${url}`));
  }

  setApiKey(key: string) {
    process.env['GROQ_API_KEY'] = key;
    config.set('apiKey', key);
    console.log(chalk.green('✓ API key configured'));
    console.log(chalk.gray('Note: Keys are stored in plain text. In production, use a secret store.'));
  }
}