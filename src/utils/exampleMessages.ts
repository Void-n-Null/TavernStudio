export type ExampleRole = 'user' | 'char';

export type ExampleMessage = {
  role: ExampleRole;
  content: string;
};

export type ExampleConversation = {
  id: string;
  messages: ExampleMessage[];
};

export type ExampleParseResult = {
  ok: boolean;
  conversations: ExampleConversation[];
  issues: string[];
  unparsed: string;
};

const USER_PREFIXES = ['{{user}}:', '<USER>:', 'USER:', 'User:'];
const CHAR_PREFIXES = ['{{char}}:', '<BOT>:', 'BOT:', 'Bot:', 'Assistant:', '{{bot}}:'];

function startsWithAny(line: string, prefixes: string[]): string | null {
  for (const p of prefixes) {
    if (line.toLowerCase().startsWith(p.toLowerCase())) return line.slice(p.length).trimStart();
  }
  return null;
}

function normalizeNewlines(s: string): string {
  return s.replace(/\r\n/g, '\n');
}

function splitByStartMarkers(raw: string): string[] {
  // Split on lines that contain <START> (common SillyTavern marker).
  // Keep it permissive: users sometimes paste "<START><START>" or extra whitespace.
  const lines = normalizeNewlines(raw).split('\n');
  const sections: string[] = [];
  let buf: string[] = [];

  const flush = () => {
    const text = buf.join('\n').trim();
    if (text) sections.push(text);
    buf = [];
  };

  for (const line of lines) {
    if (line.trim().toUpperCase().includes('<START>')) {
      flush();
      continue;
    }
    buf.push(line);
  }

  flush();
  return sections;
}

export function parseExampleMessages(rawInput: string): ExampleParseResult {
  const raw = normalizeNewlines(rawInput || '');
  const issues: string[] = [];

  const sections = splitByStartMarkers(raw);
  const conversations: ExampleConversation[] = [];
  let unparsed = '';

  if (!raw.trim()) {
    return { ok: true, conversations: [], issues: [], unparsed: '' };
  }

  // If there are no <START> markers, treat entire text as one section.
  const effectiveSections = sections.length > 0 ? sections : [raw.trim()];

  for (let sIdx = 0; sIdx < effectiveSections.length; sIdx++) {
    const section = effectiveSections[sIdx];
    const lines = section.split('\n');
    const messages: ExampleMessage[] = [];
    let current: ExampleMessage | null = null;

    const pushCurrent = () => {
      if (!current) return;
      current.content = current.content.replace(/\n{3,}/g, '\n\n').trimEnd();
      if (current.content.trim()) messages.push(current);
      current = null;
    };

    for (const lineRaw of lines) {
      const line = lineRaw;
      const userText = startsWithAny(line.trimStart(), USER_PREFIXES);
      const charText = userText === null ? startsWithAny(line.trimStart(), CHAR_PREFIXES) : null;

      if (userText !== null) {
        pushCurrent();
        current = { role: 'user', content: userText };
        continue;
      }

      if (charText !== null) {
        pushCurrent();
        current = { role: 'char', content: charText };
        continue;
      }

      // Continuation line: must belong to an existing message.
      if (!current) {
        // This is content the builder can't attribute safely.
        unparsed += (unparsed ? '\n' : '') + line;
        continue;
      }

      current.content += (current.content ? '\n' : '') + line;
    }

    pushCurrent();

    if (messages.length === 0 && section.trim()) {
      issues.push(`Conversation ${sIdx + 1}: no recognizable {{user}}/{{char}} message prefixes found`);
      unparsed += (unparsed ? '\n\n' : '') + section.trim();
      continue;
    }

    conversations.push({
      // Deterministic ID to avoid focus loss/remounts when re-parsing.
      id: `conv_${sIdx}`,
      messages,
    });
  }

  const ok = issues.length === 0 && !unparsed.trim();
  return { ok, conversations, issues, unparsed: unparsed.trim() };
}

export function serializeExampleMessages(conversations: ExampleConversation[]): string {
  const out: string[] = [];
  for (const conv of conversations) {
    if (!conv.messages.length) continue;
    out.push('<START>');
    for (const msg of conv.messages) {
      const prefix = msg.role === 'user' ? '{{user}}: ' : '{{char}}: ';
      const content = (msg.content || '').trimEnd();
      if (!content.trim()) continue;
      // Preserve multiline by prefixing only first line; continuation lines stay raw.
      const lines = normalizeNewlines(content).split('\n');
      out.push(prefix + lines[0]);
      for (const cont of lines.slice(1)) out.push(cont);
    }
    out.push(''); // blank line between convs
  }
  return out.join('\n').trimEnd();
}


