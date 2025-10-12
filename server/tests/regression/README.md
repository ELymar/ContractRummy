# Regression Tests

This directory contains curated log/test pairs that are committed to version control for regression testing.

## Structure

Each test case should have:
- `{name}.log.json` - The recorded game log
- `{name}.engine.test.js` - Generated engine test
- `{name}.integration.test.js` - Generated integration test

## Usage

### Adding a new regression test:

1. Play a game that demonstrates the behavior you want to test
2. Find the log in `tests/recorded-games/`
3. Generate tests using the converter script:
   ```bash
   node scripts/convert-logs-to-tests.js --single {log-file} --mode both
   ```
4. Copy the log and generated tests to this directory with descriptive names:
   ```bash
   cp tests/recorded-games/{game-id}.json tests/regression/{descriptive-name}.log.json
   cp tests/generated/{game-id}.engine.test.js tests/regression/{descriptive-name}.engine.test.js
   cp tests/generated/{game-id}.integration.test.js tests/regression/{descriptive-name}.integration.test.js
   ```

### Regenerating tests from logs:

If tests need to be updated due to test generator improvements:

```bash
# From server directory
node scripts/convert-logs-to-tests.js --single tests/regression/{name}.log.json --mode both
# Then manually copy the generated tests back to regression folder
```

### Running regression tests:

```bash
npm test -- tests/regression/
```

## Guidelines

- Use descriptive names that explain what the test covers
- Include tests for:
  - Basic game flow (join, ready, deal, basic turns)
  - Edge cases (player quit, network issues, invalid moves)
  - Game completion scenarios
  - Multi-round games
- Keep logs focused - prefer shorter, targeted test cases over long games
- Document any special setup or context in comments within the test files