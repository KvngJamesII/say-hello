import React, { useState, useRef, useEffect, useCallback } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Link, useParams, useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import {
  ChevronLeft, Play, Square, RefreshCw, Plus, Trash2, Eye, EyeOff,
  AlertCircle, File, Folder, Upload, FolderUp, FilePlus, FolderPlus,
  MoreVertical, Download, Copy, Pencil, Undo2, Redo2, X, Send,
  Check, Lock, Hash, ChevronRight, Save, Settings as SettingsIcon,
  Terminal as TerminalIcon, FileCode, SlidersHorizontal, PanelLeftClose, PanelLeftOpen,
} from "lucide-react";
import { SiNodedotjs, SiPython } from "react-icons/si";
import { basicSetup } from "codemirror";
import { EditorView } from "@codemirror/view";
import { EditorState } from "@codemirror/state";
import { undo, redo } from "@codemirror/commands";
import { javascript } from "@codemirror/lang-javascript";
import { python } from "@codemirror/lang-python";
import { oneDark } from "@codemirror/theme-one-dark";
import {
  ResizablePanelGroup, ResizablePanel, ResizableHandle,
} from "@/components/ui/resizable";
import { useIsMobile } from "@/hooks/use-mobile";
import api from "@/lib/api";
import socket from "@/lib/socket";

// ── Tokens ───────────────────────────────────────────────────────────────────
const ACCENT = "#F97316";
const SUCCESS = "#22C55E";
const DANGER = "#EF4444";
const WARN = "#F59E0B";
const INFO = "#3B82F6";

const STATUS_DOT: Record<string, string> = {
  running: SUCCESS,
  stopped: "rgba(255,255,255,0.25)",
  crashed: DANGER,
  suspended: WARN,
  setting_up: INFO,
  not_created: "rgba(255,255,255,0.15)",
};

// ── Helpers ──────────────────────────────────────────────────────────────────
function FileIcon({ name, isDir }: { name: string; isDir: boolean }) {
  if (isDir) return <Folder size={14} className="text-[#60a5fa]" />;
  const ext = name.split(".").pop()?.toLowerCase() ?? "";
  if (ext === "py") return <SiPython size={13} className="text-[#4B8BBE]" />;
  if (["js", "mjs", "cjs"].includes(ext)) return <SiNodedotjs size={13} className="text-[#68A063]" />;
  if (ext === "json") return <File size={13} className="text-[#fbbf24]" />;
  return <File size={13} className="text-[--text-muted]" />;
}

function logColor(text: string, isStderr: boolean): string {
  if (isStderr) return "#fca5a5";
  const l = text.toLowerCase();
  if (l.includes("error")) return "#fca5a5";
  if (l.includes("warn")) return "#fcd34d";
  if (l.includes("success") || l.includes("ready") || l.includes("connected")) return "#86efac";
  if (l.includes("[info]")) return "#93c5fd";
  return "rgba(255,255,255,0.82)";
}

function getLang(filename: string) {
  const ext = filename.split(".").pop()?.toLowerCase() ?? "";
  if (ext === "py") return python();
  if (["ts", "tsx"].includes(ext)) return javascript({ typescript: true });
  if (["js", "mjs", "cjs", "jsx"].includes(ext)) return javascript();
  return [];
}

// ── Console ──────────────────────────────────────────────────────────────────
const ConsolePanel: React.FC<{ botId: string }> = ({ botId }) => {
  const [lines, setLines] = useState<Array<{ text: string; isStderr: boolean }>>([]);
  const [input, setInput] = useState("");
  const logRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!socket.connected) socket.connect();
    socket.emit("logs:subscribe", { botId });
    const onLine = (d: { line: string; isStderr: boolean }) =>
      setLines((prev) => [...prev.slice(-800), { text: d.line, isStderr: d.isStderr }]);
    socket.on("logs:line", onLine);
    return () => {
      socket.off("logs:line", onLine);
      socket.emit("logs:unsubscribe", { botId });
    };
  }, [botId]);

  useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight;
  }, [lines]);

  const send = () => {
    if (!input.trim()) return;
    socket.emit("stdin:write", { botId, data: input + "\n" });
    setLines((prev) => [...prev, { text: `› ${input}`, isStderr: false }]);
    setInput("");
    inputRef.current?.focus();
  };

  return (
    <div className="flex flex-col h-full min-h-0 bg-[#05070c]">
      <div className="flex items-center justify-between px-3 py-2 border-b border-[--border] shrink-0">
        <div className="flex items-center gap-2">
          <TerminalIcon size={12} className="text-[--text-muted]" />
          <span className="text-[10px] font-bold uppercase tracking-wider text-[--text-muted]">Console</span>
          <span className="w-1.5 h-1.5 rounded-full animate-pulse bg-[--success] ml-1" />
        </div>
        <button
          onClick={() => setLines([])}
          className="text-[10px] px-2 py-0.5 rounded text-[--text-muted] hover:text-white hover:bg-white/5 transition-colors"
        >
          Clear
        </button>
      </div>
      <div ref={logRef} className="flex-1 overflow-y-auto scrollbar-thin p-3 font-mono text-[12px] leading-relaxed min-h-0">
        {lines.length === 0 ? (
          <span className="text-[--text-muted]">Start your bot to see live output…</span>
        ) : (
          lines.map((l, i) => (
            <div key={i} style={{ color: logColor(l.text, l.isStderr), wordBreak: "break-all" }}>
              {l.text}
            </div>
          ))
        )}
      </div>
      <div className="flex items-center gap-2 px-3 py-2 border-t border-[--border] shrink-0 bg-black/30">
        <span className="text-xs font-mono shrink-0 text-[--text-muted]">›</span>
        <input
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && send()}
          placeholder="Send input to bot…"
          className="flex-1 bg-transparent outline-none text-xs font-mono text-white placeholder:text-white/20"
        />
        <button
          onClick={send}
          className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 hover:opacity-90 transition-opacity"
          style={{ background: ACCENT }}
        >
          <Send size={11} className="text-white" />
        </button>
      </div>
    </div>
  );
};

