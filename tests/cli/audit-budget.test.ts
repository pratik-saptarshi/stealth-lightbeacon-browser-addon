import { describe, expect, it } from 'vitest';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const snapshotWithNoCritical = {
  issues: [
    { severity: 'high' },
    { severity: 'medium' }
  ]
};

const snapshotWithCritical = {
  issues: [
    { severity: 'critical' },
    { severity: 'critical' },
    { severity: 'high' }
  ]
};

describe('audit budget command', () => {
  it('passes when no critical issues exceed threshold', () => {
    const result = execFileSync(
      'node',
      ['scripts/audit-budget.mjs', '--path', makeTempFile(snapshotWithNoCritical), '--fail-on-critical', '--max-critical', '0'],
      { encoding: 'utf8', stdio: 'pipe' }
    );

    expect(result).toContain('Budget gate passed');
  });

  it('fails with code 2 when critical budget is exceeded', () => {
    try {
      execFileSync('node', ['scripts/audit-budget.mjs', '--path', makeTempFile(snapshotWithCritical), '--fail-on-critical', '--max-critical', '0']);
      throw new Error('Expected budget failure');
    } catch (error) {
      expect((error as any).status).toBe(2);
      expect((error as any).stderr.toString()).toContain('Budget gate failed');
    }
  });

  it('fails with code 2 when fail-on-high is exceeded', () => {
    try {
      execFileSync(
        'node',
        ['scripts/audit-budget.mjs', '--path', makeTempFile(snapshotWithNoCritical), '--fail-on-high', '--max-high', '0']
      );
      throw new Error('Expected budget failure');
    } catch (error) {
      expect((error as any).status).toBe(2);
      expect((error as any).stderr.toString()).toContain('Budget gate failed');
    }
  });
});

function makeTempFile(payload: unknown): string {
  const temp = `snap-${Math.random().toString(16).slice(2)}.json`;
  const target = path.join(process.cwd(), 'tmp', temp);

  if (!fs.existsSync(path.join(process.cwd(), 'tmp'))) {
    fs.mkdirSync(path.join(process.cwd(), 'tmp'));
  }

  fs.writeFileSync(target, JSON.stringify(payload), 'utf8');
  return target;
}
