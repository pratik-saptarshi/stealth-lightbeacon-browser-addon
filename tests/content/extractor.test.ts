// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';
import { extractPageContext } from '../../src/content/extractor';

afterEach(() => {
  document.body.innerHTML = '';
  document.head.innerHTML = '';
});

describe('content extractor', () => {
  it('extracts title, metadata, signals, and form labels from the DOM', () => {
    document.documentElement.setAttribute('lang', 'en');
    document.head.innerHTML = `
      <title>  Example page  </title>
      <meta name="description" content="  Detailed summary  ">
      <link rel="canonical" href=" https://example.com/canonical ">
    `;

    document.body.innerHTML = `
      <img src="/fallback.png" alt="Hero" aria-label="Featured" role="presentation">
      <img src="/secondary.png" alt="Secondary">
      <h1>First</h1>
      <h2>Second</h2>
      <h2>Third</h2>
      <h3>Fourth</h3>
      <a href="/internal"> Internal link </a>
      <a href="https://external.example/path" rel=" NOFOLLOW " target="_blank"> External link </a>
      <a href="http://[invalid-url">Broken link</a>
      <button type="submit" title=" Submit form " aria-label=" Primary action ">  Save  </button>
      <label for="email"> Email address </label>
      <input id="email" required type="EMAIL" />
      <label> Inline label <textarea id="notes" required></textarea></label>
      <select id="category" aria-label=" Category chooser "></select>
      <input id="search" aria-label=" Search box " />
      <input id="plain" />
    `;

    const firstImage = document.querySelector('img') as HTMLImageElement;
    Object.defineProperty(firstImage, 'currentSrc', {
      configurable: true,
      value: 'https://cdn.example.com/current-hero.png'
    });

    const context = extractPageContext(document, 'https://example.com/base/page');

    expect(context.requestUrl).toBe('https://example.com/base/page');
    expect(context.title).toBe('Example page');
    expect(context.lang).toBe('en');
    expect(context.metaDescription).toBe('Detailed summary');
    expect(context.canonical).toBe('https://example.com/canonical');
    expect(context.headings).toEqual({ h1: 1, h2: 2, h3: 1 });
    expect(context.images).toEqual([
      {
        src: 'https://cdn.example.com/current-hero.png',
        alt: 'Hero',
        ariaLabel: 'Featured',
        role: 'presentation'
      },
      {
        src: 'http://localhost:3000/secondary.png',
        alt: 'Secondary',
        ariaLabel: null,
        role: null
      }
    ]);
    expect(context.links).toEqual([
      {
        href: 'https://example.com/internal',
        text: 'Internal link',
        rel: '',
        target: '',
        isInternal: true
      },
      {
        href: 'https://external.example/path',
        text: 'External link',
        rel: ' nofollow ',
        target: '_blank',
        isInternal: false
      }
    ]);
    expect(context.buttons).toEqual([
      {
        text: 'Save',
        ariaLabel: 'Primary action',
        title: 'Submit form',
        type: 'submit'
      }
    ]);
    expect(context.formInputs).toEqual([
      {
        required: true,
        labelText: 'Email address',
        type: 'email'
      },
      {
        required: true,
        labelText: 'Inline label',
        type: 'text'
      },
      {
        required: false,
        labelText: 'Category chooser',
        type: 'text'
      },
      {
        required: false,
        labelText: 'Search box',
        type: 'text'
      },
      {
        required: false,
        labelText: null,
        type: 'text'
      }
    ]);
  });

  it('drops invalid links and caps link extraction at 200 entries', () => {
    const linksRoot = document.createElement('div');
    for (let index = 0; index < 205; index += 1) {
      const anchor = document.createElement('a');
      anchor.href = `/item-${index}`;
      anchor.textContent = `Item ${index}`;
      linksRoot.appendChild(anchor);
    }
    const invalid = document.createElement('a');
    invalid.setAttribute('href', 'http://[invalid-url');
    invalid.textContent = 'Invalid';
    linksRoot.appendChild(invalid);
    document.body.appendChild(linksRoot);

    const context = extractPageContext(document, 'https://example.com/base/');

    expect(context.links).toHaveLength(200);
    expect(context.links[0]).toMatchObject({
      href: 'https://example.com/item-0',
      text: 'Item 0',
      isInternal: true
    });
    expect(context.links.at(-1)).toMatchObject({
      href: 'https://example.com/item-199',
      text: 'Item 199',
      isInternal: true
    });
  });
});
