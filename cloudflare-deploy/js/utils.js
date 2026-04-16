export function esc(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function autoResize(el) {
  el.style.height = 'auto';
  el.style.height = Math.min(el.scrollHeight, 200) + 'px';
}

export function scrollBottom(containerId) {
  requestAnimationFrame(() => {
    const el = document.getElementById(containerId);
    if (el) el.scrollTop = el.scrollHeight;
  });
}

export function showToast(msg) {
  const el = document.getElementById('toast');
  if (!el) return;
  el.textContent = msg;
  el.classList.add('show');
  setTimeout(() => el.classList.remove('show'), 3000);
}

export function renderMarkdown(text) {
  const codeBlocks = [];
  
  // Extract Code Blocks
  text = text.replace(/```(\w*)\n?([\s\S]*?)```/g, (_, lang, code) => {
    const html = `<pre><code class="language-${lang || 'txt'}">${esc(code.trim())}</code></pre>`;
    const placeholder = `\0CODEBLOCK${codeBlocks.length}\0`;
    codeBlocks.push(html);
    return placeholder;
  });

  // Inline Code
  text = text.replace(/`([^`\n]+)`/g, (_, c) => {
    const html = `<code style="background:var(--glass-bg);padding:2px 6px;border-radius:4px;font-family:var(--font-mono)">${esc(c)}</code>`;
    const placeholder = `\0CODEBLOCK${codeBlocks.length}\0`;
    codeBlocks.push(html);
    return placeholder;
  });

  // Formatting
  text = text.replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>');
  text = text.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  text = text.replace(/\*(.+?)\*/g, '<em>$1</em>');
  text = text.replace(/^### (.+)$/gm, '<h3 style="margin:14px 0 4px">$1</h3>');
  text = text.replace(/^## (.+)$/gm, '<h2 style="margin:16px 0 6px">$1</h2>');
  text = text.replace(/^# (.+)$/gm, '<h1 style="margin:18px 0 8px">$1</h1>');
  text = text.replace(/^---$/gm, '<hr style="border:none;border-top:1px solid var(--glass-border);margin:14px 0">');
  text = text.replace(/^[\-\*] (.+)$/gm, '<div style="margin:4px 0;display:flex;gap:8px"><span style="color:var(--accent)">•</span><span>$1</span></div>');
  text = text.replace(/\n\n/g, '<br><br>').replace(/\n/g, '<br>');

  // Restore Code Blocks
  text = text.replace(/\0CODEBLOCK(\d+)\0/g, (_, i) => codeBlocks[parseInt(i)]);
  return text;
}
