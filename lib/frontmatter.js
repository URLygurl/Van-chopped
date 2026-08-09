// Stage 3 (part 1): a deliberately-simple YAML frontmatter reader.
// Mirrors Chops' FrontmatterParser — no real YAML dependency, just enough to
// pull `name`, `description`, and a flat key/value dict out of the header.

/**
 * @param {string} text raw file contents
 * @returns {{ frontmatter: Record<string,string>, content: string, name: string, description: string, hasFrontmatter: boolean }}
 */
export function parseFrontmatter(text) {
  const lines = text.split('\n');

  if ((lines[0] ?? '').trim() !== '---') {
    return { frontmatter: {}, content: text, name: '', description: '', hasFrontmatter: false };
  }

  let end = -1;
  for (let i = 1; i < lines.length; i++) {
    if (lines[i].trim() === '---') { end = i; break; }
  }
  if (end === -1) {
    return { frontmatter: {}, content: text, name: '', description: '', hasFrontmatter: false };
  }

  const frontmatter = {};
  for (let i = 1; i < end; i++) {
    const line = lines[i];
    const colon = line.indexOf(':');
    if (colon === -1) continue;
    const key = line.slice(0, colon).trim();
    let value = line.slice(colon + 1).trim();
    // strip matching surrounding quotes
    if (value.length >= 2 && ((value[0] === '"' && value.at(-1) === '"') || (value[0] === "'" && value.at(-1) === "'"))) {
      value = value.slice(1, -1);
    }
    if (key) frontmatter[key] = value;
  }

  const content = lines.slice(end + 1).join('\n').trim();
  return {
    frontmatter,
    content,
    name: frontmatter.name ?? '',
    description: frontmatter.description ?? '',
    hasFrontmatter: true,
  };
}

/** First markdown `# Heading` in the text, if any. */
export function firstHeading(text) {
  for (const line of text.split('\n')) {
    if (line.startsWith('# ')) return line.slice(2).trim();
  }
  return '';
}

/**
 * Rewrite a document with a new flat frontmatter dict, preserving the body.
 * Values are emitted as simple `key: value`; quoted if they contain a colon.
 */
export function serializeWithFrontmatter(frontmatter, body) {
  const keys = Object.keys(frontmatter);
  if (keys.length === 0) return body.trimStart();
  const lines = keys.map((k) => {
    let v = frontmatter[k] ?? '';
    if (/[:#]/.test(v) && !/^["'].*["']$/.test(v)) v = `"${v}"`;
    return `${k}: ${v}`;
  });
  return `---\n${lines.join('\n')}\n---\n\n${body.trimStart()}`;
}
