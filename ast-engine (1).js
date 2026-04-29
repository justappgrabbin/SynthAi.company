// ast-engine.js
// Morph OS v1.3 — Token Stream Transform Engine
// Zero dependencies. Pure Node.js.

// ─── TOKENIZER ────────────────────────────────────────────────
class Tokenizer {
  constructor(code) {
    this.code = code;
    this.pos = 0;
    this.tokens = [];
    this.tokenize();
  }

  tokenize() {
    const keywords = ['var', 'let', 'const', 'function', 'async', 'return', 'if', 'else', 'for', 'while', 'class', 'new', 'try', 'catch', 'throw', 'static', 'extends'];

    while (this.pos < this.code.length) {
      const char = this.code[this.pos];

      // Skip whitespace (preserve newlines)
      if (char === '\n') {
        this.tokens.push({ type: 'NEWLINE', value: '\n', pos: this.pos });
        this.pos++;
        continue;
      }
      if (/\s/.test(char)) {
        let ws = '';
        while (this.pos < this.code.length && /[ \t\r]/.test(this.code[this.pos])) {
          ws += this.code[this.pos++];
        }
        this.tokens.push({ type: 'WHITESPACE', value: ws, pos: this.pos - ws.length });
        continue;
      }

      // Comments
      if (char === '/' && this.code[this.pos + 1] === '/') {
        let comment = '';
        while (this.pos < this.code.length && this.code[this.pos] !== '\n') {
          comment += this.code[this.pos++];
        }
        this.tokens.push({ type: 'COMMENT', value: comment, pos: this.pos - comment.length });
        continue;
      }
      if (char === '/' && this.code[this.pos + 1] === '*') {
        let comment = '';
        this.pos += 2;
        while (this.pos < this.code.length && !(this.code[this.pos] === '*' && this.code[this.pos + 1] === '/')) {
          comment += this.code[this.pos++];
        }
        comment += '*/';
        this.pos += 2;
        this.tokens.push({ type: 'COMMENT', value: comment, pos: this.pos - comment.length });
        continue;
      }

      // Strings
      if (char === '"' || char === "'" || char === '`') {
        const quote = char;
        let str = char;
        this.pos++;
        while (this.pos < this.code.length && this.code[this.pos] !== quote) {
          if (this.code[this.pos] === '\\') {
            str += this.code[this.pos++];
          }
          str += this.code[this.pos++];
        }
        str += quote;
        this.pos++;
        this.tokens.push({ type: 'STRING', value: str, pos: this.pos - str.length });
        continue;
      }

      // Numbers
      if (/\d/.test(char)) {
        let num = '';
        while (this.pos < this.code.length && /[\d.]/.test(this.code[this.pos])) {
          num += this.code[this.pos++];
        }
        this.tokens.push({ type: 'NUMBER', value: num, pos: this.pos - num.length });
        continue;
      }

      // Identifiers and keywords
      if (/[a-zA-Z_$]/.test(char)) {
        let id = '';
        while (this.pos < this.code.length && /[a-zA-Z0-9_$]/.test(this.code[this.pos])) {
          id += this.code[this.pos++];
        }
        const type = keywords.includes(id) ? 'KEYWORD' : 'IDENTIFIER';
        this.tokens.push({ type, value: id, pos: this.pos - id.length });
        continue;
      }

      // Multi-char operators (check first)
      const multiOps = ['===', '!==', '==', '!=', '<=', '>=', '++', '--', '&&', '||', '=>', '...'];
      let foundMulti = false;
      for (const op of multiOps) {
        if (this.code.slice(this.pos, this.pos + op.length) === op) {
          this.tokens.push({ type: 'OPERATOR', value: op, pos: this.pos });
          this.pos += op.length;
          foundMulti = true;
          break;
        }
      }
      if (foundMulti) continue;

      // Single-char operators and punctuation
      if (/[+\-*/%=<>!&|~^:;.,()[\]{}]/.test(char)) {
        this.tokens.push({ type: 'PUNCT', value: char, pos: this.pos });
        this.pos++;
        continue;
      }

      // Unknown char
      this.pos++;
    }

    this.tokens.push({ type: 'EOF', value: '', pos: this.pos });
  }
}

// ─── TOKEN STREAM TRANSFORMER ─────────────────────────────────
class TokenStreamTransformer {
  constructor(tokens) {
    this.tokens = tokens;
    this.pos = 0;
  }

  current() { return this.tokens[this.pos]; }
  advance() { return this.tokens[this.pos++]; }
  peek(n = 1) { return this.tokens[this.pos + n] || this.tokens[this.tokens.length - 1]; }

  // Find all occurrences of a token sequence pattern
  findPattern(patternFn) {
    const matches = [];
    for (let i = 0; i < this.tokens.length; i++) {
      const match = patternFn(this.tokens, i);
      if (match) {
        matches.push({ start: i, end: i + match.length, tokens: match });
      }
    }
    return matches;
  }

  // Apply a transformation: replace tokens at indices [start, end) with new tokens
  replace(start, end, newTokens) {
    this.tokens.splice(start, end - start, ...newTokens);
    // Adjust pos if needed
    if (this.pos > start) this.pos = start + newTokens.length;
  }