// ── Editor ───────────────────────────────────────────────────────────────────
interface OpenFile {
  path: string;
  content: string;
  dirty?: boolean;
}

const CodeEditor: React.FC<{
  file: OpenFile;
  onSave: (c: string) => void;
  onClose: () => void;
  onDirty: (d: boolean) => void;
  saving: boolean;
}> = ({ file, onSave, onClose, onDirty, saving }) => {
  const ref = useRef<HTMLDivElement>(null);
  const view = useRef<EditorView | null>(null);
  const filename = file.path.split("/").pop()!;

  useEffect(() => {
    if (!ref.current) return;
    view.current?.destroy();
    const initial = file.content;
    view.current = new EditorView({
      state: EditorState.create({
        doc: initial,
        extensions: [
          basicSetup,
          oneDark,
          getLang(filename),
          EditorView.updateListener.of((u) => {
            if (u.docChanged) onDirty(u.state.doc.toString() !== initial);
          }),
          EditorView.theme({
            "&": { height: "100%", fontSize: "13px" },
            ".cm-scroller": { fontFamily: "var(--app-font-mono)" },
            ".cm-gutters": { background: "transparent", borderRight: "1px solid var(--border)" },
          }),
        ],
      }),
      parent: ref.current,
    });
    return () => {
      view.current?.destroy();
      view.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [file.path]);

  // Cmd/Ctrl+S
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "s") {
        e.preventDefault();
        if (view.current) onSave(view.current.state.doc.toString());
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onSave]);

  return (
    <div className="flex flex-col h-full min-h-0 bg-[#0b0d12]">
      <div className="flex items-center gap-2 px-3 py-2 border-b border-[--border] shrink-0 bg-[--bg-secondary]">
        <FileIcon name={filename} isDir={false} />
        <span className="text-xs font-mono text-white flex-1 truncate">
          {filename}
          {file.dirty && <span className="ml-1.5 text-[--accent-primary]">●</span>}
        </span>
        <button onClick={() => view.current && undo(view.current)} className="w-7 h-7 rounded flex items-center justify-center text-[--text-muted] hover:text-white hover:bg-white/5">
          <Undo2 size={12} />
        </button>
        <button onClick={() => view.current && redo(view.current)} className="w-7 h-7 rounded flex items-center justify-center text-[--text-muted] hover:text-white hover:bg-white/5">
          <Redo2 size={12} />
        </button>
        <button
          onClick={() => view.current && onSave(view.current.state.doc.toString())}
          disabled={saving}
          className="flex items-center gap-1 h-7 px-3 rounded-md text-[11px] font-bold text-white disabled:opacity-50"
          style={{ background: ACCENT }}
        >
          <Save size={11} />
          {saving ? "Saving…" : "Save"}
        </button>
        <button onClick={onClose} className="w-7 h-7 rounded flex items-center justify-center text-[--text-muted] hover:text-white hover:bg-white/5">
          <X size={12} />
        </button>
      </div>
      <div ref={ref} className="flex-1 overflow-auto text-[13px] min-h-0" />
    </div>
  );
};

// ── Files ────────────────────────────────────────────────────────────────────
interface FileEntry {
  name: string;
  isDir: boolean;
  size: number;
  modified: string;
}

