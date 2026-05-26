import type { Issue, ScanSnapshot } from '../shared/types';

const PAGE_WIDTH = 612;
const PAGE_HEIGHT = 792;
const LEFT_MARGIN = 50;
const TOP_MARGIN = 54;
const LINE_HEIGHT = 14;
const LINES_PER_PAGE = 42;

export function buildIssuesPdfBlob(snapshot: ScanSnapshot, issues: Issue[]): Blob {
  const lines = buildIssueReportLines(snapshot, issues);
  const pdf = buildPdfDocument('Stealth Lightbeacon Issue Export', lines);
  return new Blob([pdf], { type: 'application/pdf' });
}

export function buildIssueReportLines(snapshot: ScanSnapshot, issues: Issue[]): string[] {
  const lines = [
    `Scan ID: ${snapshot.id}`,
    `URL: ${snapshot.url}`,
    `Origin: ${snapshot.origin}`,
    `Engine: ${snapshot.engine}`,
    `Generated: ${new Date(snapshot.timestamp).toISOString()}`,
    '',
    `Selected issues: ${issues.length}`,
    `Total issues on page: ${snapshot.summary.total}`,
    ''
  ];

  for (const issue of issues) {
    lines.push(`[${issue.severity}] ${issue.title}`);
    lines.push(`Rule: ${issue.ruleId}`);
    lines.push(`Domain: ${issue.domain}`);
    lines.push(`Summary: ${issue.summary}`);
    lines.push(`Evidence: ${issue.evidence}`);
    if (issue.selector) {
      lines.push(`Selector: ${issue.selector}`);
    }
    lines.push('');
  }

  return lines;
}

export function buildPdfDocument(title: string, lines: string[]): string {
  const pages = chunkLines([title, '', ...lines], LINES_PER_PAGE);
  const objectParts: Array<{ number: number; content: string }> = [];
  const pageObjects: number[] = [];
  const contentObjects: number[] = [];

  objectParts.push({
    number: 1,
    content: `<< /Type /Catalog /Pages 2 0 R >>`
  });

  const firstPageObject = 4;
  const firstContentObject = 5;
  for (let index = 0; index < pages.length; index++) {
    pageObjects.push(firstPageObject + index * 2);
    contentObjects.push(firstContentObject + index * 2);
  }

  objectParts.push({
    number: 2,
    content: `<< /Type /Pages /Kids [${pageObjects.map((pageObject) => `${pageObject} 0 R`).join(' ')}] /Count ${pages.length} >>`
  });

  objectParts.push({
    number: 3,
    content: `<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>`
  });

  pages.forEach((pageLines, index) => {
    const pageObject = pageObjects[index]!;
    const contentObject = contentObjects[index]!;
    const contentStream = buildPageContentStream(pageLines);

    objectParts.push({
      number: pageObject,
      content: `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${PAGE_WIDTH} ${PAGE_HEIGHT}] /Resources << /Font << /F1 3 0 R >> >> /Contents ${contentObject} 0 R >>`
    });

    objectParts.push({
      number: contentObject,
      content: `<< /Length ${byteLength(contentStream)} >>\nstream\n${contentStream}\nendstream`
    });
  });

  objectParts.sort((left, right) => left.number - right.number);

  let pdf = '%PDF-1.4\n';
  const offsets: number[] = [0];

  for (const part of objectParts) {
    offsets[part.number] = byteLength(pdf);
    pdf += `${part.number} 0 obj\n${part.content}\nendobj\n`;
  }

  const xrefStart = byteLength(pdf);
  const totalObjects = objectParts.length + 1;
  const xrefLines = [`xref`, `0 ${totalObjects}`, `0000000000 65535 f `];
  for (let objectNumber = 1; objectNumber < totalObjects; objectNumber++) {
    const offset = offsets[objectNumber] ?? 0;
    xrefLines.push(`${offset.toString().padStart(10, '0')} 00000 n `);
  }

  pdf += `${xrefLines.join('\n')}\n`;
  pdf += `trailer << /Size ${totalObjects} /Root 1 0 R >>\n`;
  pdf += `startxref\n`;
  pdf += `${xrefStart}\n`;
  pdf += `%%EOF`;

  return pdf;
}

function buildPageContentStream(lines: string[]): string {
  const escapedLines = lines.map(escapePdfText);
  const textParts = [
    'BT',
    '/F1 12 Tf',
    `${LINE_HEIGHT} TL`,
    `1 0 0 1 ${LEFT_MARGIN} ${PAGE_HEIGHT - TOP_MARGIN} Tm`
  ];

  escapedLines.forEach((line, index) => {
    if (index === 0) {
      textParts.push(`(${line}) Tj`);
      return;
    }

    textParts.push('T*');
    textParts.push(`(${line}) Tj`);
  });

  textParts.push('ET');
  return textParts.join('\n');
}

function chunkLines(lines: string[], chunkSize: number): string[][] {
  if (lines.length === 0) {
    return [['']];
  }

  const chunks: string[][] = [];
  for (let index = 0; index < lines.length; index += chunkSize) {
    chunks.push(lines.slice(index, index + chunkSize));
  }

  return chunks;
}

function escapePdfText(input: string): string {
  return input
    .replace(/\\/g, '\\\\')
    .replace(/\(/g, '\\(')
    .replace(/\)/g, '\\)');
}

function byteLength(input: string): number {
  if (typeof TextEncoder !== 'undefined') {
    return new TextEncoder().encode(input).length;
  }

  return input.length;
}
