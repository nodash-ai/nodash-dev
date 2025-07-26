#!/usr/bin/env node

import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class BuildVerifier {
  constructor() {
    this.results = [];
    this.startTime = Date.now();
  }

  async runCommand(command, args, cwd, description) {
    console.log(`\n🔧 ${description}...`);

    return new Promise(resolve => {
      const child = spawn(command, args, {
        stdio: 'inherit',
        shell: true,
        cwd: cwd || process.cwd(),
      });

      const startTime = Date.now();

      child.on('close', code => {
        const duration = Date.now() - startTime;
        const success = code === 0;

        this.results.push({
          description,
          success,
          duration,
          code,
          cwd: cwd || process.cwd(),
        });

        if (success) {
          console.log(`✅ ${description} completed in ${duration}ms`);
        } else {
          console.log(`❌ ${description} failed with code ${code} after ${duration}ms`);
        }

        resolve(success);
      });

      child.on('error', error => {
        console.error(`❌ Failed to start ${description}:`, error.message);
        this.results.push({
          description,
          success: false,
          duration: Date.now() - startTime,
          error: error.message,
          cwd: cwd || process.cwd(),
        });
        resolve(false);
      });
    });
  }

  async verifyServiceExports() {
    console.log(`\n📦 Verifying service exports...`);

    const packageJsonPath = path.join(process.cwd(), 'package.json');
    const distPath = path.join(process.cwd(), 'dist');

    if (!fs.existsSync(packageJsonPath)) {
      console.log(`❌ package.json not found`);
      return false;
    }

    if (!fs.existsSync(distPath)) {
      console.log(`❌ dist directory not found`);
      return false;
    }

    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
    const main = packageJson.main;
    const bin = packageJson.bin;

    let allExportsExist = true;

    // Check main export
    if (main) {
      const mainPath = path.join(process.cwd(), main);
      if (!fs.existsSync(mainPath)) {
        console.log(`❌ Main export not found: ${main}`);
        allExportsExist = false;
      } else {
        console.log(`✅ Main export exists: ${main}`);
      }
    }

    // Check bin exports
    if (bin && typeof bin === 'object') {
      for (const [binName, binPath] of Object.entries(bin)) {
        const fullBinPath = path.join(process.cwd(), binPath);
        if (!fs.existsSync(fullBinPath)) {
          console.log(`❌ Binary export not found: ${binName} -> ${binPath}`);
          allExportsExist = false;
        } else {
          console.log(`✅ Binary export exists: ${binName} -> ${binPath}`);
        }
      }
    }

    return allExportsExist;
  }

  async verifyServiceBuild() {
    console.log('🏗️  Starting service build verification...\n');

    let allSuccess = true;

    // 1. Clean build artifacts
    const cleanSuccess = await this.runCommand(
      'npm',
      ['run', 'clean'],
      process.cwd(),
      'Clean build artifacts'
    );

    if (!cleanSuccess) {
      // If clean script doesn't exist, manually clean
      console.log('⏭️  No clean script found, manually cleaning dist/');
      try {
        if (fs.existsSync('dist')) {
          fs.rmSync('dist', { recursive: true, force: true });
          console.log('✅ Manually cleaned dist directory');
        }
      } catch (error) {
        console.log(`❌ Failed to clean dist directory: ${error.message}`);
        allSuccess = false;
      }
    }

    // 2. Build the service (only if dist doesn't exist)
    let buildSuccess = true;
    if (!fs.existsSync('dist')) {
      buildSuccess = await this.runCommand('npx', ['tsc'], process.cwd(), 'Build service');
    } else {
      console.log('✅ Build artifacts already exist, skipping build');
    }

    if (!buildSuccess) {
      allSuccess = false;
    } else {
      // 3. Verify service exports
      const exportsSuccess = await this.verifyServiceExports();
      if (!exportsSuccess) {
        allSuccess = false;
      }

      this.results.push({
        description: 'Service export verification',
        success: exportsSuccess,
        duration: 0,
      });
    }

    // 4. Verify TypeScript compilation
    console.log('\n🔧 TypeScript compilation check...');
    const typecheckSuccess = await this.runCommand(
      'npm',
      ['run', 'typecheck'],
      process.cwd(),
      'TypeScript type checking'
    );

    if (!typecheckSuccess) {
      allSuccess = false;
    }

    // 5. Validate package.json
    console.log('\n📋 Validating package.json...');
    const packageJsonPath = path.join(process.cwd(), 'package.json');
    if (fs.existsSync(packageJsonPath)) {
      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));

      // Verify package.json has required fields for a service
      const requiredFields = ['name', 'version', 'main'];
      let packageValid = true;

      for (const field of requiredFields) {
        if (!packageJson[field]) {
          console.log(`❌ package.json missing required field: ${field}`);
          packageValid = false;
        }
      }

      // Check for service-specific fields
      if (!packageJson.scripts || !packageJson.scripts.start) {
        console.log(`❌ package.json missing start script`);
        packageValid = false;
      }

      if (packageValid) {
        console.log(`✅ package.json is valid`);
      }

      this.results.push({
        description: 'Package.json validation',
        success: packageValid,
        duration: 0,
      });

      if (!packageValid) {
        allSuccess = false;
      }
    }

    // 6. Test service imports and syntax (dry run)
    if (allSuccess) {
      console.log('\n🚀 Testing service syntax and imports...');
      // Test that the built service can be loaded without syntax errors
      const syntaxTest = await this.runCommand(
        'node',
        ['-c', 'dist/index.js'],
        process.cwd(),
        'Service syntax validation'
      );

      // Don't fail the build if syntax test fails
      if (!syntaxTest) {
        console.log('⚠️  Service syntax validation failed');
        allSuccess = false;
      }

      this.results.push({
        description: 'Service syntax validation',
        success: syntaxTest,
        duration: 0,
      });
    }

    this.printSummary();
    return allSuccess;
  }

  printSummary() {
    const totalDuration = Date.now() - this.startTime;
    const passed = this.results.filter(r => r.success).length;
    const failed = this.results.filter(r => !r.success).length;

    console.log('\n' + '='.repeat(60));
    console.log('🏗️  BUILD VERIFICATION SUMMARY');
    console.log('='.repeat(60));

    this.results.forEach(result => {
      const status = result.success ? '✅' : '❌';
      const duration = result.duration ? `${result.duration}ms` : '';
      console.log(`${status} ${result.description.padEnd(40)} ${duration.padStart(8)}`);
    });

    console.log('='.repeat(60));
    console.log(`📈 Results: ${passed} passed, ${failed} failed`);
    console.log(`⏱️  Total time: ${totalDuration}ms`);

    if (failed > 0) {
      console.log('\n❌ Some build verifications failed. Check the output above for details.');
    } else {
      console.log('\n🎉 All build verifications passed!');
    }
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const verifier = new BuildVerifier();
  verifier
    .verifyServiceBuild()
    .then(success => {
      process.exit(success ? 0 : 1);
    })
    .catch(error => {
      console.error('❌ Build verification failed:', error);
      process.exit(1);
    });
}

export default BuildVerifier;