const FilesPanel: React.FC<{
  botId: string;
  onOpenFile: (path: string, content: string) => void;
  activePath?: string | null;
}> = ({ botId, onOpenFile, activePath }) => {
  const [path, setPath] = useState("/");
  const [files, setFiles] = useState<FileEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const [renaming, setRenaming] = useState<string | null>(null);
  const [renameVal, setRenameVal] = useState("");
  const [creating, setCreating] = useState<"file" | "dir" | null>(null);
  const [newName, setNewName] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  const folderRef = useRef<HTMLInputElement>(null);
  const { success: ok, error: err } = useToast();

  const load = useCallback(
    async (p: string) => {
      setLoading(true);
      try {
        const r = await api.get(`/bots/${botId}/files`, { params: { path: p } });
        setFiles(r.data);
      } catch {
        setFiles([]);
      }
      setLoading(false);
    },
    [botId],
  );

  useEffect(() => {
    load(path);
  }, [path, load]);

  const openFile = async (name: string) => {
    const fp = [path, name].join("/").replace(/\/+/g, "/");
    try {
      const r = await api.get(`/bots/${botId}/files/content`, { params: { path: fp } });
      onOpenFile(fp, r.data.content);
    } catch {
      err("Error", "Cannot open file");
    }
  };

  const del = async (name: string) => {
    const fp = [path, name].join("/").replace(/\/+/g, "/");
    try {
      await api.delete(`/bots/${botId}/files`, { data: { path: fp } });
      load(path);
      ok("Deleted", name);
    } catch {
      err("Error", "Cannot delete");
    }
    setOpenMenu(null);
  };

  const clone = async (name: string) => {
    const fp = [path, name].join("/").replace(/\/+/g, "/");
    try {
      const r = await api.post(`/bots/${botId}/files/clone`, { path: fp });
      load(path);
      ok("Cloned", r.data.cloneName);
    } catch {
      err("Error", "Cannot clone");
    }
    setOpenMenu(null);
  };

  const confirmRename = async () => {
    if (!renaming || !renameVal.trim() || renameVal === renaming) {
      setRenaming(null);
      return;
    }
    const from = [path, renaming].join("/").replace(/\/+/g, "/");
    const to = [path, renameVal.trim()].join("/").replace(/\/+/g, "/");
    try {
      await api.post(`/bots/${botId}/files/rename`, { from, to });
      load(path);
    } catch {
      err("Error", "Cannot rename");
    }
    setRenaming(null);
  };

  const createItem = async () => {
    if (!newName.trim() || !creating) return;
    const fp = [path, newName.trim()].join("/").replace(/\/+/g, "/");
    try {
      await api.post(`/bots/${botId}/files/create`, { path: fp, type: creating });
      load(path);
      if (creating === "file") openFile(newName.trim());
    } catch {
      err("Error", "Cannot create");
    }
    setCreating(null);
    setNewName("");
  };

  const uploadFiles = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const fs = Array.from(e.target.files ?? []);
    if (!fs.length) return;
    const form = new FormData();
    fs.forEach((f) => {
      form.append("files", f);
      form.append("relativePaths", f.name);
    });
    form.append("path", path);
    try {
      await api.post(`/bots/${botId}/files/upload`, form, { headers: { "Content-Type": "multipart/form-data" } });
      load(path);
      ok("Uploaded", `${fs.length} file(s)`);
    } catch {
      err("Error", "Upload failed");
    }
    e.target.value = "";
  };

  const uploadFolder = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const fs = Array.from(e.target.files ?? []);
    if (!fs.length) return;
    const form = new FormData();
    fs.forEach((f) => {
      form.append("files", f);
      form.append("relativePaths", (f as any).webkitRelativePath || f.name);
    });
    form.append("path", path);
    try {
      await api.post(`/bots/${botId}/files/upload`, form, { headers: { "Content-Type": "multipart/form-data" } });
      load(path);
      ok("Uploaded", `${fs.length} file(s)`);
    } catch {
      err("Error", "Upload failed");
    }
    e.target.value = "";
  };

  const parts = path.split("/").filter(Boolean);
  const fmtSize = (b: number) => (b < 1024 ? `${b}B` : b < 1048576 ? `${(b / 1024).toFixed(0)}K` : `${(b / 1048576).toFixed(1)}M`);

  return (
    <div className="flex flex-col h-full min-h-0 bg-[--bg-secondary]" onClick={() => setOpenMenu(null)}>
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-[--border] shrink-0">
        <div className="flex items-center gap-2">
          <FileCode size={12} className="text-[--text-muted]" />
          <span className="text-[10px] font-bold uppercase tracking-wider text-[--text-muted]">Explorer</span>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-1 px-2 py-1.5 border-b border-[--border] shrink-0">
        <input ref={fileRef} type="file" multiple className="hidden" onChange={uploadFiles} />
        <input ref={folderRef} type="file" multiple className="hidden" onChange={uploadFolder} {...({ webkitdirectory: "", directory: "" } as any)} />
        {[
          { icon: <FilePlus size={12} />, title: "New file", cb: () => { setCreating("file"); setNewName(""); } },
          { icon: <FolderPlus size={12} />, title: "New folder", cb: () => { setCreating("dir"); setNewName(""); } },
          { icon: <Upload size={12} />, title: "Upload files", cb: () => fileRef.current?.click() },
          { icon: <FolderUp size={12} />, title: "Upload folder", cb: () => folderRef.current?.click() },
        ].map((b, i) => (
          <button
            key={i}
            title={b.title}
            onClick={b.cb}
            className="w-7 h-7 rounded-md flex items-center justify-center text-[--text-muted] hover:text-white hover:bg-white/5 transition-colors"
          >
            {b.icon}
          </button>
        ))}
      </div>

      {/* Create form */}
      {creating && (
        <div className="flex items-center gap-2 px-3 py-2 border-b border-[--border] shrink-0">
          <input
            autoFocus
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") createItem();
              if (e.key === "Escape") setCreating(null);
            }}
            placeholder={creating === "file" ? "filename.py" : "folder-name"}
            className="flex-1 bg-transparent outline-none text-xs font-mono text-white placeholder:text-white/20"
          />
          <button onClick={createItem} className="h-6 px-2 rounded text-[10px] font-bold text-white" style={{ background: ACCENT }}>
            Create
          </button>
          <button onClick={() => setCreating(null)} className="text-xs text-[--text-muted]">
            ✕
          </button>
        </div>
      )}

      {/* Breadcrumb */}
      <div className="flex items-center gap-1 px-3 py-1.5 border-b border-[--border] shrink-0 text-[11px] font-mono overflow-x-auto scrollbar-none text-[--text-muted]">
        <button onClick={() => setPath("/")} className="hover:text-white shrink-0">/</button>
        {parts.map((p, i) => (
          <React.Fragment key={i}>
            <ChevronRight size={10} className="shrink-0" />
            <button onClick={() => setPath("/" + parts.slice(0, i + 1).join("/"))} className="hover:text-white shrink-0">
              {p}
            </button>
          </React.Fragment>
        ))}
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto scrollbar-thin min-h-0">
        {path !== "/" && (
          <button
            onClick={() => {
              const p = parts.slice(0, -1);
              setPath("/" + p.join("/"));
            }}
            className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-white/[0.03] text-left"
          >
            <Folder size={13} className="text-[--text-muted]" />
            <span className="text-xs font-mono text-[--text-muted]">..</span>
          </button>
        )}
        {loading
          ? [1, 2, 3].map((i) => <div key={i} className="h-7 mx-2 my-1 rounded animate-pulse bg-white/5" />)
          : files.length === 0
          ? <div className="py-8 text-center text-xs text-[--text-muted]">Empty folder</div>
          : files.map((f) => {
              const fullPath = [path, f.name].join("/").replace(/\/+/g, "/");
              const isActive = activePath === fullPath;
              return (
                <div
                  key={f.name}
                  className={`relative flex items-center gap-2 px-3 py-1.5 cursor-pointer group ${
                    isActive ? "bg-[--accent-soft]" : "hover:bg-white/[0.03]"
                  }`}
                >
                  {renaming === f.name ? (
                    <div className="flex-1 flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                      <input
                        autoFocus
                        value={renameVal}
                        onChange={(e) => setRenameVal(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") confirmRename();
                          if (e.key === "Escape") setRenaming(null);
                        }}
                        className="flex-1 bg-transparent border-b outline-none text-xs font-mono text-white"
                        style={{ borderColor: ACCENT }}
                      />
                      <button onClick={confirmRename} className="text-[10px] font-bold" style={{ color: ACCENT }}>OK</button>
                      <button onClick={() => setRenaming(null)} className="text-[10px] text-[--text-muted]">✕</button>
                    </div>
                  ) : (
                    <>
                      <FileIcon name={f.name} isDir={f.isDir} />
                      <span
                        className={`flex-1 text-xs font-mono truncate ${isActive ? "text-[--accent-primary] font-semibold" : "text-white"}`}
                        onClick={() => (f.isDir ? setPath(fullPath) : openFile(f.name))}
                      >
                        {f.name}
                      </span>
                      {!f.isDir && <span className="text-[10px] tabular-nums shrink-0 text-[--text-muted]">{fmtSize(f.size)}</span>}
                      <button
                        onClick={(e) => { e.stopPropagation(); setOpenMenu(openMenu === f.name ? null : f.name); }}
                        className="w-6 h-6 rounded flex items-center justify-center opacity-0 group-hover:opacity-100 shrink-0 text-[--text-muted] hover:text-white"
                      >
                        <MoreVertical size={12} />
                      </button>
                      {openMenu === f.name && (
                        <div
                          className="absolute right-2 top-7 z-20 rounded-lg overflow-hidden py-1 min-w-[140px] bg-[--bg-elevated] border border-[--border] shadow-xl"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {[
                            { icon: <Pencil size={11} />, label: "Rename", action: () => { setRenaming(f.name); setRenameVal(f.name); setOpenMenu(null); } },
                            ...(!f.isDir
                              ? [
                                  { icon: <Copy size={11} />, label: "Clone", action: () => clone(f.name) },
                                  {
                                    icon: <Download size={11} />,
                                    label: "Download",
                                    action: () => {
                                      window.open(`/api/bots/${botId}/files/download?path=${encodeURIComponent(fullPath)}`, "_blank");
                                      setOpenMenu(null);
                                    },
                                  },
                                ]
                              : []),
                            { icon: <Trash2 size={11} />, label: "Delete", action: () => del(f.name), danger: true },
                          ].map((item) => (
                            <button
                              key={item.label}
                              onClick={item.action}
                              className="w-full flex items-center gap-2 px-3 py-1.5 text-xs hover:bg-white/5 text-left"
                              style={{ color: (item as any).danger ? DANGER : "var(--text-secondary)" }}
                            >
                              {item.icon}
                              {item.label}
                            </button>
                          ))}
                        </div>
                      )}
                    </>
                  )}
                </div>
              );
            })}
      </div>
    </div>
  );
};

