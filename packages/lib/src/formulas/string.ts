import { registerFormula } from '../index';

export function registerStringFormulas(): void {
  // concatenate - join strings
  registerFormula('@toddle/concatenate', (args, ctx) => {
    const strings = args.strings as any[];
    if (!Array.isArray(strings)) return null;
    return strings.map(s => String(s ?? '')).join('');
  });

  // split - split string by delimiter
  registerFormula('@toddle/split', (args, ctx) => {
    const text = String(args.text ?? '');
    const delimiter = String(args.delimiter ?? '');
    return text.split(delimiter);
  });

  // uppercase - convert to uppercase
  registerFormula('@toddle/uppercase', (args, ctx) => {
    const text = String(args.text ?? '');
    return text.toUpperCase();
  });

  // lowercase - convert to lowercase
  registerFormula('@toddle/lowercase', (args, ctx) => {
    const text = String(args.text ?? '');
    return text.toLowerCase();
  });

  // trim - remove whitespace
  registerFormula('@toddle/trim', (args, ctx) => {
    const text = String(args.text ?? '');
    return text.trim();
  });

  // substring - extract substring
  registerFormula('@toddle/substring', (args, ctx) => {
    const text = String(args.text ?? '');
    const start = Number(args.start ?? 0);
    const end = args.end !== undefined ? Number(args.end) : text.length;
    return text.substring(start, end);
  });

  // replace - replace first occurrence
  registerFormula('@toddle/replace', (args, ctx) => {
    const text = String(args.text ?? '');
    const search = String(args.search ?? '');
    const replace = String(args.replace ?? '');
    return text.replace(search, replace);
  });

  // replace-all - replace all occurrences
  registerFormula('@toddle/replace-all', (args, ctx) => {
    const text = String(args.text ?? '');
    const search = String(args.search ?? '');
    const replace = String(args.replace ?? '');
    return text.split(search).join(replace);
  });

  // starts-with - check prefix
  registerFormula('@toddle/starts-with', (args, ctx) => {
    const text = String(args.text ?? '');
    const prefix = String(args.prefix ?? '');
    return text.startsWith(prefix);
  });

  // ends-with - check suffix
  registerFormula('@toddle/ends-with', (args, ctx) => {
    const text = String(args.text ?? '');
    const suffix = String(args.suffix ?? '');
    return text.endsWith(suffix);
  });

  // includes - check if contains
  registerFormula('@toddle/string-includes', (args, ctx) => {
    const text = String(args.text ?? '');
    const search = String(args.search ?? '');
    return text.includes(search);
  });

  // length - string length
  registerFormula('@toddle/string-length', (args, ctx) => {
    const text = String(args.text ?? '');
    return text.length;
  });

  // char-at - get character at index
  registerFormula('@toddle/char-at', (args, ctx) => {
    const text = String(args.text ?? '');
    const index = Number(args.index ?? 0);
    const char = text.charAt(index);
    return char || null;
  });

  // index-of - find substring position
  registerFormula('@toddle/string-index-of', (args, ctx) => {
    const text = String(args.text ?? '');
    const search = String(args.search ?? '');
    return text.indexOf(search);
  });

  // pad-start - pad start of string
  registerFormula('@toddle/pad-start', (args, ctx) => {
    const text = String(args.text ?? '');
    const length = Number(args.length ?? 0);
    const pad = String(args.pad ?? ' ');
    return text.padStart(length, pad);
  });

  // pad-end - pad end of string
  registerFormula('@toddle/pad-end', (args, ctx) => {
    const text = String(args.text ?? '');
    const length = Number(args.length ?? 0);
    const pad = String(args.pad ?? ' ');
    return text.padEnd(length, pad);
  });

  // repeat - repeat string
  registerFormula('@toddle/repeat', (args, ctx) => {
    const text = String(args.text ?? '');
    const count = Math.max(0, Math.floor(Number(args.count ?? 0)));
    return text.repeat(count);
  });
}
