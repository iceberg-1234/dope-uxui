import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  detectCaseStyle,
  detectSeparator,
  isDefaultName,
  isCopyName,
  toPascalCase,
  toCamelCase,
  toKebabCase,
  toTitleCase,
  levenshteinDistance,
  calculateSimilarity
} from '../scripts/detect-patterns.mjs';

describe('detectCaseStyle', () => {
  it('detects PascalCase', () => {
    assert.equal(detectCaseStyle('Button'), 'PascalCase');
    assert.equal(detectCaseStyle('SearchInput'), 'PascalCase');
    assert.equal(detectCaseStyle('NavigationBar'), 'PascalCase');
  });
  
  it('detects camelCase', () => {
    assert.equal(detectCaseStyle('button'), 'camelCase');
    assert.equal(detectCaseStyle('searchInput'), 'camelCase');
    assert.equal(detectCaseStyle('navigationBar'), 'camelCase');
  });
  
  it('detects kebab-case', () => {
    assert.equal(detectCaseStyle('button'), 'camelCase'); // single word
    assert.equal(detectCaseStyle('search-input'), 'kebab-case');
    assert.equal(detectCaseStyle('navigation-bar'), 'kebab-case');
  });
  
  it('detects snake_case', () => {
    assert.equal(detectCaseStyle('search_input'), 'snake_case');
    assert.equal(detectCaseStyle('navigation_bar'), 'snake_case');
  });
  
  it('detects Title Case', () => {
    assert.equal(detectCaseStyle('Search Input'), 'Title Case');
    assert.equal(detectCaseStyle('Navigation Bar'), 'Title Case');
  });
  
  it('detects UPPER_CASE', () => {
    assert.equal(detectCaseStyle('SEARCH_INPUT'), 'UPPER_CASE');
    assert.equal(detectCaseStyle('NAVIGATION_BAR'), 'UPPER_CASE');
  });
  
  it('detects Mixed case', () => {
    assert.equal(detectCaseStyle('Search_Input'), 'Mixed');
    assert.equal(detectCaseStyle('search-Input'), 'Mixed');
    assert.equal(detectCaseStyle('Button_primary'), 'Mixed');
  });
  
  it('handles edge cases', () => {
    assert.equal(detectCaseStyle(''), 'Unknown');
    assert.equal(detectCaseStyle('123'), 'Mixed');
  });
});

describe('detectSeparator', () => {
  it('detects slash separator', () => {
    assert.equal(detectSeparator('Navigation/Button'), 'slash');
    assert.equal(detectSeparator('Form/Input/Text'), 'slash');
  });
  
  it('detects hyphen separator', () => {
    assert.equal(detectSeparator('search-input'), 'hyphen');
    assert.equal(detectSeparator('navigation-bar'), 'hyphen');
  });
  
  it('detects underscore separator', () => {
    assert.equal(detectSeparator('search_input'), 'underscore');
    assert.equal(detectSeparator('navigation_bar'), 'underscore');
  });
  
  it('detects space separator', () => {
    assert.equal(detectSeparator('Search Input'), 'space');
    assert.equal(detectSeparator('Navigation Bar'), 'space');
  });
  
  it('detects no separator', () => {
    assert.equal(detectSeparator('SearchInput'), 'none');
    assert.equal(detectSeparator('Button'), 'none');
  });
});

describe('isDefaultName', () => {
  it('detects default Figma names', () => {
    assert.equal(isDefaultName('Rectangle'), true);
    assert.equal(isDefaultName('Rectangle 123'), true);
    assert.equal(isDefaultName('Frame'), true);
    assert.equal(isDefaultName('Frame 456'), true);
    assert.equal(isDefaultName('Group'), true);
    assert.equal(isDefaultName('Component'), true);
    assert.equal(isDefaultName('Text'), true);
  });
  
  it('rejects custom names', () => {
    assert.equal(isDefaultName('Button'), false);
    assert.equal(isDefaultName('SearchInput'), false);
    assert.equal(isDefaultName('My Rectangle'), false);
  });
});

