export type ValidationCoverageStatus = 'catalog-only' | 'partial' | 'full';

export interface ValidationCoverageArea {
  name: 'GEO' | 'SEO' | 'AEO' | 'Accessibility' | 'Security optimization';
  status: ValidationCoverageStatus;
  currentCoverage: string[];
  majorGaps: string[];
  famousToolComparison: string;
}

const VALIDATION_COVERAGE_AREAS: ValidationCoverageArea[] = [
  {
    name: 'GEO',
    status: 'catalog-only',
    currentCoverage: [
      'Catalog entry only',
      'No runtime GEO evaluator yet'
    ],
    majorGaps: [
      'structured data',
      'entity extraction',
      'indexability',
      'intent alignment'
    ],
    famousToolComparison: 'Lighthouse and axe-core do not target GEO at all, while crawl tools focus on page mechanics rather than generated-answer readiness.'
  },
  {
    name: 'SEO',
    status: 'partial',
    currentCoverage: [
      'title',
      'meta description',
      'H1 structure',
      'canonical consistency',
      'broken-link crawl'
    ],
    majorGaps: [
      'structured data',
      'indexability',
      'robots.txt',
      'sitemaps',
      'rendered crawl parity'
    ],
    famousToolComparison: 'Lighthouse covers basic SEO checks, while Screaming Frog and Sitebulb go deeper on crawl scale, structured data, and indexability workflows.'
  },
  {
    name: 'AEO',
    status: 'partial',
    currentCoverage: [
      'canonical link',
      'answer-summary'
    ],
    majorGaps: [
      'answer-summary',
      'schema question-answer coverage',
      'direct answer extraction',
      'citation-ready summaries'
    ],
    famousToolComparison: 'Lighthouse has no dedicated AEO lens, and crawler tools only partially approximate answer-intent analysis through structured data.'
  },
  {
    name: 'Accessibility',
    status: 'partial',
    currentCoverage: [
      'alt text',
      'lang attribute',
      'button labels',
      'required form labels'
    ],
    majorGaps: [
      'contrast',
      'ARIA',
      'keyboard',
      'focus order'
    ],
    famousToolComparison: 'axe-core is stronger on accessibility breadth, while Lighthouse and Sitebulb provide smaller automated accessibility slices.'
  },
  {
    name: 'Security optimization',
    status: 'catalog-only',
    currentCoverage: [
      'Catalog entry only',
      'No runtime security-header evaluator yet'
    ],
    majorGaps: [
      'security headers',
      'CSP',
      'HSTS',
      'referrer policy'
    ],
    famousToolComparison: 'Security-header validation is currently represented in the catalog, but not yet enforced by the runtime ruleset.'
  }
];

export function getValidationCoverageAreas(): ValidationCoverageArea[] {
  return VALIDATION_COVERAGE_AREAS.map((area) => ({
    ...area,
    currentCoverage: [...area.currentCoverage],
    majorGaps: [...area.majorGaps]
  }));
}

export function buildValidationCodemapMarkdown(): string {
  const rows = getValidationCoverageAreas().map((area) => {
    return [
      area.name,
      area.status,
      area.currentCoverage.join(', '),
      area.majorGaps.join(', ')
    ];
  });

  const lines = [
    '# Validation Codemap',
    '',
    'This map tracks the current validation surface for GEO, SEO, AEO, accessibility, and security optimization.',
    '',
    '## Coverage Matrix',
    '',
    '| Area | Status | Current coverage | Major gaps |',
    '| --- | --- | --- | --- |',
    ...rows.map((row) => `| ${row[0]} | ${row[1]} | ${row[2]} | ${row[3]} |`),
    '',
    '## Compared with famous tools',
    '',
    '- Lighthouse: broad SEO, accessibility, and performance baseline, but no GEO-specific or answer-intent workflow.',
    '- axe-core: deep accessibility engine, but no SEO, AEO, GEO, or security-header coverage.',
    '- Screaming Frog: strong crawl and structured-data workflow, especially for indexability and site-scale SEO.',
    '- Sitebulb: strong accessibility and structured-data analysis, but still focused on crawl mechanics rather than answer-summary generation.',
    ''
  ];

  for (const area of getValidationCoverageAreas()) {
    lines.push(`## ${area.name}`);
    lines.push('');
    lines.push(`- Status: ${area.status}`);
    lines.push(`- Current coverage: ${area.currentCoverage.join(', ')}`);
    lines.push(`- Major gaps: ${area.majorGaps.join(', ')}`);
    lines.push(`- Comparison: ${area.famousToolComparison}`);
    lines.push('');
  }

  return lines.join('\n').trimEnd();
}
