import type { RuleContext } from '../shared/rule-engine';

const MAX_LINKS = 200;

export interface LinkSignal {
  href: string;
  text: string;
  rel: string;
  target: string;
  ariaLabel: string | null;
  title: string | null;
  isInternal: boolean;
  quality?: {
    hasQuery: boolean;
    hasFragment: boolean;
    hasTrackingParams: boolean;
    isCleanPath: boolean;
  };
}

export interface FormInputSignal {
  required: boolean;
  labelText: string | null;
  placeholder: string | null;
  ariaLabel: string | null;
  ariaLabelledBy: string | null;
  title: string | null;
  type: string;
}

export interface ButtonSignal {
  text: string;
  ariaLabel: string | null;
  title: string;
  type: string;
}

export interface ImageSignal {
  src: string;
  alt: string | null;
  ariaLabel?: string | null;
  role?: string | null;
  formatHint?: string | null;
  hasQuery?: boolean;
  hasFragment?: boolean;
}

export function extractPageContext(documentRef: Document, requestUrl: string): RuleContext {
  const title = (documentRef.querySelector('title')?.textContent ?? '').trim();
  const lang = (documentRef.documentElement?.getAttribute('lang') ?? '').trim() || null;

  const metaDescription =
    documentRef
      .querySelector('meta[name="description"]')
      ?.getAttribute('content')
      ?.trim() ?? null;

  const canonical =
    documentRef
      .querySelector('link[rel="canonical"]')
      ?.getAttribute('href')
      ?.trim() ?? null;
  const canonicalNormalized = canonical ? normalizeUrl(canonical, requestUrl) : null;
  const requestNormalized = normalizeComparableUrl(requestUrl);

  const images = [...documentRef.querySelectorAll('img')].map((img) => ({
    src: img.currentSrc || img.src || img.getAttribute('src') || '',
    alt: img.getAttribute('alt'),
    ariaLabel: img.getAttribute('aria-label'),
    role: img.getAttribute('role'),
    formatHint: inferImageFormatHint(img.currentSrc || img.src || img.getAttribute('src') || ''),
    hasQuery: hasQuerySegment(img.currentSrc || img.src || img.getAttribute('src') || ''),
    hasFragment: hasFragmentSegment(img.currentSrc || img.src || img.getAttribute('src') || '')
  }));

  const headings = {
    h1: documentRef.querySelectorAll('h1').length,
    h2: documentRef.querySelectorAll('h2').length,
    h3: documentRef.querySelectorAll('h3').length
  };
  const headingSequence = [...documentRef.querySelectorAll('h1, h2, h3, h4, h5, h6')].map((heading) => ({
    level: Number(heading.tagName.slice(1)),
    text: (heading.textContent ?? '').trim()
  }));
  const headingHierarchy = analyzeHeadingHierarchy(headingSequence);

  const links: LinkSignal[] = [...documentRef.querySelectorAll('a[href]')]
    .slice(0, MAX_LINKS)
    .map((link) => {
      const href = normalizeUrl(link.getAttribute('href') ?? '', requestUrl);
      const quality = buildUrlQuality(href);
      return {
        href,
        text: (link.textContent ?? '').trim().slice(0, 120),
        rel: (link.getAttribute('rel') ?? '').toLowerCase(),
        target: (link.getAttribute('target') ?? '').toLowerCase(),
        ariaLabel: link.getAttribute('aria-label')?.trim() ?? null,
        title: link.getAttribute('title')?.trim() ?? null,
        isInternal: isInternalUrl(href, requestUrl),
        ...(quality.isCleanPath ? {} : { quality })
      };
    })
    .filter((item) => item.href);

  const buttons: ButtonSignal[] = [...documentRef.querySelectorAll('button')].map((button) => ({
    text: (button.textContent ?? '').trim(),
    ariaLabel: button.getAttribute('aria-label')?.trim() ?? null,
    title: button.getAttribute('title')?.trim() ?? '',
    type: button.getAttribute('type') ?? ''
  }));

  const labelById = mapLabels(documentRef);
  const formInputs: FormInputSignal[] = [...documentRef.querySelectorAll('input,select,textarea')]
    .filter((input) => input instanceof HTMLInputElement || input instanceof HTMLSelectElement || input instanceof HTMLTextAreaElement)
    .map((input) => ({
      required: input.required,
      labelText: getLabelText(input, labelById),
      placeholder: input.getAttribute('placeholder')?.trim() ?? null,
      ariaLabel: input.getAttribute('aria-label')?.trim() ?? null,
      ariaLabelledBy: input.getAttribute('aria-labelledby')?.trim() ?? null,
      title: input.getAttribute('title')?.trim() ?? null,
      type: (input.getAttribute('type') ?? 'text').toLowerCase()
    }));

  return {
    requestUrl,
    title,
    lang,
    canonical,
    canonicalSignal: {
      raw: canonical,
      normalized: canonicalNormalized,
      requestNormalized,
      sameOrigin: haveSameOrigin(canonicalNormalized, requestUrl),
      matchesRequest: canonicalNormalized !== null && requestNormalized !== null && canonicalNormalized === requestNormalized
    },
    metaDescription,
    headings,
    headingSequence,
    headingHierarchy,
    images,
    links,
    buttons,
    formInputs
  };
}

