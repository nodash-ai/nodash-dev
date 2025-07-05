#!/usr/bin/env node

import { Command } from 'commander';
import chalk from 'chalk';
import { generateSDK } from './generator.js';
import path from 'path';

const program = new Command();

program
  .name('nodash-generate-sdk')
  .description('Generate Nodash SDK from server API definitions')
  .version('1.0.0');

program
  .command('generate')
  .description('Generate SDK from all server definitions')
  .option('-s, --servers <path>', 'Path to servers directory', '../../servers')
  .option('--public-repo <path>', 'Path to public repository', '../../../../nodash')
  .action(async (options) => {
    try {
      console.log(chalk.blue('🚀 Generating Nodash SDK from server definitions...'));
      
      await generateSDK({
        serversPath: path.resolve(options.servers),
        publicRepoPath: path.resolve(options.publicRepo)
      });
      
      console.log(chalk.green('✅ SDK generation completed successfully!'));
    } catch (error) {
      console.error(chalk.red('❌ SDK generation failed:'), error);
      process.exit(1);
    }
  });

program.parse();
