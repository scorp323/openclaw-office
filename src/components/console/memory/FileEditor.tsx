import {
  Bold,
  Code,
  Heading,
  Italic,
  Link,
  Loader2,
  Save,
  X,
} from "lucide-react";
import { useCallback, useRef, useState } from "react";
import { toastError, toastSuccess } from "@/store/toast-store";

interface FileEditorProps {
  fileName: string;
  initialContent: string;
  sizeBytes: number;
  onSave: (newContent: string) => void;
  onCancel: () => void;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

const TOOLBAR_ACTIONS = [
  { icon: Bold, label: "Bold", syntax: "**", wrap: true },
  { icon: Italic, label: "Italic", syntax: "_", wrap: true },
  { icon: Heading, label: "Heading", syntax: "## ", wrap: false },
  { icon: Code, label: "Code", syntax: "`", wrap: true },
  { icon: Link, label: "Link", syntax: "[text](url)", wrap: false, placeholder: true },
] as const;

export function FileEditor({ fileName, initialContent, sizeBytes, onSave, onCancel }: FileEditorProps) {
  const [content, setContent] = useState(initialContent);
  const [saving, setSaving] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const isLarge = sizeBytes > 10 * 1024;

  const handleSave = useCallback(async () => {
    setSaving(true);
    try {
      const res = await fetch("/mc-api/memory/write", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ file: fileName, content }),
      });
      if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(text || `HTTP ${res.status}`);
      }
      toastSuccess("Saved", `${fileName} updated`);
      onSave(content);
    } catch (err) {
      toastError("Save Failed", err instanceof Error ? err.message : String(err));
    } finally {
      setSaving(false);
    }
  }, [fileName, content, onSave]);

  const insertSyntax = useCallback(
    (syntax: string, wrap: boolean, placeholder?: boolean) => {
      const ta = textareaRef.current;
      if (!ta) return;

      const start = ta.selectionStart;
      const end = ta.selectionEnd;
      const selected = content.slice(start, end);

      let inserted: string;
      let cursorOffset: number;

      if (placeholder) {
        // e.g. "[text](url)" — insert as-is
        inserted = syntax;
        cursorOffset = start + syntax.length;
      } else if (wrap) {
        // e.g. **selected** or `selected`
        inserted = `${syntax}${selected || "text"}${syntax}`;
        cursorOffset = start + syntax.length + (selected.length || 4);
      } else {
        // e.g. "## " — prepend on the line
        inserted = syntax + (selected || "");
        cursorOffset = start + syntax.length + (selected.length || 0);
      }

      const newContent = content.slice(0, start) + inserted + content.slice(end);
      setContent(newContent);

      // Restore focus and cursor after state update
      requestAnimationFrame(() => {
        ta.focus();
        ta.setSelectionRange(cursorOffset, cursorOffset);
      });
    },
    [content],
  );

  return (
    <div className="flex h-full flex-col">
      {/* Toolbar */}
      <div className="mb-2 flex items-center gap-1 border-b border-gray-200 pb-2 dark:border-gray-700">
        {TOOLBAR_ACTIONS.map((action) => (
          <button
            key={action.label}
            type="button"
            onClick={() => insertSyntax(action.syntax, action.wrap, "placeholder" in action ? action.placeholder : false)}
            title={action.label}
            className="rounded p-1.5 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-gray-200"
          >
            <action.icon className="h-4 w-4" />
          </button>
        ))}
        <div className="ml-auto flex items-center gap-2">
          {isLarge && (
            <span className="text-[10px] text-amber-500 dark:text-amber-400">
              ⚠ Large file ({formatBytes(sizeBytes)})
            </span>
          )}
          <span className="text-[10px] text-gray-400 dark:text-gray-500">
            {content.length} chars
          </span>
        </div>
      </div>

      {/* Textarea */}
      <textarea
        ref={textareaRef}
        value={content}
        onChange={(e) => setContent(e.target.value)}
        className="min-h-[300px] flex-1 resize-y rounded-lg border border-gray-200 bg-white px-4 py-3 font-mono text-sm leading-relaxed text-gray-800 outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200"
        spellCheck={false}
      />

      {/* Actions */}
      <div className="mt-3 flex justify-end gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="inline-flex items-center gap-1.5 rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700 transition-colors"
        >
          <X className="h-3.5 w-3.5" />
          Cancel
        </button>
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="inline-flex items-center gap-1.5 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:opacity-50"
        >
          {saving ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Save className="h-3.5 w-3.5" />
          )}
          Save
        </button>
      </div>
    </div>
  );
}
