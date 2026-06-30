// Full GFM markdown renderer (PLAN Q14). Used for the rendered README / notes.
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";

export function MarkdownView({ markdown }: { markdown: string }) {
  return (
    <div className="tsk-md">
      <Markdown remarkPlugins={[remarkGfm]}>{markdown}</Markdown>
    </div>
  );
}
