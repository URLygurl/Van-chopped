// Minimal, dependency-free Markdown -> HTML renderer for previews.
// Handles headings, bold/italic/code, fenced code, lists, blockquotes, hr,
// links, and paragraphs. Not spec-complete — just enough for readable previews.
export function renderMarkdown(md) {
  const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const inline = (s) =>
    esc(s)
      .replace(/`([^`]+)`/g, '<code>$1</code>')
      .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
      .replace(/\*([^*]+)\*/g, '<em>$1</em>')
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noreferrer">$1</a>');

  const lines = md.split('\n');
  let html = '', i = 0, inList = false, listTag = '';
  const closeList = () => { if (inList) { html += `</${listTag}>`; inList = false; } };

  while (i < lines.length) {
    let line = lines[i];

    if (/^```/.test(line)) {
      closeList();
      const buf = [];
      i++;
      while (i < lines.length && !/^```/.test(lines[i])) { buf.push(lines[i]); i++; }
      html += `<pre><code>${esc(buf.join('\n'))}</code></pre>`;
      i++; continue;
    }
    const h = line.match(/^(#{1,6})\s+(.*)$/);
    if (h) { closeList(); html += `<h${h[1].length}>${inline(h[2])}</h${h[1].length}>`; i++; continue; }
    if (/^\s*([-*+])\s+/.test(line)) {
      if (!inList || listTag !== 'ul') { closeList(); inList = true; listTag = 'ul'; html += '<ul>'; }
      html += `<li>${inline(line.replace(/^\s*[-*+]\s+/, ''))}</li>`; i++; continue;
    }
    if (/^\s*\d+\.\s+/.test(line)) {
      if (!inList || listTag !== 'ol') { closeList(); inList = true; listTag = 'ol'; html += '<ol>'; }
      html += `<li>${inline(line.replace(/^\s*\d+\.\s+/, ''))}</li>`; i++; continue;
    }
    if (/^\s*>\s?/.test(line)) { closeList(); html += `<blockquote>${inline(line.replace(/^\s*>\s?/, ''))}</blockquote>`; i++; continue; }
    if (/^\s*([-*_])\1{2,}\s*$/.test(line)) { closeList(); html += '<hr>'; i++; continue; }
    if (line.trim() === '') { closeList(); i++; continue; }

    closeList();
    html += `<p>${inline(line)}</p>`;
    i++;
  }
  closeList();
  return html;
}
