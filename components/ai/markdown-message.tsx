import Markdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";

// Element styles sized for a narrow chat bubble; wide tables scroll sideways instead of wrapping.
const components: Components = {
  p: ({ children }) => <p className="my-2 first:mt-0 last:mb-0">{children}</p>,
  h1: ({ children }) => <p className="mt-3 mb-1.5 font-semibold first:mt-0">{children}</p>,
  h2: ({ children }) => <p className="mt-3 mb-1.5 font-semibold first:mt-0">{children}</p>,
  h3: ({ children }) => <p className="mt-3 mb-1.5 font-semibold first:mt-0">{children}</p>,
  h4: ({ children }) => <p className="mt-3 mb-1.5 font-semibold first:mt-0">{children}</p>,
  ul: ({ children }) => <ul className="my-2 list-disc space-y-1 pl-5 first:mt-0 last:mb-0">{children}</ul>,
  ol: ({ children }) => <ol className="my-2 list-decimal space-y-1 pl-5 first:mt-0 last:mb-0">{children}</ol>,
  strong: ({ children }) => <strong className="font-semibold text-foreground">{children}</strong>,
  a: ({ children, href }) => (
    <a href={href} target="_blank" rel="noreferrer" className="text-primary underline underline-offset-2">
      {children}
    </a>
  ),
  hr: () => <hr className="my-3 border-border" />,
  blockquote: ({ children }) => <blockquote className="my-2 border-l-2 border-primary/50 pl-3 text-muted-foreground">{children}</blockquote>,
  code: ({ children }) => <code className="rounded bg-background/60 px-1 py-0.5 text-[0.85em]">{children}</code>,
  table: ({ children }) => (
    <div className="my-2 -mx-1 overflow-x-auto">
      <table className="w-full border-collapse text-xs">{children}</table>
    </div>
  ),
  th: ({ children }) => <th className="border-b border-border px-2 py-1.5 text-left font-semibold">{children}</th>,
  td: ({ children }) => <td className="border-b border-border/60 px-2 py-1.5 align-top">{children}</td>,
};

export function MarkdownMessage({ content }: { content: string }) {
  return (
    <div className="break-words">
      <Markdown remarkPlugins={[remarkGfm]} components={components}>
        {content}
      </Markdown>
    </div>
  );
}
