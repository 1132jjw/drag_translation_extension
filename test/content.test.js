const assert = require('assert');

// Functions copied from content.js
function isEnglishText(text) {
  const englishPattern = /^[a-zA-Z\s'-]+$/;
  return englishPattern.test(text.trim());
}

function isSingleWord(text) {
  const words = text.trim().split(/\s+/);
  return words.length === 1 && words[0].length > 1;
}

// Tests for isEnglishText
assert.strictEqual(isEnglishText('hello'), true, 'simple word');
assert.strictEqual(isEnglishText('hello world'), true, 'phrase');
assert.strictEqual(isEnglishText("it's"), true, 'apostrophe');
assert.strictEqual(isEnglishText('hello123'), false, 'contains numbers');
assert.strictEqual(isEnglishText('こんにちは'), false, 'non english');

// Tests for isSingleWord
assert.strictEqual(isSingleWord('hello'), true, 'single word');
assert.strictEqual(isSingleWord('hello world'), false, 'two words');
assert.strictEqual(isSingleWord(' hi '), true, 'trimmed single word');
assert.strictEqual(isSingleWord('a'), false, 'single letter too short');
assert.strictEqual(isSingleWord("can't"), true, 'word with apostrophe');

console.log('All tests passed!');
