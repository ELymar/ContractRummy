#!/usr/bin/env node

/**
 * Script to regenerate all regression tests from their log files
 * Useful when test generation logic is improved
 */

const fs = require('fs');
const path = require('path');
const {execSync} = require('child_process');

function main() {
  const regressionDir = path.join(__dirname, '../tests/regression');

  if (!fs.existsSync(regressionDir)) {
    console.error('❌ Regression tests directory not found');
    process.exit(1);
  }

  // Find all .log.json files
  const logFiles = fs
    .readdirSync(regressionDir)
    .filter((file) => file.endsWith('.log.json'))
    .map((file) => file.replace('.log.json', ''));

  if (logFiles.length === 0) {
    console.log('📭 No regression test logs found');
    return;
  }

  console.log(`🔄 Regenerating ${logFiles.length} regression test(s)...`);

  for (const testName of logFiles) {
    console.log(`\n📋 Processing: ${testName}`);

    const logFile = path.join(regressionDir, `${testName}.log.json`);
    const tempOutputDir = path.join(__dirname, '../tests/generated');

    try {
      // Generate tests to temporary location
      console.log('  🔧 Generating engine test...');
      execSync(`node scripts/convert-logs-to-tests.js --single "${logFile}" --mode engine`, {
        cwd: path.join(__dirname, '..'),
        stdio: 'pipe',
      });

      console.log('  🌐 Generating integration test...');
      execSync(`node scripts/convert-logs-to-tests.js --single "${logFile}" --mode integration`, {
        cwd: path.join(__dirname, '..'),
        stdio: 'pipe',
      });

      // Extract the game ID from the log file to find generated files
      const gameId = extractGameIdFromFilename(logFile);

      if (!gameId) {
        console.error(`  ❌ Could not determine game ID for ${testName}`);
        continue;
      }

      // Copy and update the generated files
      const engineSrc = path.join(tempOutputDir, `${gameId}.engine.test.js`);
      const integrationSrc = path.join(tempOutputDir, `${gameId}.integration.test.js`);
      const engineDest = path.join(regressionDir, `${testName}.engine.test.js`);
      const integrationDest = path.join(regressionDir, `${testName}.integration.test.js`);

      if (fs.existsSync(engineSrc)) {
        console.log('  📄 Updating engine test...');
        let engineContent = fs.readFileSync(engineSrc, 'utf8');
        engineContent = engineContent.replace(
          new RegExp(`recorded-game-${gameId}`, 'g'),
          `regression-${testName}-engine`
        );
        engineContent = engineContent.replace(
          new RegExp(`Auto-generated test from recorded game: ${gameId}`),
          `Regression test: ${testName} (engine)`
        );
        fs.writeFileSync(engineDest, engineContent);
      }

      if (fs.existsSync(integrationSrc)) {
        console.log('  📄 Updating integration test...');
        let integrationContent = fs.readFileSync(integrationSrc, 'utf8');
        integrationContent = integrationContent.replace(
          new RegExp(`Integration replay from log ${gameId}.json`),
          `Regression test: ${testName} (integration)`
        );
        integrationContent = integrationContent.replace(
          /replays action stream deterministically/,
          `replays ${testName} scenario deterministically`
        );
        fs.writeFileSync(integrationDest, integrationContent);
      }

      console.log(`  ✅ ${testName} regenerated successfully`);
    } catch (error) {
      console.error(`  ❌ Failed to regenerate ${testName}:`, error.message);
    }
  }

  console.log(`\n🎉 Regeneration complete!`);
  console.log(`\nTo run all regression tests:`);
  console.log(`  npm test -- tests/regression/`);
}

function extractGameIdFromFilename(logFile) {
  // Try to extract game ID from first line of log file
  try {
    const content = fs.readFileSync(logFile, 'utf8');
    const lines = content.trim().split('\n');
    if (lines.length > 0) {
      const firstLog = JSON.parse(lines[0]);
      return firstLog.gameId;
    }
  } catch {
    // Fallback: use filename if structured properly
    const basename = path.basename(logFile, '.log.json');
    return basename;
  }
  return null;
}

main();