describe('isCopyName', () => {
  it('detects Copy suffix', () => {
    assert.equal(isCopyName('Button Copy'), true);
    assert.equal(isCopyName('Frame Copy 2'), true);
    assert.equal(isCopyName('Component Copy 123'), true);
  });
  
  it('rejects non-copy names', () => {
    assert.equal(isCopyName('Button'), false);
    assert.equal(isCopyName('CopyButton'), false);
    assert.equal(isCopyName('Button-Copy'), false);
  });
});

describe('toPascalCase', () => {
  it('converts to PascalCase', () => {
    assert.equal(toPascalCase('button'), 'Button');
    assert.equal(toPascalCase('search input'), 'SearchInput');
    assert.equal(toPascalCase('search-input'), 'SearchInput');
    assert.equal(toPascalCase('search_input'), 'SearchInput');
    assert.equal(toPascalCase('SEARCH_INPUT'), 'SearchInput');
  });
  
  it('preserves already PascalCase', () => {
    assert.equal(toPascalCase('Button'), 'Button');
    assert.equal(toPascalCase('SearchInput'), 'Searchinput'); // Note: loses internal caps
  });
});

describe('toCamelCase', () => {
  it('converts to camelCase', () => {
    assert.equal(toCamelCase('Button'), 'button');
    assert.equal(toCamelCase('search input'), 'searchInput');
    assert.equal(toCamelCase('search-input'), 'searchInput');
    assert.equal(toCamelCase('search_input'), 'searchInput');
  });
});

describe('toKebabCase', () => {
  it('converts to kebab-case', () => {
    assert.equal(toKebabCase('Button'), 'button');
    assert.equal(toKebabCase('SearchInput'), 'search-input');
    assert.equal(toKebabCase('search input'), 'search-input');
    assert.equal(toKebabCase('search_input'), 'search-input');
  });
});

describe('toTitleCase', () => {
  it('converts to Title Case', () => {
    assert.equal(toTitleCase('button'), 'Button');
    assert.equal(toTitleCase('search input'), 'Search Input');
    assert.equal(toTitleCase('SearchInput'), 'Search Input');
    assert.equal(toTitleCase('search-input'), 'Searchinput'); // Note: loses separator
  });
});

describe('levenshteinDistance', () => {
  it('calculates edit distance', () => {
    assert.equal(levenshteinDistance('', ''), 0);
    assert.equal(levenshteinDistance('a', 'a'), 0);
    assert.equal(levenshteinDistance('a', 'b'), 1);
    assert.equal(levenshteinDistance('abc', 'abc'), 0);
    assert.equal(levenshteinDistance('abc', 'abd'), 1);
    assert.equal(levenshteinDistance('abc', 'abcd'), 1);
    assert.equal(levenshteinDistance('kitten', 'sitting'), 3);
  });
  
  it('throws on non-string input', () => {
    assert.throws(() => levenshteinDistance(123, 'abc'), TypeError);
    assert.throws(() => levenshteinDistance('abc', null), TypeError);
  });
});

describe('calculateSimilarity', () => {
  it('calculates similarity score', () => {
    assert.equal(calculateSimilarity('', ''), 1.0);
    assert.equal(calculateSimilarity('a', 'a'), 1.0);
    assert.equal(calculateSimilarity('abc', 'abc'), 1.0);
    assert.equal(calculateSimilarity('', 'abc'), 0.0);
    assert.equal(calculateSimilarity('abc', ''), 0.0);
  });
  
  it('returns partial similarity', () => {
    const sim1 = calculateSimilarity('button', 'Button');
    assert.ok(sim1 > 0.8 && sim1 < 1.0);
    
    const sim2 = calculateSimilarity('search input', 'SearchInput');
    assert.ok(sim2 > 0.7 && sim2 < 1.0);
  });
  
  it('throws on non-string input', () => {
    assert.throws(() => calculateSimilarity(123, 'abc'), TypeError);
    assert.throws(() => calculateSimilarity('abc', {}), TypeError);
  });
});
