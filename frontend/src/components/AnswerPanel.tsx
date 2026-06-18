import { useEffect, useRef, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Sparkles } from 'lucide-react';

/**
 * Reveals `target` as smooth typing. Gemini streams in a handful of largish
 * chunks; this paces them into a continuous reveal that always catches up and
 * finishes. `instant` shows the full text immediately (e.g. a past request).
 */
function useTypewriter(target: string, instant: boolean): string {
  const [shown, setShown] = useState(instant ? target : '');
  const idx = useRef(instant ? target.length : 0);
  const targetRef = useRef(target);
  targetRef.current = target;

  useEffect(() => {
    if (instant) {
      idx.current = targetRef.current.length;
      setShown(targetRef.current);
      return;
    }
    let raf = 0;
    const tick = () => {
      const t = targetRef.current;
      if (idx.current < t.length) {
        // Reveal faster when far behind so it tracks the stream, slower near the end.
        idx.current = Math.min(t.length, idx.current + Math.max(2, Math.round((t.length - idx.current) / 22)));
        setShown(t.slice(0, idx.current));
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [instant]);

  return shown;
}

interface Props {
  answer: string;
  streaming: boolean;
  instant?: boolean;
}

/** The synthesised narrative, rendered as markdown with a live typing cursor. */
export function AnswerPanel({ answer, streaming, instant = false }: Props) {
  const shown = useTypewriter(answer, instant);
  const typing = !instant && (streaming || shown.length < answer.length);

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-500 dark:text-slate-400">
        <Sparkles className="h-4 w-4 text-indigo-500" />
        Synthesised answer
      </div>
      <div className="prose-trip">
        <ReactMarkdown remarkPlugins={[remarkGfm]}>{instant ? answer : shown}</ReactMarkdown>
        {typing && (
          <span className="ml-0.5 inline-block h-4 w-[3px] translate-y-0.5 animate-blink rounded-sm bg-indigo-500 align-middle" />
        )}
      </div>
    </div>
  );
}