function analyzeHeadingHierarchy(sequence: Array<{ level: number; text: string }>) {
  const skips: Array<{ fromLevel: number; toLevel: number; text: string; index: number }> = [];
  const regressions: Array<{ fromLevel: number; toLevel: number; text: string; index: number }> = [];
  for (let index = 1; index < sequence.length; index += 1) {
    const previous = sequence[index - 1];
    const current = sequence[index];
    if (current.level > previous.level + 1) {
      skips.push({ fromLevel: previous.level, toLevel: current.level, text: current.text, index });
      continue;
    }
    if (current.level < previous.level) {
      regressions.push({ fromLevel: previous.level, toLevel: current.level, text: current.text, index });
    }
  }
  return { skips, regressions };
}

function normalizeUrl(href: string, baseUrl: string): string {
  try {
    const url = new URL(href, baseUrl);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') {
      return '';
    }

    return url.toString();
  } catch {
    return '';
  }
}

function isInternalUrl(candidate: string, baseUrl: string): boolean {
  try {
    return new URL(candidate).origin === new URL(baseUrl).origin;
  } catch {
    return false;
  }
}

function normalizeComparableUrl(candidate: string): string | null {
  try {
    const url = new URL(candidate);
    url.hash = '';
    url.search = '';
    return url.toString();
  } catch {
    return null;
  }
}

function haveSameOrigin(candidate: string | null, baseUrl: string): boolean {
  if (!candidate) {
    return false;
  }
  try {
    return new URL(candidate).origin === new URL(baseUrl).origin;
  } catch {
    return false;
  }
}

function buildUrlQuality(candidate: string) {
  try {
    const url = new URL(candidate);
    const trackingParams = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content', 'gclid', 'fbclid'];
    const hasTrackingParams = trackingParams.some((param) => url.searchParams.has(param));
    const hasQuery = url.search.length > 0;
    const hasFragment = url.hash.length > 0;
    return {
      hasQuery,
      hasFragment,
      hasTrackingParams,
      isCleanPath: !hasQuery && !hasFragment && !hasTrackingParams
    };
  } catch {
    return {
      hasQuery: false,
      hasFragment: false,
      hasTrackingParams: false,
      isCleanPath: true
    };
  }
}

function inferImageFormatHint(candidate: string): string | null {
  try {
    const pathname = new URL(candidate).pathname.toLowerCase();
    const extension = pathname.split('.').at(-1);
    return extension && extension !== pathname ? extension : null;
  } catch {
    return null;
  }
}

function hasQuerySegment(candidate: string): boolean {
  try {
    return new URL(candidate).search.length > 0;
  } catch {
    return false;
  }
}

function hasFragmentSegment(candidate: string): boolean {
  try {
    return new URL(candidate).hash.length > 0;
  } catch {
    return false;
  }
}

function mapLabels(documentRef: Document): Map<string, string> {
  const map = new Map<string, string>();

  for (const label of [...documentRef.querySelectorAll('label[for]')]) {
    const fieldId = label.getAttribute('for');
    if (!fieldId) {
      continue;
    }

    map.set(fieldId, (label.textContent ?? '').trim());
  }

  return map;
}

function getLabelText(
  input: HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement,
  labelById: Map<string, string>
): string | null {
  if (input.id && labelById.has(input.id)) {
    return labelById.get(input.id) ?? null;
  }

  const closest = input.closest('label');
  if (closest) {
    return (closest.textContent ?? '').trim();
  }

  const ariaLabel = input.getAttribute('aria-label');
  if (ariaLabel) {
    return ariaLabel.trim();
  }

  return null;
}
