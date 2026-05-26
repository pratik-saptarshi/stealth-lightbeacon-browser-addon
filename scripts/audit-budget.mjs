#!/usr/bin/env node
import fs from 'node:fs';

const args = process.argv.slice(2);
const failOnCritical = args.includes('--fail-on-critical');
const failOnHigh = args.includes('--fail-on-high');
const criticalLimitArg = readValue(args, '--max-critical');
const highLimitArg = readValue(args, '--max-high');
const maxCritical = criticalLimitArg === null ? 0 : Number(criticalLimitArg);
const maxHigh = highLimitArg === null ? 0 : Number(highLimitArg);

const inputPath = readValue(args, '--path');

readInput(inputPath)
  .then((raw) => {
    const snapshot = JSON.parse(raw);
    const summary = resolveSummary(snapshot);

    if (Number.isNaN(maxCritical) || Number.isNaN(maxHigh)) {
      console.error('Invalid numeric threshold for max-critical/max-high');
      process.exit(3);
    }

    if (failOnCritical && summary.bySeverity.critical > maxCritical) {
      console.error(`Budget gate failed: critical issues ${summary.bySeverity.critical} > ${maxCritical}`);
      process.exit(2);
    }

    if (failOnHigh && summary.bySeverity.high > maxHigh) {
      console.error(`Budget gate failed: high issues ${summary.bySeverity.high} > ${maxHigh}`);
      process.exit(2);
    }

    if (failOnCritical || failOnHigh) {
      console.log(`Budget gate passed (critical=${summary.bySeverity.critical}, high=${summary.bySeverity.high}, total=${summary.total})`);
    } else {
      console.log('Budget gate command ready. Use --fail-on-critical to enforce thresholds.');
    }

    process.exit(0);
  })
  .catch((error) => {
    console.error('Audit budget failed to parse snapshot:', String(error));
    process.exit(1);
  });

function resolveSummary(snapshot) {
  const issues = Array.isArray(snapshot?.issues) ? snapshot.issues : [];
  const bySeverity = {
    critical: 0,
    high: 0,
    medium: 0,
    low: 0
  };

  for (const issue of issues) {
    if (issue?.severity && bySeverity[issue.severity] !== undefined) {
      bySeverity[issue.severity] += 1;
    }
  }

  return {
    total: issues.length,
    bySeverity
  };
}

function readInput(pathValue) {
  if (pathValue) {
    return fs.promises.readFile(pathValue, 'utf8');
  }

  return new Promise((resolve, reject) => {
    let input = '';
    process.stdin.setEncoding('utf8');

    process.stdin.on('data', (chunk) => {
      input += chunk;
    });

    process.stdin.on('end', () => {
      if (!input.trim()) {
        reject(new Error('No snapshot input provided'));
        return;
      }

      resolve(input);
    });

    process.stdin.on('error', reject);
  });
}

function readValue(args, flag) {
  const index = args.indexOf(flag);
  if (index < 0 || index + 1 >= args.length) {
    return null;
  }

  return args[index + 1];
}