// ── Config Tab ───────────────────────────────────────────────────────────────
const PRESETS = ["main.py", "app.py", "index.py", "bot.py", "run.py", "index.js", "bot.js", "app.js"];

interface EnvVar { id: string; key: string; value: string; }

const ConfigTab: React.FC<{ bot: BotData }> = ({ bot }) => {
  const [startFile, setStartFile] = useState(bot.startFile ?? "");
  const [fileSaved, setFileSaved] = useState(false);
  const [fileSaving, setFileSaving] = useState(false);
  const [showDrop, setShowDrop] = useState(false);
  const [fileList, setFileList] = useState<string[]>([]);
  const [nk, setNk] = useState("");
  const [nv, setNv] = useState("");
  const [hidden, setHidden] = useState<Record<string, boolean>>({});
  const { success: ok, error: err } = useToast();
  const qc = useQueryClient();

  useEffect(() => {
    api
      .get(`/bots/${bot.id}/files`, { params: { path: "/" } })
      .then((r) => setFileList((r.data as FileEntry[]).filter((f) => !f.isDir).map((f) => f.name)))
      .catch(() => {});
  }, [bot.id]);

  const { data: vars = [], refetch } = useQuery<EnvVar[]>({
    queryKey: ["bot-env", bot.id],
    queryFn: async () => {
      const r = await api.get(`/bots/${bot.id}/env`);
      return r.data;
    },
  });

  const suggestions = startFile
    ? fileList.filter((f) => f.toLowerCase().includes(startFile.toLowerCase()) && f !== startFile)
    : [];

  const saveStartFile = async () => {
    if (!startFile.trim()) return;
    setFileSaving(true);
    try {
      await api.patch(`/bots/${bot.id}`, { startFile: startFile.trim() });
      qc.invalidateQueries({ queryKey: ["bot", bot.id] });
      setFileSaved(true);
      setTimeout(() => setFileSaved(false), 2500);
    } catch (e: any) {
      err("Failed", e.response?.data?.error ?? "Could not save");
    }
    setFileSaving(false);
  };

  const addVar = useMutation({
    mutationFn: async () => { await api.post(`/bots/${bot.id}/env`, { key: nk.trim(), value: nv }); },
    onSuccess: () => { ok("Added", nk); setNk(""); setNv(""); refetch(); },
    onError: (e: any) => err("Failed", e.response?.data?.error ?? "Error"),
  });

  const delVar = useMutation({
    mutationFn: async (vid: string) => { await api.delete(`/bots/${bot.id}/env/${vid}`); },
    onSuccess: () => { ok("Deleted", "Removed"); refetch(); },
  });

  return (
    <div className="h-full overflow-y-auto scrollbar-thin">
      <div className="max-w-3xl mx-auto p-5 lg:p-8 flex flex-col gap-6">
        {/* Startup */}
        <div className="rounded-xl bg-[--bg-secondary] border border-[--border] p-5">
          <p className="text-sm font-semibold text-white mb-1">Startup Command</p>
          <p className="text-xs text-[--text-muted] mb-4">The file that runs when you press Start.</p>

          <div className="flex flex-wrap gap-1.5 mb-3">
            {PRESETS.map((p) => (
              <button
                key={p}
                onClick={() => { setStartFile(p); setFileSaved(false); setShowDrop(false); }}
                className="flex items-center gap-1 h-7 px-2.5 rounded-md text-[11px] font-mono font-medium transition-all border"
                style={{
                  background: startFile === p ? "var(--accent-soft)" : "rgba(255,255,255,0.02)",
                  borderColor: startFile === p ? "rgba(249,115,22,0.3)" : "var(--border)",
                  color: startFile === p ? ACCENT : "var(--text-secondary)",
                }}
              >
                <FileIcon name={p} isDir={false} />
                {p}
              </button>
            ))}
          </div>

          <div className="relative">
            <input
              value={startFile}
              onChange={(e) => { setStartFile(e.target.value); setFileSaved(false); setShowDrop(true); }}
              onFocus={() => setShowDrop(true)}
              onBlur={() => setTimeout(() => setShowDrop(false), 150)}
              onKeyDown={(e) => {
                if (e.key === "Enter") { setShowDrop(false); saveStartFile(); }
                if (e.key === "Escape") setShowDrop(false);
              }}
              placeholder="e.g. main.py or index.js"
              className="w-full h-10 px-3 rounded-lg text-sm font-mono text-white outline-none bg-[--bg-primary] border transition-colors"
              style={{ borderColor: startFile && !fileSaved ? ACCENT : "var(--border)" }}
            />
            {showDrop && suggestions.length > 0 && (
              <div className="absolute z-10 w-full mt-1 rounded-lg overflow-hidden bg-[--bg-elevated] border border-[--border] shadow-xl">
                {suggestions.slice(0, 5).map((f) => (
                  <button
                    key={f}
                    onMouseDown={() => { setStartFile(f); setShowDrop(false); setFileSaved(false); }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-xs hover:bg-white/5 text-left"
                  >
                    <FileIcon name={f} isDir={false} />
                    <span className="font-mono text-white">{f}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <button
            onClick={saveStartFile}
            disabled={fileSaving || !startFile.trim()}
            className="mt-3 flex items-center gap-1.5 h-9 px-4 rounded-lg text-xs font-bold text-white disabled:opacity-40 transition-all"
            style={{ background: fileSaved ? SUCCESS : ACCENT }}
          >
            {fileSaved ? (<><Check size={12} />Saved</>) : fileSaving ? "Saving…" : (<><Save size={12} />Save</>)}
          </button>
        </div>

        {/* Env */}
        <div className="rounded-xl overflow-hidden bg-[--bg-secondary] border border-[--border]">
          <div className="px-5 py-4 border-b border-[--border]">
            <p className="text-sm font-semibold text-white">Environment Variables</p>
            <p className="text-xs text-[--text-muted] mt-0.5">
              Available as <code className="px-1 rounded font-mono bg-white/5">process.env</code> · Restart to apply
            </p>
          </div>
          {vars.map((v) => (
            <div key={v.id} className="flex items-center gap-3 px-5 py-2.5 border-b border-[--border] last:border-0">
              <span className="text-xs font-mono font-bold text-white w-32 shrink-0 truncate">{v.key}</span>
              <span className="flex-1 text-xs font-mono truncate text-[--text-secondary]">
                {hidden[v.id] ? v.value : "••••••••"}
              </span>
              <button
                onClick={() => setHidden((p) => ({ ...p, [v.id]: !p[v.id] }))}
                className="w-7 h-7 flex items-center justify-center shrink-0 text-[--text-muted] hover:text-white"
              >
                {hidden[v.id] ? <EyeOff size={12} /> : <Eye size={12} />}
              </button>
              <button onClick={() => delVar.mutate(v.id)} className="w-7 h-7 flex items-center justify-center shrink-0 text-[--danger]">
                <Trash2 size={12} />
              </button>
            </div>
          ))}
          <div className="flex gap-2 p-3">
            <input
              value={nk}
              onChange={(e) => setNk(e.target.value.toUpperCase().replace(/\s/g, "_"))}
              placeholder="KEY"
              className="w-32 h-9 px-2.5 rounded-lg text-xs font-mono font-bold text-white outline-none shrink-0 bg-[--bg-primary] border border-[--border]"
            />
            <input
              value={nv}
              onChange={(e) => setNv(e.target.value)}
              placeholder="value"
              className="flex-1 h-9 px-2.5 rounded-lg text-xs font-mono text-white outline-none min-w-0 bg-[--bg-primary] border border-[--border]"
            />
            <button
              onClick={() => addVar.mutate()}
              disabled={!nk || addVar.isPending}
              className="h-9 px-3 rounded-lg text-xs font-bold text-white shrink-0 flex items-center gap-1 disabled:opacity-40"
              style={{ background: ACCENT }}
            >
              <Plus size={11} /> Add
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// ── Settings Tab ─────────────────────────────────────────────────────────────
const SettingsTab: React.FC<{ bot: BotData }> = ({ bot }) => {
  const [name, setName] = useState(bot.name);
  const [nameSaved, setNameSaved] = useState(false);
  const [copied, setCopied] = useState(false);
  const [delInput, setDelInput] = useState("");
  const [showDel, setShowDel] = useState(false);
  const { success: ok, error: err } = useToast();
  const qc = useQueryClient();
  const [, setLocation] = useLocation();

  const isPro = (bot.plan ?? "basic") === "pro";

  const saveName = useMutation({
    mutationFn: async () => { await api.patch(`/bots/${bot.id}`, { name: name.trim() }); },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["bot", bot.id] });
      qc.invalidateQueries({ queryKey: ["bots"] });
      setNameSaved(true);
      setTimeout(() => setNameSaved(false), 2500);
      ok("Saved", "Bot renamed");
    },
    onError: (e: any) => err("Failed", e.response?.data?.error ?? "Could not save"),
  });

  const destroy = useMutation({
    mutationFn: async () => { await api.delete(`/bots/${bot.id}`); },
    onSuccess: () => { ok("Deleted", "Bot removed."); setLocation("/dashboard"); },
    onError: () => err("Failed", "Could not delete bot"),
  });

  const copyId = () => {
    navigator.clipboard.writeText(bot.id).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div className="h-full overflow-y-auto scrollbar-thin">
      <div className="max-w-3xl mx-auto p-5 lg:p-8 flex flex-col gap-5">
        <div className="rounded-xl bg-[--bg-secondary] border border-[--border] p-5">
          <p className="text-sm font-semibold text-white mb-3">Bot Name</p>
          <div className="flex gap-2">
            <input
              value={name}
              onChange={(e) => { setName(e.target.value); setNameSaved(false); }}
              onKeyDown={(e) => e.key === "Enter" && saveName.mutate()}
              className="flex-1 h-10 px-3 rounded-lg text-sm text-white outline-none bg-[--bg-primary] border border-[--border]"
            />
            <button
              onClick={() => saveName.mutate()}
              disabled={saveName.isPending || !name.trim()}
              className="flex items-center gap-1.5 h-10 px-4 rounded-lg text-xs font-bold text-white disabled:opacity-40 transition-all"
              style={{ background: nameSaved ? SUCCESS : ACCENT }}
            >
              {nameSaved ? (<><Check size={12} /> Saved</>) : (<><Save size={12} /> Save</>)}
            </button>
          </div>
        </div>

        <div className="rounded-xl bg-[--bg-secondary] border border-[--border] p-5">
          <p className="text-sm font-semibold text-white mb-1">Bot ID</p>
          <p className="text-xs text-[--text-muted] mb-3">Reference this bot in scripts or API calls.</p>
          <div className="flex items-center gap-2">
            <div className="flex-1 flex items-center gap-2 h-10 px-3 rounded-lg min-w-0 bg-[--bg-primary] border border-[--border]">
              <Hash size={12} className="shrink-0 text-[--text-muted]" />
              <span className="text-xs font-mono text-white truncate flex-1">{bot.id}</span>
            </div>
            <button
              onClick={copyId}
              className="flex items-center gap-1.5 h-10 px-3 rounded-lg text-xs font-bold shrink-0 transition-all border"
              style={{
                background: copied ? "rgba(34,197,94,0.12)" : "rgba(255,255,255,0.02)",
                color: copied ? SUCCESS : "var(--text-secondary)",
                borderColor: copied ? "rgba(34,197,94,0.2)" : "var(--border)",
              }}
            >
              {copied ? (<><Check size={12} />Copied</>) : (<><Copy size={12} />Copy</>)}
            </button>
          </div>
        </div>

        <div className="rounded-xl bg-[--bg-secondary] border border-[--border] p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-white mb-0.5">Plan</p>
              <p className="text-xs text-[--text-muted]">
                {isPro ? "768MB RAM · 1 CPU · 10GB storage" : "400MB RAM · 0.5 CPU · 3GB storage"}
              </p>
            </div>
            <span
              className="text-[11px] font-bold px-2.5 py-1 rounded-md uppercase tracking-wide border"
              style={
                isPro
                  ? { background: "var(--accent-soft)", color: ACCENT, borderColor: "rgba(249,115,22,0.25)" }
                  : { background: "rgba(255,255,255,0.04)", color: "var(--text-muted)", borderColor: "var(--border)" }
              }
            >
              {isPro ? "Pro" : "Basic"}
            </span>
          </div>
          {!isPro && (
            <Link href={`/checkout?plan=pro&botId=${bot.id}`}>
              <button className="mt-4 w-full h-9 rounded-lg text-xs font-bold text-white" style={{ background: ACCENT }}>
                Upgrade to Pro
              </button>
            </Link>
          )}
        </div>

        <div className="rounded-xl bg-[--bg-secondary] border border-[--danger]/20 p-5">
          <p className="text-sm font-semibold text-[--danger] mb-1">Danger Zone</p>
          <p className="text-xs text-[--text-secondary] mb-4">
            Permanently deletes this bot, all files, logs and variables.{" "}
            <strong className="text-white">Cannot be undone.</strong>
          </p>
          {!showDel ? (
            <button
              onClick={() => setShowDel(true)}
              className="h-9 px-4 rounded-lg text-xs font-bold border"
              style={{ background: "rgba(239,68,68,0.08)", color: DANGER, borderColor: "rgba(239,68,68,0.2)" }}
            >
              Delete Bot
            </button>
          ) : (
            <div className="flex flex-col gap-2">
              <input
                value={delInput}
                onChange={(e) => setDelInput(e.target.value)}
                placeholder={`Type "${bot.name}" to confirm`}
                className="w-full h-10 px-3 rounded-lg text-sm text-white outline-none bg-[--bg-primary] border"
                style={{ borderColor: "rgba(239,68,68,0.3)" }}
              />
              <div className="flex gap-2">
                <button
                  onClick={() => destroy.mutate()}
                  disabled={delInput !== bot.name || destroy.isPending}
                  className="h-9 px-4 rounded-lg text-xs font-black text-white disabled:opacity-40"
                  style={{ background: DANGER }}
                >
                  {destroy.isPending ? "Deleting…" : "Confirm Delete"}
                </button>
                <button onClick={() => setShowDel(false)} className="h-9 px-3 rounded-lg text-xs text-[--text-secondary]">
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// ── Page ─────────────────────────────────────────────────────────────────────
interface BotData {
  id: string;
  name: string;
  runtime: string | null;
  startFile: string | null;
  plan?: string;
  status: string;
  memoryUsedMb: number;
  memoryLimitMb: number;
  cpuPercent: number;
  uptimeSeconds: number;
  createdAt: string;
}

type Tab = "ide" | "config" | "settings";

const BotDetailPage: React.FC = () => {
  const { id } = useParams();
  const [tab, setTab] = useState<Tab>("ide");
  const [openFile, setOpenFile] = useState<OpenFile | null>(null);
  const [saving, setSaving] = useState(false);
  const [showSidebar, setShowSidebar] = useState(true);
  const [mobilePanel, setMobilePanel] = useState<"files" | "editor" | "console">("files");
  const isMobile = useIsMobile();
  const qc = useQueryClient();
  const { success: ok, error: err } = useToast();

  const { data: bot, isLoading, error } = useQuery<BotData>({
    queryKey: ["bot", id],
    queryFn: async () => {
      const r = await api.get(`/bots/${id}`);
      return r.data;
    },
    refetchInterval: 10_000,
  });

  const doAction = useMutation({
    mutationFn: async (a: string) => { await api.post(`/bots/${id}/${a}`); },
    onSuccess: (_, a) => {
      ok("Done", `Bot ${a} triggered.`);
      qc.invalidateQueries({ queryKey: ["bot", id] });
      qc.invalidateQueries({ queryKey: ["bots"] });
    },
    onError: (e: any) => err("Failed", e.response?.data?.error ?? "Action failed"),
  });

  const handleOpenFile = (path: string, content: string) => {
    setOpenFile({ path, content, dirty: false });
    if (isMobile) setMobilePanel("editor");
  };

  const saveFile = async (content: string) => {
    if (!openFile) return;
    setSaving(true);
    try {
      await api.put(`/bots/${id}/files/content`, { path: openFile.path, content });
      setOpenFile({ ...openFile, content, dirty: false });
      ok("Saved", openFile.path.split("/").pop()!);
    } catch {
      err("Error", "Cannot save");
    }
    setSaving(false);
  };

  if (isLoading)
    return (
      <DashboardLayout fullHeight>
        <div className="flex flex-col gap-3 p-4">
          {[40, 56, 240].map((h) => (
            <div key={h} className="rounded-xl animate-pulse bg-white/5" style={{ height: h }} />
          ))}
        </div>
      </DashboardLayout>
    );

  if (!bot || error)
    return (
      <DashboardLayout fullHeight>
        <div className="flex flex-col items-center py-16 text-center p-4">
          <AlertCircle size={28} className="mb-3 text-[--danger]" />
          <p className="text-base font-semibold text-white mb-1">Bot not found</p>
          <Link href="/dashboard">
            <span className="text-xs text-[--accent-primary]">← Back to dashboard</span>
          </Link>
        </div>
      </DashboardLayout>
    );

  const dot = STATUS_DOT[bot.status] ?? STATUS_DOT.not_created;
  const running = bot.status === "running";
  const canStart = ["stopped", "crashed", "not_created"].includes(bot.status);
  const isPro = (bot.plan ?? "basic") === "pro";

  return (
    <DashboardLayout fullHeight>
      <div className="flex flex-col h-full min-h-0">
        {/* Top bar */}
        <div className="flex items-center gap-2 px-3 lg:px-4 py-2.5 border-b border-[--border] shrink-0 bg-[--bg-secondary]">
          <Link href="/dashboard">
            <button className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-white/5 shrink-0 text-[--text-secondary]">
              <ChevronLeft size={16} />
            </button>
          </Link>

          {tab === "ide" && !isMobile && (
            <button
              onClick={() => setShowSidebar((v) => !v)}
              className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-white/5 text-[--text-muted]"
              title={showSidebar ? "Hide explorer" : "Show explorer"}
            >
              {showSidebar ? <PanelLeftClose size={15} /> : <PanelLeftOpen size={15} />}
            </button>
          )}

          <div
            className="w-2 h-2 rounded-full shrink-0"
            style={{ background: dot, boxShadow: running ? `0 0 8px ${SUCCESS}` : "none" }}
          />
          <span className="text-sm font-semibold text-white truncate flex-1 min-w-0">{bot.name}</span>

          <span
            className="hidden sm:inline text-[10px] font-bold px-2 py-0.5 rounded shrink-0 uppercase tracking-wide border"
            style={
              isPro
                ? { background: "var(--accent-soft)", color: ACCENT, borderColor: "rgba(249,115,22,0.2)" }
                : { background: "rgba(255,255,255,0.03)", color: "var(--text-muted)", borderColor: "var(--border)" }
            }
          >
            {isPro ? "Pro" : "Basic"}
          </span>

          <div className="flex items-center gap-1.5 shrink-0">
            {canStart && (
              <button
                onClick={() => doAction.mutate("start")}
                disabled={doAction.isPending}
                className="flex items-center gap-1 h-8 px-2.5 rounded-lg text-xs font-bold disabled:opacity-50 border"
                style={{ background: "rgba(34,197,94,0.1)", color: SUCCESS, borderColor: "rgba(34,197,94,0.2)" }}
              >
                <Play size={11} fill="currentColor" /> <span className="hidden sm:inline">Start</span>
              </button>
            )}
            {running && (
              <button
                onClick={() => doAction.mutate("stop")}
                disabled={doAction.isPending}
                className="flex items-center gap-1 h-8 px-2.5 rounded-lg text-xs font-bold disabled:opacity-50 border"
                style={{ background: "rgba(239,68,68,0.1)", color: DANGER, borderColor: "rgba(239,68,68,0.2)" }}
              >
                <Square size={11} fill="currentColor" /> <span className="hidden sm:inline">Stop</span>
              </button>
            )}
            <button
              onClick={() => doAction.mutate("restart")}
              disabled={doAction.isPending}
              className="w-8 h-8 rounded-lg flex items-center justify-center disabled:opacity-50 border border-[--border] text-[--text-secondary] hover:bg-white/5"
            >
              <RefreshCw size={12} />
            </button>
          </div>
        </div>

        {/* Tab segment */}
        <div className="flex items-center gap-1 px-3 lg:px-4 py-1.5 border-b border-[--border] shrink-0 bg-[--bg-secondary]">
          {([
            { id: "ide", label: "Workspace", icon: <FileCode size={12} /> },
            { id: "config", label: "Config", icon: <SlidersHorizontal size={12} /> },
            { id: "settings", label: "Settings", icon: <SettingsIcon size={12} /> },
          ] as const).map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className="flex items-center gap-1.5 h-7 px-3 rounded-md text-xs font-semibold transition-colors"
              style={
                tab === t.id
                  ? { background: "var(--accent-soft)", color: ACCENT }
                  : { color: "var(--text-muted)" }
              }
            >
              {t.icon}
              {t.label}
            </button>
          ))}
        </div>

        {/* Body */}
        <div className="flex-1 min-h-0">
          {tab === "ide" && (
            <>
              {isMobile ? (
                <div className="flex flex-col h-full min-h-0">
                  <div className="flex items-center gap-1 px-2 py-1.5 border-b border-[--border] shrink-0 bg-[--bg-secondary]">
                    {([
                      { id: "files", label: "Files", icon: <FileCode size={12} /> },
                      { id: "editor", label: "Editor", icon: <Pencil size={12} /> },
                      { id: "console", label: "Console", icon: <TerminalIcon size={12} /> },
                    ] as const).map((p) => (
                      <button
                        key={p.id}
                        onClick={() => setMobilePanel(p.id)}
                        className="flex items-center gap-1 h-7 px-3 rounded-md text-[11px] font-semibold flex-1 justify-center"
                        style={
                          mobilePanel === p.id
                            ? { background: "var(--accent-soft)", color: ACCENT }
                            : { color: "var(--text-muted)" }
                        }
                      >
                        {p.icon}
                        {p.label}
                      </button>
                    ))}
                  </div>
                  <div className="flex-1 min-h-0">
                    {mobilePanel === "files" && (
                      <FilesPanel botId={id!} onOpenFile={handleOpenFile} activePath={openFile?.path} />
                    )}
                    {mobilePanel === "editor" && (
                      openFile ? (
                        <CodeEditor
                          file={openFile}
                          onSave={saveFile}
                          onClose={() => { setOpenFile(null); setMobilePanel("files"); }}
                          onDirty={(d) => setOpenFile((f) => (f ? { ...f, dirty: d } : f))}
                          saving={saving}
                        />
                      ) : (
                        <div className="h-full flex items-center justify-center text-xs text-[--text-muted]">
                          Open a file from the Files tab
                        </div>
                      )
                    )}
                    {mobilePanel === "console" && <ConsolePanel botId={id!} />}
                  </div>
                </div>
              ) : (
                <ResizablePanelGroup direction="horizontal" className="h-full">
                  {showSidebar && (
                    <>
                      <ResizablePanel defaultSize={20} minSize={14} maxSize={35}>
                        <FilesPanel botId={id!} onOpenFile={handleOpenFile} activePath={openFile?.path} />
                      </ResizablePanel>
                      <ResizableHandle className="bg-[--border] hover:bg-[--accent-primary]/40 transition-colors" />
                    </>
                  )}
                  <ResizablePanel defaultSize={showSidebar ? 50 : 65} minSize={30}>
                    <ResizablePanelGroup direction="vertical">
                      <ResizablePanel defaultSize={65} minSize={20}>
                        {openFile ? (
                          <CodeEditor
                            file={openFile}
                            onSave={saveFile}
                            onClose={() => setOpenFile(null)}
                            onDirty={(d) => setOpenFile((f) => (f ? { ...f, dirty: d } : f))}
                            saving={saving}
                          />
                        ) : (
                          <div className="h-full flex flex-col items-center justify-center gap-2 text-center bg-[#0b0d12] p-6">
                            <FileCode size={32} className="text-[--text-faint]" />
                            <p className="text-sm font-semibold text-white">No file open</p>
                            <p className="text-xs text-[--text-muted] max-w-xs">
                              Select a file from the explorer or create a new one to start editing.
                            </p>
                          </div>
                        )}
                      </ResizablePanel>
                      <ResizableHandle className="bg-[--border] hover:bg-[--accent-primary]/40 transition-colors" />
                      <ResizablePanel defaultSize={35} minSize={15}>
                        <ConsolePanel botId={id!} />
                      </ResizablePanel>
                    </ResizablePanelGroup>
                  </ResizablePanel>
                </ResizablePanelGroup>
              )}
            </>
          )}

          {tab === "config" && <ConfigTab bot={bot} />}
          {tab === "settings" && <SettingsTab bot={bot} />}
        </div>
      </div>
    </DashboardLayout>
  );
};

export default BotDetailPage;
