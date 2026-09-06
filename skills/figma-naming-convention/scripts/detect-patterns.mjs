/**
 * Naming pattern detection utilities
 * Pure functions for analyzing naming conventions in Figma files
 */

/**
 * Detect the case style of a name
 * @param {string} name - The name to analyze
 * @returns {string} - One of: PascalCase, camelCase, kebab-case, snake_case, Title Case, UPPER_CASE, Mixed
 */
export function detectCaseStyle(name) {
  if (typeof name !== 'string' || name.length === 0) {
    return 'Unknown';
  }
  
  // PascalCase: 첫 글자 대문자, 공백 없음, 단어마다 대문자
  if (/^[A-Z][a-z]+(?:[A-Z][a-z]+)*$/.test(name)) {
    return 'PascalCase';
  }
  
  // camelCase: 첫 글자 소문자, 공백 없음, 단어마다 대문자
  if (/^[a-z]+(?:[A-Z][a-z]+)*$/.test(name)) {
    return 'camelCase';
  }
  
  // kebab-case: 소문자, 하이픈 구분
  if (/^[a-z]+(?:-[a-z]+)*$/.test(name)) {
    return 'kebab-case';
  }
  
  // snake_case: 소문자, 언더스코어 구분
  if (/^[a-z]+(?:_[a-z]+)*$/.test(name)) {
    return 'snake_case';
  }
  
  // Title Case: 각 단어 첫 글자 대문자, 공백 구분
  if (/^[A-Z][a-z]+(?:\s[A-Z][a-z]+)*$/.test(name)) {
    return 'Title Case';
  }
  
  // UPPER_CASE: 모두 대문자, 언더스코어 구분
  if (/^[A-Z]+(?:_[A-Z]+)*$/.test(name)) {
    return 'UPPER_CASE';
  }
  
  // Mixed: 여러 스타일 혼재
  return 'Mixed';
}

/**
 * Detect the primary separator used in a name
 * @param {string} name - The name to analyze
 * @returns {string} - One of: slash, hyphen, underscore, space, none
 */
export function detectSeparator(name) {
  if (typeof name !== 'string' || name.length === 0) {
    return 'none';
  }
  
  const separators = {
    slash: (name.match(/\//g) || []).length,
    hyphen: (name.match(/-/g) || []).length,
    underscore: (name.match(/_/g) || []).length,
    space: (name.match(/\s/g) || []).length
  };
  
  const max = Math.max(...Object.values(separators));
  if (max === 0) return 'none';
  
  return Object.keys(separators).find(k => separators[k] === max);
}

/**
 * Check if a name is a default Figma name
 * @param {string} name - The name to check
 * @param {string} type - The node type (optional)
 * @returns {boolean}
 */
export function isDefaultName(name, type = null) {
  if (typeof name !== 'string') return false;
  
  const defaultPatterns = [
    /^Rectangle\s*\d*$/,
    /^Frame\s*\d*$/,
    /^Group\s*\d*$/,
    /^Component\s*\d*$/,
    /^Text\s*\d*$/,
    /^Ellipse\s*\d*$/,
    /^Vector\s*\d*$/,
    /^Line\s*\d*$/,
    /^Polygon\s*\d*$/,
    /^Star\s*\d*$/,
    /^Image\s*\d*$/
  ];
  
  return defaultPatterns.some(pattern => pattern.test(name));
}

/**
 * Check if a name contains "Copy" suffix
 * @param {string} name - The name to check
 * @returns {boolean}
 */
export function isCopyName(name) {
  if (typeof name !== 'string') return false;
  return /\s+Copy(\s+\d+)?$/.test(name);
}

/**
 * Convert a name to PascalCase
 * @param {string} name - The name to convert
 * @returns {string}
 */
export function toPascalCase(name) {
  if (typeof name !== 'string' || name.length === 0) return name;
  
  // Remove special characters except spaces, hyphens, underscores
  const cleaned = name.replace(/[^a-zA-Z0-9\s\-_]/g, '');
  
  // Split by spaces, hyphens, underscores
  const words = cleaned.split(/[\s\-_]+/);
  
  // Capitalize first letter of each word
  return words
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join('');
}

/**
 * Convert a name to camelCase
 * @param {string} name - The name to convert
 * @returns {string}
 */
export function toCamelCase(name) {
  if (typeof name !== 'string' || name.length === 0) return name;
  
  const pascal = toPascalCase(name);
  return pascal.charAt(0).toLowerCase() + pascal.slice(1);
}

/**
 * Convert a name to kebab-case
 * @param {string} name - The name to convert
 * @returns {string}
 */
export function toKebabCase(name) {
  if (typeof name !== 'string' || name.length === 0) return name;
  
  // Remove special characters except spaces, hyphens, underscores
  const cleaned = name.replace(/[^a-zA-Z0-9\s\-_]/g, '');
  
  // Split by spaces, hyphens, underscores, or capital letters
  const words = cleaned
    .replace(/([A-Z])/g, ' $1')
    .split(/[\s\-_]+/)
    .filter(word => word.length > 0);
  
  return words.map(word => word.toLowerCase()).join('-');
}

/**
 * Convert a name to Title Case
 * @param {string} name - The name to convert
 * @returns {string}
 */
export function toTitleCase(name) {
  if (typeof name !== 'string' || name.length === 0) return name;
  
  // Remove special characters except spaces
  const cleaned = name.replace(/[^a-zA-Z0-9\s]/g, '');
  
  // Split by spaces or capital letters
  const words = cleaned
    .replace(/([A-Z])/g, ' $1')
    .split(/\s+/)
    .filter(word => word.length > 0);
  
  return words
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

/**
 * Calculate Levenshtein distance between two strings
 * @param {string} str1 - First string
 * @param {string} str2 - Second string
 * @returns {number} - Edit distance
 */
export function levenshteinDistance(str1, str2) {
  if (typeof str1 !== 'string' || typeof str2 !== 'string') {
    throw new TypeError('Both arguments must be strings');
  }
  
  const len1 = str1.length;
  const len2 = str2.length;
  
  const matrix = Array(len1 + 1).fill(null).map(() => Array(len2 + 1).fill(0));
  
  for (let i = 0; i <= len1; i++) {
    matrix[i][0] = i;
  }
  
  for (let j = 0; j <= len2; j++) {
    matrix[0][j] = j;
  }
  
  for (let i = 1; i <= len1; i++) {
    for (let j = 1; j <= len2; j++) {
      const cost = str1[i - 1] === str2[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,      // deletion
        matrix[i][j - 1] + 1,      // insertion
        matrix[i - 1][j - 1] + cost // substitution
      );
    }
  }
  
  return matrix[len1][len2];
}

/**
 * Calculate similarity between two strings (0-1)
 * @param {string} str1 - First string
 * @param {string} str2 - Second string
 * @returns {number} - Similarity score (0 = completely different, 1 = identical)
 */
export function calculateSimilarity(str1, str2) {
  if (typeof str1 !== 'string' || typeof str2 !== 'string') {
    throw new TypeError('Both arguments must be strings');
  }
  
  if (str1 === str2) return 1.0;
  if (str1.length === 0 && str2.length === 0) return 1.0;
  if (str1.length === 0 || str2.length === 0) return 0.0;
  
  const longer = str1.length > str2.length ? str1 : str2;
  const shorter = str1.length > str2.length ? str2 : str1;
  
  const editDistance = levenshteinDistance(longer, shorter);
  return (longer.length - editDistance) / longer.length;
}
