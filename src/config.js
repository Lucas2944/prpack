import { readFileSync } from 'node:fs';

export async function loadConfig(path) {
  const raw = readFileSync(path, 'utf8');
  return parseSimpleYaml(raw);
}

function parseSimpleYaml(raw) {
  const out = {};
  const lines = raw.split('\n');
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (!line.trim() || line.trim().startsWith('#')) {
      i++;
      continue;
    }
    if (/^[a-zA-Z][\w-]*:\s*\|\s*$/.test(line)) {
      const key = line.split(':')[0].trim();
      i++;
      const block = [];
      let baseIndent = null;
      while (i < lines.length) {
        const next = lines[i];
        if (next.trim() === '') {
          block.push('');
          i++;
          continue;
        }
        const indent = next.match(/^\s*/)[0].length;
        if (baseIndent === null) baseIndent = indent;
        if (indent < baseIndent) break;
        block.push(next.slice(baseIndent));
        i++;
      }
      out[camel(key)] = block.join('\n').replace(/\s+$/, '');
      continue;
    }
    const m = line.match(/^([a-zA-Z][\w-]*):\s*(.*)$/);
    if (m) {
      const key = camel(m[1]);
      const valRaw = m[2].trim();
      if (valRaw === '' || valRaw === '~' || valRaw.toLowerCase() === 'null') {
        out[key] = null;
      } else if (valRaw.startsWith('[') && valRaw.endsWith(']')) {
        out[key] = valRaw
          .slice(1, -1)
          .split(',')
          .map((s) => stripQuotes(s.trim()))
          .filter(Boolean);
      } else if (/^(true|false)$/i.test(valRaw)) {
        out[key] = valRaw.toLowerCase() === 'true';
      } else if (/^-?\d+$/.test(valRaw)) {
        out[key] = parseInt(valRaw, 10);
      } else {
        out[key] = stripQuotes(valRaw);
      }
      i++;
      continue;
    }
    if (line.match(/^\s+-\s+/)) {
      let j = i - 1;
      while (j >= 0 && !/^[a-zA-Z]/.test(lines[j])) j--;
      if (j >= 0) {
        const parentKey = camel(lines[j].split(':')[0].trim());
        if (!Array.isArray(out[parentKey])) out[parentKey] = [];
        const item = stripQuotes(line.replace(/^\s+-\s+/, '').trim());
        out[parentKey].push(item);
      }
    }
    i++;
  }
  return out;
}

function stripQuotes(s) {
  if (
    (s.startsWith('"') && s.endsWith('"')) ||
    (s.startsWith("'") && s.endsWith("'"))
  ) {
    return s.slice(1, -1);
  }
  return s;
}

function camel(s) {
  return s.replace(/-([a-z])/g, (_, c) => c.toUpperCase());
}
