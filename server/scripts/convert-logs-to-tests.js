#!/usr/bin/env node

/**
 * CLI tool to convert recorded game logs to executable tests
 */

const path = require('path');
const GameTestConverter = require('../tests/GameTestConverter');

function showUsage() {
  console.log(`
Usage: node convert-logs-to-tests.js [options]

Options:
  --input <path>     Path to recorded games directory (default: ../tests/recorded-games)
  --output <path>    Path to output test directory (default: ../tests/generated)  
  --mode <type>      Test type: engine | integration | both (default: engine)
  --single <file>    Convert single log file instead of batch
  --help             Show this help message

Examples:
  # Convert all recorded games to tests
  node convert-logs-to-tests.js

  # Convert specific directories
  node convert-logs-to-tests.js --input ./logs --output ./tests

  # Convert single file
  node convert-logs-to-tests.js --single game-123.json --output ./tests
`);
}

function main() {
  const args = process.argv.slice(2);
  
  if (args.includes('--help')) {
    showUsage();
    return;
  }
  
  let inputDir = path.join(__dirname, '../tests/recorded-games');
  let outputDir = path.join(__dirname, '../tests/generated');
  let singleFile = null;
  let mode = 'engine';
  
  // Parse arguments
  for (let i = 0; i < args.length; i += 2) {
    const flag = args[i];
    const value = args[i + 1];
    
    switch (flag) {
      case '--input':
        inputDir = value;
        break;
      case '--output':
        outputDir = value;
        break;
      case '--single':
        singleFile = value;
        break;
      case '--mode':
        mode = value;
        break;
      default:
        console.error(`Unknown flag: ${flag}`);
        showUsage();
        process.exit(1);
    }
  }
  
  try {
    if (singleFile) {
      // Convert single file
      const inputPath = path.isAbsolute(singleFile) ? singleFile : path.join(inputDir, singleFile);
      console.log(`Converting single file: ${inputPath}`);

      // Engine test
      if (mode === 'engine' || mode === 'both') {
        const engineOut = path.join(outputDir, `${path.basename(singleFile, '.json')}.engine.test.js`);
        GameTestConverter.generateTestFile(inputPath, engineOut);
        console.log(`✅ Engine test generated: ${engineOut}`);
      }

      // Integration test
      if (mode === 'integration' || mode === 'both') {
        const IntegrationTestConverter = require('../tests/IntegrationTestConverter');
        const intOut = path.join(outputDir, `${path.basename(singleFile, '.json')}.integration.test.js`);
        IntegrationTestConverter.generateIntegrationTest(inputPath, intOut);
        console.log(`✅ Integration test generated: ${intOut}`);
      }
    } else {
      // Batch convert all files
      console.log(`Converting logs from: ${inputDir}`);
      console.log(`Generating tests in: ${outputDir}`);
      const IntegrationTestConverter = require('../tests/IntegrationTestConverter');
      
      const files = require('fs').readdirSync(inputDir).filter(f => f.endsWith('.json'));
      for (const f of files) {
        const inPath = path.join(inputDir, f);
        if (mode === 'engine' || mode === 'both') {
          const engineOut = path.join(outputDir, `${path.basename(f, '.json')}.engine.test.js`);
          GameTestConverter.generateTestFile(inPath, engineOut);
          console.log(`✅ Engine test: ${engineOut}`);
        }
        if (mode === 'integration' || mode === 'both') {
          const intOut = path.join(outputDir, `${path.basename(f, '.json')}.integration.test.js`);
          IntegrationTestConverter.generateIntegrationTest(inPath, intOut);
          console.log(`✅ Integration test: ${intOut}`);
        }
      }
      
      console.log(`\n🎉 Conversion complete!`);
      console.log(`\nTo run the generated tests:`);
      console.log(`  cd ${path.relative(process.cwd(), outputDir)}`);
      console.log(`  npm test`);
    }
  } catch (error) {
    console.error('❌ Conversion failed:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}