  // Remove tokens at indices [start, end)
  remove(start, end) {
    this.tokens.splice(start, end - start);
    if (this.pos > start) this.pos = start;
  }

  // Generate code from tokens
  generate() {
    return this.tokens.filter(t => t.type !== 'EOF').map(t => t.value).join('');
  }
}

// ─── BUILT-IN TRANSFORMS ──────────────────────────────────────
function transformVarToLet(tokens) {
  for (let i = 0; i < tokens.length; i++) {
    if (tokens[i].type === 'KEYWORD' && tokens[i].value === 'var') {
      tokens[i].value = 'let';
      tokens[i].type = 'KEYWORD';
    }
  }
  return tokens;
}

function transformLooseEquality(tokens) {
  for (let i = 0; i < tokens.length; i++) {
    if (tokens[i].type === 'OPERATOR' && tokens[i].value === '==') {
      tokens[i].value = '===';
    } else if (tokens[i].type === 'OPERATOR' && tokens[i].value === '!=') {
      tokens[i].value = '!==';
    }
  }
  return tokens;
}

function transformRemoveConsoleLog(tokens) {
  const result = [];
  let i = 0;
  while (i < tokens.length) {
    // Look for: IDENTIFIER(console) PUNCT(.) IDENTIFIER(log) PUNCT(()) ... PUNCT())
    if (tokens[i].type === 'IDENTIFIER' && tokens[i].value === 'console' &&
        tokens[i + 1]?.type === 'PUNCT' && tokens[i + 1]?.value === '.' &&
        tokens[i + 2]?.type === 'IDENTIFIER' && tokens[i + 2]?.value === 'log' &&
        tokens[i + 3]?.type === 'PUNCT' && tokens[i + 3]?.value === '(') {

      // Skip past the closing paren (handle nested parens)
      let depth = 1;
      let j = i + 4;
      while (j < tokens.length && depth > 0) {
        if (tokens[j].type === 'PUNCT' && tokens[j].value === '(') depth++;
        else if (tokens[j].type === 'PUNCT' && tokens[j].value === ')') depth--;
        j++;
      }

      // Also skip trailing semicolon and whitespace/newline
      while (j < tokens.length && 
             (tokens[j].type === 'PUNCT' && tokens[j].value === ';' ||
              tokens[j].type === 'WHITESPACE' || tokens[j].type === 'NEWLINE')) {
        j++;
      }

      // Skip one extra newline if present
      if (j < tokens.length && tokens[j].type === 'NEWLINE') {
        j++;
      }

      i = j;
      continue;
    }
    result.push(tokens[i]);
    i++;
  }
  return result;
}

function transformAddJSDoc(tokens) {
  const result = [];
  let i = 0;
  while (i < tokens.length) {
    // Look for function declarations: KEYWORD(function) IDENTIFIER(params)
    if (tokens[i].type === 'KEYWORD' && tokens[i].value === 'function' &&
        tokens[i + 1]?.type === 'IDENTIFIER' &&
        tokens[i + 2]?.type === 'PUNCT' && tokens[i + 2]?.value === '(') {

      const funcName = tokens[i + 1].value;

      // Extract params
      const params = [];
      let j = i + 3;
      while (j < tokens.length && !(tokens[j].type === 'PUNCT' && tokens[j].value === ')')) {
        if (tokens[j].type === 'IDENTIFIER') {
          params.push(tokens[j].value);
        }
        j++;
      }

      // Build JSDoc comment
      let jsdoc = '/**\n';
      jsdoc += ' * ' + funcName + '\n';
      for (const param of params) {
        jsdoc += ' * @param {any} ' + param + '\n';
      }
      jsdoc += ' * @returns {any}\n';
      jsdoc += ' */\n';

      // Insert JSDoc before function
      result.push({ type: 'COMMENT', value: jsdoc, pos: tokens[i].pos });

      // Add the function tokens
      while (i < tokens.length && !(tokens[i].type === 'PUNCT' && tokens[i].value === '{')) {
        result.push(tokens[i]);
        i++;
      }
      // Add the opening brace
      if (i < tokens.length) {
        result.push(tokens[i]);
        i++;
      }
      continue;
    }
    result.push(tokens[i]);
    i++;
  }
  return result;
}

// ─── MAIN API ─────────────────────────────────────────────────
function tokenize(code) {
  return new Tokenizer(code).tokens;
}

function applyTransforms(code, transformNames) {
  let tokens = tokenize(code);

  if (transformNames.includes('var_to_let')) {
    tokens = transformVarToLet(tokens);
  }
  if (transformNames.includes('loose_equality')) {
    tokens = transformLooseEquality(tokens);
  }
  if (transformNames.includes('remove_console_logs')) {
    tokens = transformRemoveConsoleLog(tokens);
  }
  if (transformNames.includes('add_jsdoc')) {
    tokens = transformAddJSDoc(tokens);
  }

  return new TokenStreamTransformer(tokens).generate();
}

// ─── EXPORTS ──────────────────────────────────────────────────
module.exports = {
  Tokenizer, TokenStreamTransformer,
  tokenize, applyTransforms,
  transformVarToLet, transformLooseEquality,
  transformRemoveConsoleLog, transformAddJSDoc
};
