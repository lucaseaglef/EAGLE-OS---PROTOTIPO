import React, { useMemo, useState } from 'react';
import { ChevronDown, ChevronUp, ExternalLink, FolderOpen } from 'lucide-react';

function renderInlineSegments(text: string): React.ReactNode[] {
  const regex = /(https?:\/\/[^\s]+|\/(?:clientes|estudio|projetos|docs)\/[a-zA-Z0-9._\-\/]+|#\d+)/g;
  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }
    const token = match[0];
    if (token.startsWith('http://') || token.startsWith('https://')) {
      parts.push(
        <a
          key={`${match.index}-${token}`}
          href={token}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-[#163744] dark:text-[#9fdce6] underline decoration-[#163744]/30 dark:decoration-[#9fdce6]/35 underline-offset-2 hover:decoration-[#163744] dark:hover:decoration-[#9fdce6] break-all"
        >
          <span>{token.replace(/^https?:\/\//, '')}</span>
          <ExternalLink className="w-3 h-3 shrink-0" />
        </a>
      );
    } else if (token.startsWith('/')) {
      parts.push(
        <span
          key={`${match.index}-${token}`}
          className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-[6px] bg-[#e6e9ed]/85 dark:bg-[#1e2430] text-[#0f1115]/82 dark:text-[#f2f4f7]/85 text-[12.5px] font-medium tabular-nums border border-[#0f1115]/8 dark:border-[#f2f4f7]/10"
        >
          <FolderOpen className="w-3 h-3 text-[#163744] dark:text-[#9fdce6] shrink-0" />
          <span>{token}</span>
        </span>
      );
    } else {
      parts.push(
        <span
          key={`${match.index}-${token}`}
          className="font-semibold text-[#163744] dark:text-[#9fdce6] tabular-nums"
        >
          {token}
        </span>
      );
    }
    lastIndex = regex.lastIndex;
  }

  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }

  return parts;
}

export function RichTextBlock({
  content,
  collapseThreshold = 230,
  defaultExpanded = false,
  className = '',
}: {
  content: string;
  collapseThreshold?: number;
  defaultExpanded?: boolean;
  className?: string;
}) {
  const lines = useMemo(() => content.split('\n'), [content]);
  const isLong = content.length > collapseThreshold || lines.length > 5;
  const [expanded, setExpanded] = useState(defaultExpanded);

  const visibleLines = useMemo(() => {
    if (!isLong || expanded) return lines;
    // Mostrar apenas as primeiras linhas / limite confortável quando recolhido
    const acc: string[] = [];
    let chars = 0;
    for (const line of lines) {
      if (acc.length >= 4 || (chars > 170 && acc.length >= 2)) break;
      acc.push(line);
      chars += line.length;
    }
    return acc;
  }, [expanded, isLong, lines]);

  // Agrupar blocos (headings, listas, parágrafos)
  const blocks = useMemo(() => {
    const result: Array<
      | { kind: 'heading'; text: string }
      | { kind: 'ul'; items: string[] }
      | { kind: 'ol'; items: string[] }
      | { kind: 'p'; text: string }
    > = [];

    for (const raw of visibleLines) {
      const line = raw.trim();
      if (!line) continue;

      if (line.startsWith('## ') || line.startsWith('### ')) {
        result.push({ kind: 'heading', text: line.replace(/^#{2,3}\s+/, '') });
      } else if (line.startsWith('- ') || line.startsWith('* ')) {
        const item = line.slice(2).trim();
        const prev = result[result.length - 1];
        if (prev && prev.kind === 'ul') {
          prev.items.push(item);
        } else {
          result.push({ kind: 'ul', items: [item] });
        }
      } else if (/^\d+\.\s+/.test(line)) {
        const item = line.replace(/^\d+\.\s+/, '');
        const prev = result[result.length - 1];
        if (prev && prev.kind === 'ol') {
          prev.items.push(item);
        } else {
          result.push({ kind: 'ol', items: [item] });
        }
      } else {
        result.push({ kind: 'p', text: line });
      }
    }
    return result;
  }, [visibleLines]);

  return (
    <div className={className}>
      <div className="space-y-2 text-[13.5px] leading-relaxed text-[#0f1115]/86 dark:text-[#f2f4f7]/86">
        {blocks.map((block, idx) => {
          if (block.kind === 'heading') {
            return (
              <h4
                key={idx}
                className="text-[14px] font-semibold tracking-[-0.01em] text-[#0f1115] dark:text-[#f2f4f7] pt-0.5"
              >
                {renderInlineSegments(block.text)}
              </h4>
            );
          }
          if (block.kind === 'ul') {
            return (
              <ul key={idx} className="space-y-1 pl-4 list-disc marker:text-[#163744]/55 dark:marker:text-[#9fdce6]/65">
                {block.items.map((item, i) => (
                  <li key={i} className="leading-relaxed">
                    {renderInlineSegments(item)}
                  </li>
                ))}
              </ul>
            );
          }
          if (block.kind === 'ol') {
            return (
              <ol
                key={idx}
                className="space-y-1 pl-4 list-decimal marker:text-[#163744]/65 dark:marker:text-[#9fdce6]/70 marker:font-medium tabular-nums"
              >
                {block.items.map((item, i) => (
                  <li key={i} className="leading-relaxed">
                    {renderInlineSegments(item)}
                  </li>
                ))}
              </ol>
            );
          }
          return (
            <p key={idx} className="leading-relaxed">
              {renderInlineSegments(block.text)}
            </p>
          );
        })}
      </div>

      {isLong && (
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="mt-2 inline-flex items-center gap-1 text-[12px] font-medium text-[#163744] dark:text-[#9fdce6] hover:underline cursor-pointer"
        >
          {expanded ? (
            <>
              <ChevronUp className="w-3.5 h-3.5" />
              <span>Mostrar menos</span>
            </>
          ) : (
            <>
              <ChevronDown className="w-3.5 h-3.5" />
              <span>Mostrar mais</span>
            </>
          )}
        </button>
      )}
    </div>
  );
}
