import test from 'node:test';
import assert from 'node:assert/strict';
import { compositeOnOpaque, contrastRatio, evaluateContrast, textContrastThreshold } from '../scripts/metrics.mjs';

const black = { r: 0, g: 0, b: 0 };
const white = { r: 1, g: 1, b: 1 };
const gray = value => ({ r: value, g: value, b: value });

const cases = [
  ['black on white', black, white, 21],
  ['white on black', white, black, 21],
  ['identical colors', black, black, 1],
  ['sRGB linear branch', gray(0.04), black, (0.04 / 12.92 + 0.05) / 0.05],
  ['sRGB power branch', gray(0.5), black, (((0.5 + 0.055) / 1.055) ** 2.4 + 0.05) / 0.05],
];

for (const [name, foreground, background, expected] of cases) {
  test(name, () => assert.ok(Math.abs(contrastRatio(foreground, background) - expected) < 1e-10));
}

test('transparent text composites onto a known opaque background', () => {
  assert.deepEqual(compositeOnOpaque({ ...black, a: 0.5 }, white), gray(0.5));
  assert.deepEqual(compositeOnOpaque({ ...black, a: 0 }, white), white);
  assert.deepEqual(compositeOnOpaque({ ...black, a: 1 }, white), black);
});

test('unknown or translucent backgrounds cannot become a presumed white', () => {
  assert.throws(() => compositeOnOpaque({ ...black, a: 0.5 }, null));
  assert.throws(() => compositeOnOpaque({ ...black, a: 0.5 }, { ...white, a: 0.5 }));
  assert.throws(() => contrastRatio({ ...black, a: 0.5 }, white));
});

test('invalid color channels and alpha are rejected', () => {
  for (const value of [-1, 1.1, NaN, Infinity, undefined, '0']) {
    assert.throws(() => contrastRatio({ ...black, r: value }, white));
    assert.throws(() => compositeOnOpaque({ ...black, a: value }, white));
  }
  assert.throws(() => contrastRatio(black, undefined));
});

test('large text uses CSS pixels, not Figma points', () => {
  assert.equal(textContrastThreshold(24, 400), 3);
  assert.equal(textContrastThreshold(23.99, 400), 4.5);
  assert.equal(textContrastThreshold(14 * 96 / 72, 700), 3);
  assert.equal(textContrastThreshold(18.66, 700), 4.5);
  assert.equal(textContrastThreshold(18, 700), 4.5);
  assert.equal(textContrastThreshold(20, 600), 4.5);
});

test('unknown font weight never assumes bold', () => {
  assert.equal(textContrastThreshold(20), 4.5);
  assert.equal(textContrastThreshold(20, null), 4.5);
  assert.equal(textContrastThreshold(24), 3);
});

test('invalid font metrics are rejected', () => {
  for (const size of [0, -1, NaN, Infinity, undefined, '24']) {
    assert.throws(() => textContrastThreshold(size, 400));
  }
  for (const weight of [0, 1001, NaN, Infinity, 'Bold']) {
    assert.throws(() => textContrastThreshold(20, weight));
  }
});

test('contrast decisions use the unrounded ratio', () => {
  const luminance = 1.05 / 4.499 - 0.05;
  const channel = 1.055 * luminance ** (1 / 2.4) - 0.055;
  const result = evaluateContrast(gray(channel), white, 4.5);
  assert.equal(result.ratio.toFixed(2), '4.50');
  assert.equal(result.passes, false);
  assert.equal(result.threshold, 4.5);
  assert.equal(evaluateContrast(black, white, 21).passes, true);
});

test('non-text contrast accepts its own threshold', () => {
  assert.equal(evaluateContrast(gray(0.5), white, 3).passes, true);
  assert.equal(evaluateContrast(gray(0.5), white, 4.5).passes, false);
  for (const threshold of [0, 22, NaN, undefined, '3']) {
    assert.throws(() => evaluateContrast(black, white, threshold));
  }
});

test('measurements do not mutate input colors', () => {
  const foreground = Object.freeze({ ...black, a: 0.5 });
  const background = Object.freeze({ ...white });
  const rendered = compositeOnOpaque(foreground, background);
  evaluateContrast(rendered, background, 4.5);
  assert.deepEqual(foreground, { ...black, a: 0.5 });
  assert.deepEqual(background, white);
});
