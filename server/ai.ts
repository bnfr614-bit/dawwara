const API = 'https://api.anthropic.com/v1/messages';

export const aiEnabled = () => !!process.env.ANTHROPIC_API_KEY;

export async function claude(opts: {
  system: string;
  messages: { role: 'user' | 'assistant'; content: string }[];
  maxTokens?: number;
  timeoutMs?: number;
}): Promise<string> {
  if (!aiEnabled()) throw new Error('ANTHROPIC_API_KEY missing');
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), opts.timeoutMs ?? 30000);
  try {
    const res = await fetch(API, {
      method: 'POST',
      signal: ctrl.signal,
      headers: {
        'content-type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY!,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: process.env.ANTHROPIC_MODEL || 'claude-sonnet-5-5',
        max_tokens: opts.maxTokens ?? 1024,
        system: opts.system,
        messages: opts.messages,
      }),
    });
    if (!res.ok) throw new Error(`Claude API ${res.status}: ${await res.text()}`);
    const data = await res.json();
    return (data.content || []).filter((b: any) => b.type === 'text').map((b: any) => b.text).join('');
  } finally {
    clearTimeout(t);
  }
}

export function extractJson<T = any>(text: string): T {
  const m = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  const raw = m ? m[1] : text.slice(text.search(/[\[{]/));
  return JSON.parse(raw);
}
