/**
 * API Proxy Layer
 * Handles communication with the Kamatera VPS proxy for various AI models.
 */

// ── 1. PROXY VƏ ŞİFRƏ KONFİQURASİYASI ──────────────────────
// Daimi DuckDNS HTTPS endpoint - Let's Encrypt SSL ilə təhlükəsiz (Workers lazım deyil)
export const PROXY_URL = 'https://esma-ai.duckdns.org/proxy';
export const PROXY_PASS = 'orxan519';

// ── 2. PROVAYEDER KONFİQURASİYASI ────────────────────────────
export const AI_PROVIDERS = [
  { name: 'OpenRouter', id: 'openrouter', model: 'openrouter/free', type: 'openai' },
  { name: 'Qwen', id: 'qwen', model: 'qwen-turbo', type: 'openai' },
  { name: 'Mistral', id: 'mistral', model: 'mistral-small-latest', type: 'openai' },
  { name: 'Gemini', id: 'gemini', model: 'gemini-1.5-flash', type: 'gemini' },
  { name: 'OpenAI', id: 'openai', model: 'gpt-4o-mini', type: 'openai' },
  { name: 'Groq', id: 'groq', model: 'llama-3.3-70b-versatile', type: 'openai' },
  { name: 'GitHub', id: 'github', model: 'gpt-4o-mini', type: 'openai' },
];

export function buildMessages(input, system) {
  const msgs = [];
  if (system) msgs.push({ role: 'system', content: system });

  if (typeof input === 'string') {
    msgs.push({ role: 'user', content: input });
  } else if (Array.isArray(input)) {
    for (const m of input) {
      if (m.role === 'system') continue;
        const content = typeof m.content === 'string'
          ? m.content
          : Array.isArray(m.content)
            ? m.content
            : String(m.content);
      msgs.push({ role: m.role, content });
    }
  }
  return msgs;
}

export async function* streamOpenAI(provider, messages) {
  const res = await fetch(PROXY_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-proxy-pass': PROXY_PASS,
      'x-provider': provider.id
    },
    body: JSON.stringify({
      model: provider.model,
      messages,
      stream: true,
      max_tokens: 4096,
    }),
  });
  
  if (!res.ok) {
    const txt = await res.text().catch(() => '');
    throw new Error(`HTTP ${res.status} — ${txt.slice(0, 150)}`);
  }

  const reader = res.body.getReader();
  const dec = new TextDecoder();
  let buf = '';

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buf += dec.decode(value, { stream: true });
      const lines = buf.split('\n');
      buf = lines.pop();

      for (const line of lines) {
        if (!line.startsWith('data: ')) continue;
        const raw = line.slice(6).trim();
        if (raw === '[DONE]') return;
        try {
          const json = JSON.parse(raw);
          const text = json.choices?.[0]?.delta?.content ?? '';
          if (text) yield { text };
        } catch { /* ignore */ }
      }
    }
  } finally {
    try { await reader.cancel(); } catch(e) {}
  }
}

export async function* streamGemini(provider, messages) {
  const contents = [];
  let sys = '';
  for (const m of messages) {
    if (m.role === 'system') { sys = m.content; continue; }
    
    let parts = [];
    if (typeof m.content === 'string') {
      const text = sys ? `${sys}\n\n${m.content}` : m.content;
      sys = '';
      parts.push({ text });
    } else if (Array.isArray(m.content)) {
      if (sys) { parts.push({ text: sys }); sys = ''; }
      for (const b of m.content) {
        if (b.type === 'text') parts.push({ text: b.text });
        if (b.type === 'image_url') {
           const match = b.image_url.url.match(/^data:(image\/\w+);base64,(.*)$/);
           if (match) parts.push({ inlineData: { mimeType: match[1], data: match[2] } });
        }
      }
    }
    
    contents.push({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: parts,
    });
  }

  const res = await fetch(PROXY_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-proxy-pass': PROXY_PASS,
      'x-provider': provider.id
    },
    body: JSON.stringify({ model: provider.model, stream: true, contents }),
  });
  if (!res.ok) {
    const txt = await res.text().catch(() => '');
    throw new Error(`Gemini stream HTTP ${res.status} — ${txt.slice(0, 150)}`);
  }

  const reader = res.body.getReader();
  const dec = new TextDecoder();
  let buf = '';

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buf += dec.decode(value, { stream: true });
      const lines = buf.split('\n');
      buf = lines.pop();

      for (const line of lines) {
        if (!line.startsWith('data: ')) continue;
        try {
          const json = JSON.parse(line.slice(6));
          const text = json.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
          if (text) yield { text };
        } catch { /* ignore */ }
      }
    }
  } finally {
    try { await reader.cancel(); } catch(e) {}
  }
}

// Fallback Engine Iterator
export async function* streamWithFallback(messages, system, targetModelId) {
  let errs = [];
  
  // Reorder providers to prioritize targetModelId
  let sortedProviders = [...AI_PROVIDERS];
  if (targetModelId) {
    const targetIdx = sortedProviders.findIndex(p => p.id === targetModelId);
    if (targetIdx > -1) {
      const p = sortedProviders.splice(targetIdx, 1)[0];
      sortedProviders.unshift(p);
    }
  }

  for (const prov of sortedProviders) {
    try {
      if (prov.type === 'openai') {
        yield* streamOpenAI(prov, messages);
      } else {
        yield* streamGemini(prov, messages);
      }
      return; 
    } catch (e) {
      errs.push(`${prov.name}: ${e.message}`);
    }
  }
  throw new Error(`Bütün provayderlər xəta verdi:\n${errs.join('\n')}`);
}
