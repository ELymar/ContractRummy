#!/usr/bin/env node

/**
 * Script to add a curated regression test from auto-generated content
 */

const fs = require('fs');
const path = require('path');

function showUsage() {
  console.log(`
📋 Add Regression Test

Usage: node add-regression-test.js <game-id> <test-name>

Arguments:
  game-id     The game ID from recorded-games (without .json extension)
  test-name   Descriptive name for the regression test

Example:
  node add-regression-test.js 84c95dd3-86e7-4097-8efb-4d2e00ae5ecd basic-game-flow

This will:
1. Copy tests/recorded-games/{game-id}.json → tests/regression/{test-name}.log.json
2. Copy tests/generated/{game-id}.engine.test.js → tests/regression/{test-name}.engine.test.js  
3. Copy tests/generated/{game-id}.integration.test.js → tests/regression/{test-name}.integration.test.js
4. Update test names in the copied files
`);
}

function main() {
  const args = process.argv.slice(2);
  
  if (args.length !== 2 || args.includes('--help') || args.includes('-h')) {
    showUsage();
    process.exit(args.includes('--help') || args.includes('-h') ? 0 : 1);
  }
  
  const [gameId, testName] = args;
  
  const logSrc = path.join(__dirname, '../tests/recorded-games', `${gameId}.json`);
  const engineSrc = path.join(__dirname, '../tests/generated', `${gameId}.engine.test.js`);
  const integrationSrc = path.join(__dirname, '../tests/generated', `${gameId}.integration.test.js`);
  
  const logDest = path.join(__dirname, '../tests/regression', `${testName}.log.json`);
  const engineDest = path.join(__dirname, '../tests/regression', `${testName}.engine.test.js`);
  const integrationDest = path.join(__dirname, '../tests/regression', `${testName}.integration.test.js`);
  
  // Check source files exist
  if (!fs.existsSync(logSrc)) {
    console.error(`❌ Log file not found: ${logSrc}`);
    process.exit(1);
  }
  
  if (!fs.existsSync(engineSrc)) {
    console.error(`❌ Engine test not found: ${engineSrc}`);
    console.log(`💡 Generate it first: node scripts/convert-logs-to-tests.js --single ${gameId}.json --mode engine`);
    process.exit(1);
  }
  
  if (!fs.existsSync(integrationSrc)) {
    console.error(`❌ Integration test not found: ${integrationSrc}`);
    console.log(`💡 Generate it first: node scripts/convert-logs-to-tests.js --single ${gameId}.json --mode integration`);
    process.exit(1);
  }
  
  // Copy log file
  console.log(`📄 Copying log: ${path.basename(logSrc)} → ${path.basename(logDest)}`);
  fs.copyFileSync(logSrc, logDest);
  
  // Copy and update engine test
  console.log(`🔧 Copying engine test: ${path.basename(engineSrc)} → ${path.basename(engineDest)}`);
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
  
  // Copy and update integration test  
  console.log(`🌐 Copying integration test: ${path.basename(integrationSrc)} → ${path.basename(integrationDest)}`);
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
  
  console.log(`\n✅ Regression test '${testName}' created successfully!`);
  console.log(`\nTo run:`);
  console.log(`  npm test -- tests/regression/${testName}`);
  console.log(`\nFiles created:`);
  console.log(`  - tests/regression/${testName}.log.json`);
  console.log(`  - tests/regression/${testName}.engine.test.js`);
  console.log(`  - tests/regression/${testName}.integration.test.js`);
}

main();