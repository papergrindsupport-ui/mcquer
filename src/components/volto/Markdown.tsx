import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import "katex/dist/katex.min.css";

export function Markdown({ children }: { children: string }) {
  return (
    <div className="volto-md text-sm leading-relaxed text-foreground">
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkMath]}
        rehypePlugins={[rehypeKatex]}
        components={{
          p: (p) => <p className="mb-2 last:mb-0" {...p} />,
          ul: (p) => <ul className="mb-2 ml-5 list-disc space-y-0.5" {...p} />,
          ol: (p) => (
            <ol className="mb-2 ml-5 list-decimal space-y-0.5" {...p} />
          ),
          li: (p) => <li className="pl-1" {...p} />,
          code: ({ children, ...rest }) => (
            <code
              className="rounded bg-muted px-1 py-0.5 font-mono text-[0.85em]"
              {...rest}
            >
              {children}
            </code>
          ),
          pre: (p) => (
            <pre
              className="mb-2 overflow-x-auto rounded-md border border-border bg-muted p-2 text-xs"
              {...p}
            />
          ),
          h1: (p) => <h3 className="mb-1 mt-3 text-base font-semibold" {...p} />,
          h2: (p) => <h4 className="mb-1 mt-3 text-sm font-semibold" {...p} />,
          h3: (p) => <h5 className="mb-1 mt-2 text-sm font-semibold" {...p} />,
          strong: (p) => <strong className="font-semibold text-foreground" {...p} />,
          em: (p) => <em className="italic" {...p} />,
          blockquote: (p) => (
            <blockquote
              className="mb-2 border-l-2 border-primary/60 pl-3 text-muted-foreground"
              {...p}
            />
          ),
          table: (p) => (
            <div className="mb-2 overflow-x-auto">
              <table
                className="w-full border-collapse text-xs"
                {...p}
              />
            </div>
          ),
          th: (p) => (
            <th
              className="border border-border bg-muted px-2 py-1 text-left font-medium"
              {...p}
            />
          ),
          td: (p) => (
            <td className="border border-border px-2 py-1" {...p} />
          ),
          a: (p) => (
            <a
              className="text-primary underline underline-offset-2"
              target="_blank"
              rel="noreferrer"
              {...p}
            />
          ),
          hr: () => <hr className="my-3 border-border" />,
        }}
      >
        {children}
      </ReactMarkdown>
    </div>
  );
}
