import { Brain, Search, FileText, ChevronRight, ChevronDown, RefreshCw, Tag, X, HardDrive, Calendar, Code, Eye } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { MarkdownContent } from "@/components/chat/MarkdownContent";

interface MemoryFileMeta {
  name?: string;
  description?: string;
  type?: string;
}

interface MemoryFile {
  name: string;
  lines: number;
  sizeBytes: number;
  lastModified?: number;
  meta: MemoryFileMeta;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(ts: number | undefined): string {
  if (!ts) return "";
  const d = new Date(ts);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffDays = Math.floor(diffMs / 86400000);
  if (diffDays === 0) return "today";
  if (diffDays === 1) return "yesterday";
  if (diffDays < 7) return `${diffDays}d ago`;
  return d.toLocaleDateString();
}

const TYPE_COLORS: Record<string, string> = {
  user: "bg-blue-500/20 text-blue-400",
  feedback: "bg-amber-500/20 text-amber-400",
  project: "bg-emerald-500/20 text-emerald-400",
  reference: "bg-purple-500/20 text-purple-400",
};

const TYPE_ICONS: Record<string, string> = {
  user: "👤",
  feedback: "💬",
  project: "📁",
  reference: "🔗",
};

export function MemoryPage() {
  const [files, setFiles] = useState<MemoryFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [fileContent, setFileContent] = useState<string | null>(null);
  const [contentLoading, setContentLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());
  const [viewMode, setViewMode] = useState<"rendered" | "raw">("rendered");

  const toggleGroup = useCallback((type: string) => {
    setCollapsedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(type)) next.delete(type);
      else next.add(type);
      return next;
    });
  }, []);

  const fetchFiles = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/mc-api/memory");
      const data = await res.json();
      setFiles(data.files ?? []);
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchFiles();
  }, [fetchFiles]);

  const loadFile = useCallback(async (fileName: string) => {
    setSelectedFile(fileName);
    setContentLoading(true);
    setFileContent(null);
    try {
      const res = await fetch(`/mc-api/memory/read?file=${encodeURIComponent(fileName)}`);
      const data = await res.json();
      if (data.error) {
        setFileContent(`> Error: ${data.error}`);
      } else {
        setFileContent(data.content ?? "");
      }
    } catch (e) {
      setFileContent(`> Error loading file: ${e}`);
    } finally {
      setContentLoading(false);
    }
  }, []);

  const filtered = useMemo(() => {
    if (!search) return files;
    const q = search.toLowerCase();
    return files.filter(
      (f) =>
        f.name.toLowerCase().includes(q) ||
        (f.meta.description ?? "").toLowerCase().includes(q) ||
        (f.meta.type ?? "").toLowerCase().includes(q),
    );
  }, [files, search]);

  const groupedByType = useMemo(() => {
    const groups: Record<string, MemoryFile[]> = {};
    for (const f of filtered) {
      const type = f.meta.type || "other";
      if (!groups[type]) groups[type] = [];
      groups[type].push(f);
    }
    return Object.entries(groups).sort(([a], [b]) => a.localeCompare(b));
  }, [filtered]);

  const totalSize = useMemo(() => files.reduce((sum, f) => sum + f.sizeBytes, 0), [files]);

  // Strip frontmatter for display
  const displayContent = useMemo(() => {
    if (!fileContent) return "";
    const stripped = fileContent.replace(/^---\n[\s\S]*?\n---\n*/u, "");
    return stripped;
  }, [fileContent]);

  // Extract frontmatter metadata for display
  const frontmatter = useMemo(() => {
    if (!fileContent) return null;
    const match = fileContent.match(/^---\n([\s\S]*?)\n---/u);
    if (!match) return null;
    const pairs: Array<[string, string]> = [];
    for (const line of match[1].split("\n")) {
      const idx = line.indexOf(":");
      if (idx > 0) {
        pairs.push([line.slice(0, idx).trim(), line.slice(idx + 1).trim()]);
      }
    }
    return pairs.length > 0 ? pairs : null;
  }, [fileContent]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Memory Browser</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Browse and search agent memory files
            {files.length > 0 && (
              <span className="ml-2 text-gray-400 dark:text-gray-500">
                — {files.length} files, {formatBytes(totalSize)}
              </span>
            )}
          </p>
        </div>
        <button
          type="button"
          onClick={fetchFiles}
          disabled={loading}
          className="flex items-center gap-1.5 rounded-md border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-50 dark:border-gray-600 dark:text-gray-400 dark:hover:bg-gray-700 transition-colors"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      {/* Search bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400 dark:text-gray-500" />
        <input
          type="text"
          placeholder="Search memory files by name, description, or type..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full rounded-lg border border-gray-200 bg-white py-2 pl-10 pr-10 text-sm text-gray-800 placeholder-gray-400 outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100 dark:placeholder-gray-500 dark:focus:border-blue-500"
        />
        {search && (
          <button
            type="button"
            onClick={() => setSearch("")}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {search && filtered.length !== files.length && (
        <p className="text-xs text-gray-400 dark:text-gray-500">
          Showing {filtered.length} of {files.length} files
        </p>
      )}

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400">
          {error}
        </div>
      )}

      <div className="flex gap-6">
        {/* File tree sidebar */}
        <div className="w-80 shrink-0 space-y-1">
          {loading && files.length === 0 ? (
            <div className="flex items-center justify-center py-12 text-sm text-gray-400 dark:text-gray-500">
              <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
              Loading...
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-12 text-center">
              <Brain className="h-10 w-10 text-gray-300 dark:text-gray-600" strokeWidth={1.5} />
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                {search ? "No matching memory files" : "No memory files yet"}
              </p>
              <p className="max-w-[200px] text-xs text-gray-400 dark:text-gray-500">
                {search ? "Try a different search term" : "Memory files will appear here as agents store information"}
              </p>
            </div>
          ) : (
            groupedByType.map(([type, typeFiles]) => {
              const isCollapsed = collapsedGroups.has(type);
              return (
                <div key={type}>
                  <button
                    type="button"
                    onClick={() => toggleGroup(type)}
                    className="mb-0.5 flex w-full items-center gap-1.5 rounded-md px-1 py-1 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
                  >
                    {isCollapsed ? (
                      <ChevronRight className="h-3 w-3 text-gray-400 dark:text-gray-500" />
                    ) : (
                      <ChevronDown className="h-3 w-3 text-gray-400 dark:text-gray-500" />
                    )}
                    <span className="text-sm">{TYPE_ICONS[type] ?? "📄"}</span>
                    <Tag className="h-3 w-3 text-gray-400 dark:text-gray-500" />
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">
                      {type}
                    </span>
                    <span className="text-[10px] text-gray-300 dark:text-gray-600">
                      ({typeFiles.length})
                    </span>
                  </button>
                  {!isCollapsed && typeFiles.map((file) => (
                    <button
                      key={file.name}
                      type="button"
                      onClick={() => loadFile(file.name)}
                      className={`flex w-full items-center gap-2 rounded-md px-2 py-1.5 pl-6 text-left text-sm transition-colors ${
                        selectedFile === file.name
                          ? "bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
                          : "text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800"
                      }`}
                    >
                      <FileText className="h-3.5 w-3.5 shrink-0" />
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-xs font-medium">
                          {file.meta.name || file.name.replace(/\.md$/, "")}
                        </div>
                        {file.meta.description && (
                          <div className="truncate text-[10px] text-gray-400 dark:text-gray-500">
                            {file.meta.description}
                          </div>
                        )}
                        <div className="mt-0.5 flex items-center gap-2 text-[9px] text-gray-400 dark:text-gray-500">
                          <span className="flex items-center gap-0.5">
                            <HardDrive className="h-2.5 w-2.5" />
                            {formatBytes(file.sizeBytes)}
                          </span>
                          {file.lastModified && (
                            <span className="flex items-center gap-0.5">
                              <Calendar className="h-2.5 w-2.5" />
                              {formatDate(file.lastModified)}
                            </span>
                          )}
                        </div>
                      </div>
                      {file.meta.type && (
                        <span
                          className={`shrink-0 rounded px-1 py-0.5 text-[9px] font-medium ${TYPE_COLORS[file.meta.type] || "bg-gray-500/20 text-gray-400"}`}
                        >
                          {file.meta.type}
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              );
            })
          )}
        </div>

        {/* Content panel */}
        <div className="min-w-0 flex-1 rounded-lg border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900">
          {!selectedFile ? (
            <div className="flex flex-col items-center justify-center gap-3 py-20 text-center">
              <Brain className="h-10 w-10 text-gray-300 dark:text-gray-600" />
              <p className="text-sm text-gray-400 dark:text-gray-500">
                Select a memory file to view its contents
              </p>
            </div>
          ) : contentLoading ? (
            <div className="flex items-center justify-center py-20 text-sm text-gray-400">
              <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
              Loading...
            </div>
          ) : (
            <div className="p-6">
              <div className="mb-4 flex items-center gap-2 border-b border-gray-100 pb-3 dark:border-gray-800">
                <FileText className="h-4 w-4 text-gray-400" />
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  {selectedFile}
                </span>
                {(() => {
                  const f = files.find((file) => file.name === selectedFile);
                  if (!f) return null;
                  return (
                    <span className="ml-auto flex items-center gap-3 text-[10px] text-gray-400 dark:text-gray-500">
                      <span>{f.lines} lines</span>
                      <span>{formatBytes(f.sizeBytes)}</span>
                      {f.lastModified && <span>{new Date(f.lastModified).toLocaleString()}</span>}
                    </span>
                  );
                })()}
                {/* View mode toggle */}
                <div className="ml-2 flex items-center gap-0.5 rounded-md border border-gray-200 p-0.5 dark:border-gray-700">
                  <button
                    type="button"
                    onClick={() => setViewMode("rendered")}
                    className={`flex items-center gap-1 rounded px-2 py-0.5 text-[10px] font-medium transition-colors ${
                      viewMode === "rendered"
                        ? "bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400"
                        : "text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                    }`}
                    title="Rendered markdown"
                  >
                    <Eye className="h-3 w-3" />
                    Rendered
                  </button>
                  <button
                    type="button"
                    onClick={() => setViewMode("raw")}
                    className={`flex items-center gap-1 rounded px-2 py-0.5 text-[10px] font-medium transition-colors ${
                      viewMode === "raw"
                        ? "bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400"
                        : "text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                    }`}
                    title="Raw source"
                  >
                    <Code className="h-3 w-3" />
                    Raw
                  </button>
                </div>
              </div>

              {/* Frontmatter metadata badges */}
              {frontmatter && viewMode === "rendered" && (
                <div className="mb-4 flex flex-wrap items-center gap-2">
                  {frontmatter.map(([key, value]) => (
                    <span
                      key={key}
                      className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2.5 py-0.5 text-[10px] text-gray-600 dark:bg-gray-800 dark:text-gray-400"
                    >
                      <span className="font-semibold">{key}:</span> {value}
                    </span>
                  ))}
                </div>
              )}

              {viewMode === "rendered" ? (
                <MarkdownContent content={displayContent} />
              ) : (
                <pre className="overflow-x-auto whitespace-pre-wrap rounded-lg bg-gray-950 p-4 text-xs leading-6 text-gray-300">
                  <code>{fileContent}</code>
                </pre>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
