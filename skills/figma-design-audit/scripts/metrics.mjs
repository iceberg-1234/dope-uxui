function requireNumber(value, minimum, maximum, name) {
  if (!Number.isFinite(value) || value < minimum || value > maximum) {
    throw new RangeError(name + ' must be a finite number in [' + minimum + ', ' + maximum + ']');
  }
}

function requireOpaque(color) {
  if (!color || typeof color !== 'object') throw new TypeError('An explicit RGB color is required');
  for (const channel of ['r', 'g', 'b']) requireNumber(color[channel], 0, 1, channel);
  if ('a' in color && color.a !== 1) throw new TypeError('Composite transparency before measuring contrast');
}

export function compositeOnOpaque(foreground, background) {
  requireOpaque(background);
  if (!foreground || typeof foreground !== 'object') throw new TypeError('An explicit RGBA color is required');
  requireNumber(foreground.a, 0, 1, 'alpha');
  const result = {};
  for (const channel of ['r', 'g', 'b']) {
    requireNumber(foreground[channel], 0, 1, channel);
    result[channel] = foreground[channel] * foreground.a + background[channel] * (1 - foreground.a);
  }
  return result;
}

function luminance(color) {
  requireOpaque(color);
  const linear = value => value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  return 0.2126 * linear(color.r) + 0.7152 * linear(color.g) + 0.0722 * linear(color.b);
}

export function contrastRatio(foreground, background) {
  const first = luminance(foreground);
  const second = luminance(background);
  return (Math.max(first, second) + 0.05) / (Math.min(first, second) + 0.05);
}

export function textContrastThreshold(fontSizeCssPx, fontWeight = null) {
  requireNumber(fontSizeCssPx, Number.MIN_VALUE, Number.MAX_VALUE, 'fontSizeCssPx');
  if (fontWeight !== null) requireNumber(fontWeight, 1, 1000, 'fontWeight');
  return fontSizeCssPx >= 24 || (fontSizeCssPx >= 14 * 96 / 72 && fontWeight >= 700) ? 3 : 4.5;
}

export function evaluateContrast(foreground, background, threshold) {
  requireNumber(threshold, 1, 21, 'threshold');
  const ratio = contrastRatio(foreground, background);
  return { ratio, threshold, passes: ratio >= threshold };
}
