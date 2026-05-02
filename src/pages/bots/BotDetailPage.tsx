import React, { useState, useRef, useEffect, useCallback } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Link, useParams, useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import {
  ChevronLeft, Play, Square, RefreshCw, Plus, Trash2, Eye, EyeOff,
  AlertCircle, File, Folder, Upload, FolderUp, FilePlus, FolderPlus,
  MoreVertical, Download, Copy, Pencil, Undo2, Redo2, X, Send,
  Check, Lock, Hash, ChevronRight, Save, Bell,
} from "lucide-react";
import { SiNodedotjs, SiPython } from "react-icons/si";
import { basicSetup } from "codemirror";
import { EditorView } from "@codemirror/view";
import { EditorState } from "@codemirror/state";
import { undo, redo } from "@codemirror/commands";
import { javascript } from "@codemirror/lang-javascript";
import { python } from "@codemirror/lang-python";
import { oneDark } from "@codemirror/theme-one-dark";
import api from "@/lib/api";
import socket from "@/lib/socket";

// ── Design tokens ────────────────────────────────────────────────────────────
const B   = "rgba(255,255,255,0.08)";
const S   = "rgba(255,255,255,0.04)";
const DIM = "rgba(255,255,255,0.5)";
const MUT = "rgba(255,255,255,0.25)";
const BL  = "#3b82f6";
const GR  = "#22c55e";

const STATUS_DOT: Record<string, string> = {
  running:     GR,
  stopped:     MUT,
  crashed:     "#ef4444",
  suspended:   "#f59e0b",
  setting_up:  BL,
  not_created: "rgba(255,255,255,0.12)",
};

// ── Helpers ──────────────────────────────────────────────────────────────────
function FileIcon({ name, isDir }: { name: string; isDir: boolean }) {
  if (isDir) return <Folder size={13} style={{ color: "#60a5fa" }} />;
  const ext = name.split(".").pop()?.toLowerCase() ?? "";
  if (ext === "py")  return <SiPython    size={12} style={{ color: "#4B8BBE" }} />;
  if (["js","mjs","cjs"].includes(ext)) return <SiNodedotjs size={12} style={{ color: "#68A063" }} />;
  if (ext === "json") return <File size={12} style={{ color: "#fbbf24" }} />;
  return <File size={12} style={{ color: MUT }} />;
}

function logColor(text: string, isStderr: boolean): string {
  if (isStderr) return "#f87171";
  const l = text.toLowerCase();
  if (l.includes("error")) return "#f87171";
  if (l.includes("warn"))  return "#fbbf24";
  if (l.includes("success") || l.includes("ready") || l.includes("connected")) return "#4ade80";
  if (l.includes("[info]")) return "#60a5fa";
  return "rgba(255,255,255,0.78)";
}

function getLang(filename: string) {
  const ext = filename.split(".").pop()?.toLowerCase() ?? "";
  if (ext === "py") return python();
  if (["ts","tsx"].includes(ext)) return javascript({ typescript: true });
  if (["js","mjs","cjs","jsx"].includes(ext)) return javascript();
  return [];
}

// ── Console Tab ──────────────────────────────────────────────────────────────
const ConsoleTab: React.FC<{ botId: string }> = ({ botId }) => {
  const [lines, setLines] = useState<Array<{ text: string; isStderr: boolean }>>([]);
  const [input, setInput] = useState("");
  const logRef   = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!socket.connected) socket.connect();
    socket.emit("logs:subscribe", { botId });
    const onLine = (d: { line: string; isStderr: boolean }) =>
      setLines(prev => [...prev.slice(-800), { text: d.line, isStderr: d.isStderr }]);
    socket.on("logs:line", onLine);
    return () => { socket.off("logs:line", onLine); socket.emit("logs:unsubscribe", { botId }); };
  }, [botId]);

  useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight;
  }, [lines]);

  const send = () => {
    if (!input.trim()) return;
    socket.emit("stdin:write", { botId, data: input + "\n" });
    setLines(prev => [...prev, { text: `› ${input}`, isStderr: false }]);
    setInput(""); inputRef.current?.focus();
  };

  return (
    <div className="flex flex-col h-full" style={{ background: "#05070c" }}>
      <div className="flex items-center justify-between px-4 py-2 border-b shrink-0" style={{ borderColor: B }}>
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: GR }} />
          <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: MUT }}>Live Output</span>
        </div>
        <button onClick={() => setLines([])} className="text-[10px] px-2 py-0.5 rounded" style={{ color: MUT, background: S }}>Clear</button>
      </div>
      <div ref={logRef} className="flex-1 overflow-y-auto p-4 font-mono text-[12px] leading-relaxed min-h-0">
        {lines.length === 0
          ? <span style={{ color: MUT }}>Start your bot to see live output…</span>
          : lines.map((l, i) => (
              <div key={i} style={{ color: logColor(l.text, l.isStderr), wordBreak: "break-all" }}>{l.text}</div>
            ))
        }
      </div>
      <div className="flex items-center gap-2 px-3 py-2.5 border-t shrink-0" style={{ borderColor: B }}>
        <span className="text-xs font-mono shrink-0" style={{ color: MUT }}>›</span>
        <input ref={inputRef} value={input} onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === "Enter" && send()}
          placeholder="Send input to bot…"
          className="flex-1 bg-transparent outline-none text-xs font-mono text-white placeholder:text-white/20" />
        <button onClick={send} className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0" style={{ background: BL }}>
          <Send size={11} className="text-white" />
        </button>
      </div>
    </div>
  );
};

// ── Code Editor ───────────────────────────────────────────────────────────────
const CodeEditor: React.FC<{ filename: string; initialContent: string; onSave: (c: string) => void; onClose: () => void; saving: boolean }> = ({ filename, initialContent, onSave, onClose, saving }) => {
  const ref  = useRef<HTMLDivElement>(null);
  const view = useRef<EditorView | null>(null);

  useEffect(() => {
    if (!ref.current) return;
    view.current?.destroy();
    view.current = new EditorView({
      state: EditorState.create({ doc: initialContent, extensions: [basicSetup, oneDark, getLang(filename)] }),
      parent: ref.current,
    });
    return () => { view.current?.destroy(); view.current = null; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filename]);

  return (
    <div className="flex flex-col h-full border-t" style={{ borderColor: B }}>
      <div className="flex items-center gap-2 px-3 py-2 border-b shrink-0" style={{ borderColor: B, background: "#08090d" }}>
        <FileIcon name={filename} isDir={false} />
        <span className="text-xs font-mono text-white flex-1 truncate">{filename}</span>
        <button onClick={() => view.current && undo(view.current)} className="w-6 h-6 rounded flex items-center justify-center hover:bg-white/10" style={{ color: DIM }}><Undo2 size={11}/></button>
        <button onClick={() => view.current && redo(view.current)} className="w-6 h-6 rounded flex items-center justify-center hover:bg-white/10" style={{ color: DIM }}><Redo2 size={11}/></button>
        <button onClick={() => view.current && onSave(view.current.state.doc.toString())} disabled={saving}
          className="flex items-center gap-1 h-6 px-2.5 rounded text-[11px] font-bold text-white disabled:opacity-50"
          style={{ background: BL }}>
          <Save size={10}/>{saving ? "…" : "Save"}
        </button>
        <button onClick={onClose} className="w-6 h-6 rounded flex items-center justify-center hover:bg-white/10" style={{ color: MUT }}><X size={11}/></button>
      </div>
      <div ref={ref} className="flex-1 overflow-auto text-[13px] min-h-0" />
    </div>
  );
};

// ── Files Tab ─────────────────────────────────────────────────────────────────
interface FileEntry { name: string; isDir: boolean; size: number; modified: string; }

const FilesTab: React.FC<{ botId: string }> = ({ botId }) => {
  const [path, setPath]         = useState("/");
  const [files, setFiles]       = useState<FileEntry[]>([]);
  const [loading, setLoading]   = useState(false);
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const [renaming, setRenaming] = useState<string | null>(null);
  const [renameVal, setRenameVal] = useState("");
  const [creating, setCreating] = useState<"file"|"dir"|null>(null);
  const [newName, setNewName]   = useState("");
  const [editing, setEditing]   = useState<{ path: string; content: string } | null>(null);
  const [saving, setSaving]     = useState(false);
  const fileRef   = useRef<HTMLInputElement>(null);
  const folderRef = useRef<HTMLInputElement>(null);
  const { success: ok, error: err } = useToast();

  const load = useCallback(async (p: string) => {
    setLoading(true);
    try { const r = await api.get(`/bots/${botId}/files`, { params: { path: p } }); setFiles(r.data); }
    catch { setFiles([]); }
    setLoading(false);
  }, [botId]);

  useEffect(() => { load(path); }, [path, load]);

  const openFile = async (name: string) => {
    const fp = [path, name].join("/").replace(/\/+/g, "/");
    try {
      const r = await api.get(`/bots/${botId}/files/content`, { params: { path: fp } });
      setEditing({ path: fp, content: r.data.content });
    } catch { err("Error", "Cannot open file"); }
  };

  const saveFile = async (content: string) => {
    if (!editing) return;
    setSaving(true);
    try { await api.put(`/bots/${botId}/files/content`, { path: editing.path, content }); ok("Saved", editing.path.split("/").pop()!); }
    catch { err("Error", "Cannot save"); }
    setSaving(false);
  };

  const del = async (name: string) => {
    const fp = [path, name].join("/").replace(/\/+/g, "/");
    try { await api.delete(`/bots/${botId}/files`, { data: { path: fp } }); if (editing?.path === fp) setEditing(null); load(path); ok("Deleted", name); }
    catch { err("Error", "Cannot delete"); }
    setOpenMenu(null);
  };

  const clone = async (name: string) => {
    const fp = [path, name].join("/").replace(/\/+/g, "/");
    try { const r = await api.post(`/bots/${botId}/files/clone`, { path: fp }); load(path); ok("Cloned", r.data.cloneName); }
    catch { err("Error", "Cannot clone"); }
    setOpenMenu(null);
  };

  const confirmRename = async () => {
    if (!renaming || !renameVal.trim() || renameVal === renaming) { setRenaming(null); return; }
    const from = [path, renaming].join("/").replace(/\/+/g, "/");
    const to   = [path, renameVal.trim()].join("/").replace(/\/+/g, "/");
    try { await api.post(`/bots/${botId}/files/rename`, { from, to }); if (editing?.path === from) setEditing(null); load(path); }
    catch { err("Error", "Cannot rename"); }
    setRenaming(null);
  };

  const createItem = async () => {
    if (!newName.trim() || !creating) return;
    const fp = [path, newName.trim()].join("/").replace(/\/+/g, "/");
    try { await api.post(`/bots/${botId}/files/create`, { path: fp, type: creating }); load(path); if (creating === "file") openFile(newName.trim()); }
    catch { err("Error", "Cannot create"); }
    setCreating(null); setNewName("");
  };

  const uploadFiles = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const fs = Array.from(e.target.files ?? []);
    if (!fs.length) return;
    const form = new FormData();
    fs.forEach(f => { form.append("files", f); form.append("relativePaths", f.name); });
    form.append("path", path);
    try { await api.post(`/bots/${botId}/files/upload`, form, { headers: { "Content-Type": "multipart/form-data" } }); load(path); ok("Uploaded", `${fs.length} file(s)`); }
    catch { err("Error", "Upload failed"); }
    e.target.value = "";
  };

  const uploadFolder = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const fs = Array.from(e.target.files ?? []);
    if (!fs.length) return;
    const form = new FormData();
    fs.forEach(f => { form.append("files", f); form.append("relativePaths", (f as any).webkitRelativePath || f.name); });
    form.append("path", path);
    try { await api.post(`/bots/${botId}/files/upload`, form, { headers: { "Content-Type": "multipart/form-data" } }); load(path); ok("Uploaded", `${fs.length} file(s)`); }
    catch { err("Error", "Upload failed"); }
    e.target.value = "";
  };

  const parts = path.split("/").filter(Boolean);
  const fmtSize = (b: number) => b < 1024 ? `${b}B` : b < 1048576 ? `${(b/1024).toFixed(0)}K` : `${(b/1048576).toFixed(1)}M`;

  if (editing) {
    return (
      <CodeEditor
        filename={editing.path.split("/").pop()!}
        initialContent={editing.content}
        onSave={saveFile}
        onClose={() => setEditing(null)}
        saving={saving}
      />
    );
  }

  return (
    <div className="flex flex-col h-full min-h-0" onClick={() => setOpenMenu(null)}>
      {/* Toolbar */}
      <div className="flex items-center gap-1.5 px-3 py-2.5 border-b shrink-0 flex-wrap" style={{ borderColor: B }}>
        <input ref={fileRef}   type="file" multiple className="hidden" onChange={uploadFiles} />
        <input ref={folderRef} type="file" multiple className="hidden" onChange={uploadFolder} {...{ webkitdirectory:"", directory:"" } as any} />
        {[
          { icon:<Upload size={11}/>, label:"Upload", cb:() => fileRef.current?.click() },
          { icon:<FolderUp size={11}/>, label:"Folder", cb:() => folderRef.current?.click() },
          { icon:<FilePlus size={11}/>, label:"File", cb:() => { setCreating("file"); setNewName(""); } },
          { icon:<FolderPlus size={11}/>, label:"Dir", cb:() => { setCreating("dir"); setNewName(""); } },
        ].map(b => (
          <button key={b.label} onClick={b.cb}
            className="flex items-center gap-1 h-7 px-2.5 rounded-lg text-[11px] font-semibold hover:bg-white/5"
            style={{ background: S, border: `1px solid ${B}`, color: DIM }}>
            {b.icon}{b.label}
          </button>
        ))}
      </div>

      {/* New item form */}
      {creating && (
        <div className="flex items-center gap-2 px-3 py-2 border-b shrink-0" style={{ borderColor: B }}>
          <input autoFocus value={newName} onChange={e => setNewName(e.target.value)}
            onKeyDown={e => { if(e.key==="Enter") createItem(); if(e.key==="Escape") setCreating(null); }}
            placeholder={creating === "file" ? "filename.py" : "folder-name"}
            className="flex-1 bg-transparent outline-none text-sm font-mono text-white" />
          <button onClick={createItem} className="h-6 px-2.5 rounded text-[11px] font-bold text-white" style={{ background: BL }}>Create</button>
          <button onClick={() => setCreating(null)} className="text-[11px]" style={{ color: MUT }}>✕</button>
        </div>
      )}

      {/* Breadcrumb */}
      <div className="flex items-center gap-1 px-3 py-1.5 border-b shrink-0 text-[11px] font-mono overflow-x-auto scrollbar-none" style={{ borderColor: B, color: MUT }}>
        <button onClick={() => setPath("/")} className="hover:text-white shrink-0">/</button>
        {parts.map((p, i) => (
          <React.Fragment key={i}>
            <ChevronRight size={10} className="shrink-0" />
            <button onClick={() => setPath("/" + parts.slice(0,i+1).join("/"))} className="hover:text-white shrink-0">{p}</button>
          </React.Fragment>
        ))}
      </div>

      {/* File list */}
      <div className="flex-1 overflow-y-auto min-h-0">
        {path !== "/" && (
          <button onClick={() => { const p = parts.slice(0,-1); setPath("/" + p.join("/")); }}
            className="w-full flex items-center gap-2.5 px-4 py-2.5 hover:bg-white/[0.02] border-b text-left" style={{ borderColor: B }}>
            <Folder size={13} style={{ color: MUT }} />
            <span className="text-xs font-mono" style={{ color: MUT }}>..</span>
          </button>
        )}
        {loading
          ? [1,2,3].map(i => <div key={i} className="h-10 animate-pulse border-b" style={{ background: S, borderColor: B }} />)
          : files.length === 0
            ? <div className="py-10 text-center text-xs" style={{ color: MUT }}>Empty — upload or create files</div>
            : files.map(f => (
              <div key={f.name} className="relative flex items-center gap-2.5 px-4 py-2.5 border-b hover:bg-white/[0.02] cursor-pointer group" style={{ borderColor: B }}>
                {renaming === f.name ? (
                  <div className="flex-1 flex items-center gap-2" onClick={e => e.stopPropagation()}>
                    <input autoFocus value={renameVal} onChange={e => setRenameVal(e.target.value)}
                      onKeyDown={e => { if(e.key==="Enter") confirmRename(); if(e.key==="Escape") setRenaming(null); }}
                      className="flex-1 bg-transparent border-b outline-none text-sm font-mono text-white" style={{ borderColor: BL }} />
                    <button onClick={confirmRename} className="text-[11px] font-bold" style={{ color: BL }}>OK</button>
                    <button onClick={() => setRenaming(null)} className="text-[11px]" style={{ color: MUT }}>✕</button>
                  </div>
                ) : (
                  <>
                    <FileIcon name={f.name} isDir={f.isDir} />
                    <span className="flex-1 text-sm font-mono truncate text-white"
                      onClick={() => f.isDir ? setPath([path,f.name].join("/").replace(/\/+/g,"/")) : openFile(f.name)}>
                      {f.name}
                    </span>
                    {!f.isDir && <span className="text-[10px] tabular-nums shrink-0" style={{ color: MUT }}>{fmtSize(f.size)}</span>}
                    <button onClick={e => { e.stopPropagation(); setOpenMenu(openMenu===f.name?null:f.name); }}
                      className="w-6 h-6 rounded flex items-center justify-center opacity-0 group-hover:opacity-100 shrink-0" style={{ color: MUT }}>
                      <MoreVertical size={12}/>
                    </button>
                    {openMenu === f.name && (
                      <div className="absolute right-3 top-8 z-20 rounded-xl overflow-hidden py-1 min-w-[140px]"
                        style={{ background:"#111520", border:`1px solid ${B}`, boxShadow:"0 8px 32px rgba(0,0,0,0.6)" }}
                        onClick={e => e.stopPropagation()}>
                        {[
                          { icon:<Pencil size={10}/>,   label:"Rename",   action:() => { setRenaming(f.name); setRenameVal(f.name); setOpenMenu(null); } },
                          ...(!f.isDir ? [
                            { icon:<Copy size={10}/>,     label:"Clone",    action:() => clone(f.name) },
                            { icon:<Download size={10}/>, label:"Download", action:() => { window.open(`/api/bots/${botId}/files/download?path=${encodeURIComponent([path,f.name].join("/").replace(/\/+/g,"/"))}`,"_blank"); setOpenMenu(null); } },
                          ] : []),
                          { icon:<Trash2 size={10}/>,   label:"Delete",   action:() => del(f.name), danger:true },
                        ].map(item => (
                          <button key={item.label} onClick={item.action}
                            className="w-full flex items-center gap-2.5 px-3 py-2 text-xs hover:bg-white/5"
                            style={{ color: (item as any).danger?"#ef4444":DIM }}>
                            {item.icon}{item.label}
                          </button>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </div>
            ))
        }
      </div>
    </div>
  );
};

// ── Config Tab (startup command + env vars) ───────────────────────────────────
const PRESETS = ["main.py","app.py","index.py","bot.py","run.py","index.js","bot.js","app.js"];

interface EnvVar { id: string; key: string; value: string; }

const ConfigTab: React.FC<{ bot: BotData }> = ({ bot }) => {
  const [startFile, setStartFile] = useState(bot.startFile ?? "");
  const [fileSaved, setFileSaved] = useState(false);
  const [fileSaving, setFileSaving] = useState(false);
  const [showDrop, setShowDrop]   = useState(false);
  const [fileList, setFileList]   = useState<string[]>([]);
  const [nk, setNk] = useState(""); const [nv, setNv] = useState("");
  const [hidden, setHidden]       = useState<Record<string,boolean>>({});
  const { success: ok, error: err } = useToast();
  const qc = useQueryClient();

  useEffect(() => {
    api.get(`/bots/${bot.id}/files`, { params: { path: "/" } })
      .then(r => setFileList((r.data as FileEntry[]).filter(f => !f.isDir).map(f => f.name)))
      .catch(() => {});
  }, [bot.id]);

  const { data: vars = [], refetch } = useQuery<EnvVar[]>({
    queryKey: ["bot-env", bot.id],
    queryFn: async () => { const r = await api.get(`/bots/${bot.id}/env`); return r.data; },
  });

  const suggestions = startFile ? fileList.filter(f => f.toLowerCase().includes(startFile.toLowerCase()) && f !== startFile) : [];

  const saveStartFile = async () => {
    if (!startFile.trim()) return;
    setFileSaving(true);
    try {
      await api.patch(`/bots/${bot.id}`, { startFile: startFile.trim() });
      qc.invalidateQueries({ queryKey: ["bot", bot.id] });
      setFileSaved(true); setTimeout(() => setFileSaved(false), 2500);
    } catch (e: any) { err("Failed", e.response?.data?.error ?? "Could not save"); }
    setFileSaving(false);
  };

  const addVar = useMutation({
    mutationFn: async () => { await api.post(`/bots/${bot.id}/env`, { key: nk.trim(), value: nv }); },
    onSuccess: () => { ok("Added", nk); setNk(""); setNv(""); refetch(); },
    onError: (e:any) => err("Failed", e.response?.data?.error ?? "Error"),
  });

  const delVar = useMutation({
    mutationFn: async (vid:string) => { await api.delete(`/bots/${bot.id}/env/${vid}`); },
    onSuccess: () => { ok("Deleted","Removed"); refetch(); },
  });

  return (
    <div className="flex-1 overflow-y-auto min-h-0 p-4 flex flex-col gap-5">
      {/* Startup command */}
      <div className="rounded-xl p-4" style={{ background: S, border: `1px solid ${B}` }}>
        <p className="text-xs font-bold text-white mb-0.5">Startup Command</p>
        <p className="text-xs mb-3" style={{ color: MUT }}>The file that runs when you press Start.</p>

        {/* Quick picks */}
        <div className="flex flex-wrap gap-1.5 mb-3">
          {PRESETS.map(p => (
            <button key={p} onClick={() => { setStartFile(p); setFileSaved(false); setShowDrop(false); }}
              className="flex items-center gap-1 h-6 px-2 rounded-lg text-[11px] font-mono font-semibold transition-all"
              style={{
                background: startFile===p ? "rgba(59,130,246,0.15)" : S,
                border: `1px solid ${startFile===p ? "rgba(59,130,246,0.3)" : B}`,
                color: startFile===p ? BL : DIM,
              }}>
              <FileIcon name={p} isDir={false}/>{p}
            </button>
          ))}
        </div>

        {/* Input with autocomplete */}
        <div className="relative">
          <input
            value={startFile}
            onChange={e => { setStartFile(e.target.value); setFileSaved(false); setShowDrop(true); }}
            onFocus={() => setShowDrop(true)}
            onBlur={() => setTimeout(() => setShowDrop(false), 150)}
            onKeyDown={e => { if(e.key==="Enter"){ setShowDrop(false); saveStartFile(); } if(e.key==="Escape") setShowDrop(false); }}
            placeholder="e.g. main.py or index.js"
            className="w-full h-9 px-3 rounded-lg text-sm font-mono text-white outline-none"
            style={{ background: "var(--bg-primary)", border: `1.5px solid ${startFile && !fileSaved ? BL : B}` }}
          />
          {showDrop && suggestions.length > 0 && (
            <div className="absolute z-10 w-full mt-1 rounded-lg overflow-hidden"
              style={{ background:"#111520", border:`1px solid ${B}`, boxShadow:"0 8px 24px rgba(0,0,0,0.6)" }}>
              {suggestions.slice(0,5).map(f => (
                <button key={f} onMouseDown={() => { setStartFile(f); setShowDrop(false); setFileSaved(false); }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-xs hover:bg-white/5 text-left">
                  <FileIcon name={f} isDir={false}/><span className="font-mono text-white">{f}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        <button onClick={saveStartFile} disabled={fileSaving || !startFile.trim()}
          className="mt-3 flex items-center gap-1.5 h-8 px-4 rounded-lg text-xs font-bold text-white disabled:opacity-40 transition-all"
          style={{ background: fileSaved ? GR : BL }}>
          {fileSaved ? <><Check size={12}/>Saved</> : fileSaving ? "Saving…" : <><Save size={12}/>Save</>}
        </button>
      </div>

      {/* Environment Variables */}
      <div className="rounded-xl overflow-hidden" style={{ border: `1px solid ${B}` }}>
        <div className="px-4 py-3 border-b" style={{ borderColor: B, background: S }}>
          <p className="text-xs font-bold text-white">Environment Variables</p>
          <p className="text-xs" style={{ color: MUT }}>Available as <code className="px-1 rounded font-mono" style={{ background:"rgba(255,255,255,0.08)" }}>process.env</code> · Restart to apply</p>
        </div>
        {vars.map(v => (
          <div key={v.id} className="flex items-center gap-3 px-4 py-2.5 border-b" style={{ borderColor: B }}>
            <span className="text-xs font-mono font-bold text-white w-32 shrink-0 truncate">{v.key}</span>
            <span className="flex-1 text-xs font-mono truncate" style={{ color: DIM }}>{hidden[v.id] ? v.value : "••••••••"}</span>
            <button onClick={() => setHidden(p => ({...p,[v.id]:!p[v.id]}))} className="w-6 h-6 flex items-center justify-center shrink-0" style={{ color: MUT }}>
              {hidden[v.id] ? <EyeOff size={11}/> : <Eye size={11}/>}
            </button>
            <button onClick={() => delVar.mutate(v.id)} className="w-6 h-6 flex items-center justify-center shrink-0" style={{ color:"#ef4444" }}><Trash2 size={11}/></button>
          </div>
        ))}
        <div className="flex gap-2 p-3">
          <input value={nk} onChange={e => setNk(e.target.value.toUpperCase().replace(/\s/g,"_"))} placeholder="KEY"
            className="w-28 h-8 px-2.5 rounded-lg text-xs font-mono font-bold text-white outline-none shrink-0"
            style={{ background:"var(--bg-primary)", border:`1px solid ${B}` }}/>
          <input value={nv} onChange={e => setNv(e.target.value)} placeholder="value"
            className="flex-1 h-8 px-2.5 rounded-lg text-xs font-mono text-white outline-none min-w-0"
            style={{ background:"var(--bg-primary)", border:`1px solid ${B}` }}/>
          <button onClick={() => addVar.mutate()} disabled={!nk||addVar.isPending}
            className="h-8 px-3 rounded-lg text-xs font-bold text-white shrink-0 flex items-center gap-1 disabled:opacity-40"
            style={{ background: BL }}>
            <Plus size={11}/> Add
          </button>
        </div>
      </div>
    </div>
  );
};

// ── Settings Tab ──────────────────────────────────────────────────────────────
const SettingsTab: React.FC<{ bot: BotData }> = ({ bot }) => {
  const [name, setName]       = useState(bot.name);
  const [nameSaved, setNameSaved] = useState(false);
  const [copied, setCopied]   = useState(false);
  const [delInput, setDelInput] = useState("");
  const [showDel, setShowDel] = useState(false);
  const { success: ok, error: err } = useToast();
  const qc = useQueryClient();
  const [, setLocation] = useLocation();

  const isPro = (bot.plan ?? "basic") === "pro";

  const saveName = useMutation({
    mutationFn: async () => { await api.patch(`/bots/${bot.id}`, { name: name.trim() }); },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey:["bot",bot.id] });
      qc.invalidateQueries({ queryKey:["bots"] });
      setNameSaved(true); setTimeout(() => setNameSaved(false), 2500);
      ok("Saved","Bot renamed");
    },
    onError: (e:any) => err("Failed", e.response?.data?.error ?? "Could not save"),
  });

  const destroy = useMutation({
    mutationFn: async () => { await api.delete(`/bots/${bot.id}`); },
    onSuccess: () => { ok("Deleted","Bot removed. Slot freed."); setLocation("/dashboard"); },
    onError: () => err("Failed","Could not delete bot"),
  });

  const copyId = () => {
    navigator.clipboard.writeText(bot.id).then(() => {
      setCopied(true); setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div className="flex-1 overflow-y-auto min-h-0 p-4 flex flex-col gap-4">

      {/* Bot name */}
      <div className="rounded-xl p-4" style={{ background: S, border: `1px solid ${B}` }}>
        <p className="text-xs font-bold text-white mb-3">Bot Name</p>
        <div className="flex gap-2">
          <input value={name} onChange={e=>{setName(e.target.value);setNameSaved(false);}}
            onKeyDown={e=>e.key==="Enter"&&saveName.mutate()}
            className="flex-1 h-9 px-3 rounded-lg text-sm text-white outline-none"
            style={{ background:"var(--bg-primary)", border:`1px solid ${B}` }}/>
          <button onClick={()=>saveName.mutate()} disabled={saveName.isPending||!name.trim()}
            className="flex items-center gap-1.5 h-9 px-4 rounded-lg text-xs font-bold text-white disabled:opacity-40 transition-all"
            style={{ background: nameSaved ? GR : BL }}>
            {nameSaved ? <><Check size={12}/> Saved</> : <><Save size={12}/> Save</>}
          </button>
        </div>
      </div>

      {/* Bot ID */}
      <div className="rounded-xl p-4" style={{ background: S, border: `1px solid ${B}` }}>
        <p className="text-xs font-bold text-white mb-1">Bot ID</p>
        <p className="text-xs mb-3" style={{ color: MUT }}>Reference this bot in scripts or API calls.</p>
        <div className="flex items-center gap-2">
          <div className="flex-1 flex items-center gap-2 h-9 px-3 rounded-lg min-w-0" style={{ background:"var(--bg-primary)", border:`1px solid ${B}` }}>
            <Hash size={11} className="shrink-0" style={{ color: MUT }}/>
            <span className="text-xs font-mono text-white truncate flex-1">{bot.id}</span>
          </div>
          <button onClick={copyId}
            className="flex items-center gap-1.5 h-9 px-3 rounded-lg text-xs font-bold shrink-0 transition-all"
            style={{ background: copied?"rgba(34,197,94,0.12)":S, color: copied?GR:DIM, border:`1px solid ${copied?"rgba(34,197,94,0.2)":B}` }}>
            {copied ? <><Check size={11}/>Copied</> : <><Copy size={11}/>Copy</>}
          </button>
        </div>
      </div>

      {/* Plan badge */}
      <div className="rounded-xl p-4" style={{ background: S, border: `1px solid ${B}` }}>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-white mb-0.5">Plan</p>
            <p className="text-xs" style={{ color: MUT }}>{isPro ? "768MB RAM · 1 CPU · 10GB storage" : "400MB RAM · 0.5 CPU · 3GB storage"}</p>
          </div>
          <span className="text-xs font-black px-2.5 py-1 rounded-lg uppercase tracking-wide"
            style={isPro
              ? { background:"rgba(59,130,246,0.12)", color:BL, border:`1px solid rgba(59,130,246,0.25)` }
              : { background:"rgba(255,255,255,0.06)", color:DIM, border:`1px solid ${B}` }
            }>
            {isPro ? "Pro" : "Basic"}
          </span>
        </div>
        {!isPro && (
          <Link href={`/checkout?plan=pro&botId=${bot.id}`}>
            <button className="mt-3 w-full h-8 rounded-lg text-xs font-bold text-white" style={{ background: BL }}>
              Upgrade to Pro
            </button>
          </Link>
        )}
      </div>

      {/* Email alerts */}
      <div className="rounded-xl p-4" style={{ background: S, border: `1px solid ${B}` }}>
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs font-bold text-white">Crash Email Alerts</p>
          {!isPro && (
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background:"rgba(59,130,246,0.1)", color:BL, border:`1px solid rgba(59,130,246,0.2)` }}>Pro only</span>
          )}
        </div>
        {isPro ? (
          <div className="flex flex-col gap-3">
            {["Bot crashes (exit code ≠ 0)","5 consecutive restart failures","Memory limit exceeded (90%)"].map(label => (
              <div key={label} className="flex items-center justify-between gap-3">
                <p className="text-xs text-white">{label}</p>
                <div className="w-10 h-5 rounded-full relative" style={{ background:"rgba(255,255,255,0.08)" }}>
                  <div className="w-4 h-4 rounded-full absolute top-0.5 left-0.5" style={{ background: MUT }}/>
                </div>
              </div>
            ))}
            <p className="text-[11px]" style={{ color: MUT }}>Alerts sent to your account email.</p>
          </div>
        ) : (
          <div className="flex items-start gap-3">
            <Lock size={14} className="mt-0.5 shrink-0" style={{ color: MUT }}/>
            <div>
              <p className="text-xs text-white">Not available on Basic bots</p>
              <p className="text-xs mt-0.5" style={{ color: MUT }}>Upgrade this bot to Pro to receive crash emails with logs and a one-click restart link.</p>
              <Link href={`/checkout?plan=pro&botId=${bot.id}`}>
                <button className="mt-2 h-7 px-3 rounded-lg text-xs font-bold text-white" style={{ background: BL }}>Upgrade to Pro</button>
              </Link>
            </div>
          </div>
        )}
      </div>

      {/* Danger zone */}
      <div className="rounded-xl p-4" style={{ background: S, border:"1px solid rgba(239,68,68,0.15)" }}>
        <p className="text-xs font-bold mb-1" style={{ color:"#ef4444" }}>Danger Zone</p>
        <p className="text-xs mb-3" style={{ color: DIM }}>Permanently deletes this bot, all files, logs and variables. <strong className="text-white">Cannot be undone.</strong> One slot will be freed.</p>
        {!showDel ? (
          <button onClick={()=>setShowDel(true)} className="h-8 px-4 rounded-lg text-xs font-bold"
            style={{ background:"rgba(239,68,68,0.1)", color:"#ef4444", border:"1px solid rgba(239,68,68,0.2)" }}>
            Delete Bot
          </button>
        ) : (
          <div className="flex flex-col gap-2">
            <input value={delInput} onChange={e=>setDelInput(e.target.value)} placeholder={`Type "${bot.name}" to confirm`}
              className="w-full h-9 px-3 rounded-lg text-sm text-white outline-none"
              style={{ background:"var(--bg-primary)", border:"1px solid rgba(239,68,68,0.3)" }}/>
            <div className="flex gap-2">
              <button onClick={()=>destroy.mutate()} disabled={delInput!==bot.name||destroy.isPending}
                className="h-8 px-4 rounded-lg text-xs font-black text-white disabled:opacity-40"
                style={{ background:"#ef4444" }}>
                {destroy.isPending?"Deleting…":"Confirm Delete"}
              </button>
              <button onClick={()=>setShowDel(false)} className="h-8 px-3 rounded-lg text-xs" style={{ color: DIM }}>Cancel</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// ── Main Page ─────────────────────────────────────────────────────────────────
interface BotData { id:string; name:string; runtime:string|null; startFile:string|null; plan?:string; status:string; memoryUsedMb:number; memoryLimitMb:number; cpuPercent:number; uptimeSeconds:number; createdAt:string; }

const TABS = ["Console","Files","Config","Settings"] as const;
type Tab = typeof TABS[number];

const BotDetailPage: React.FC = () => {
  const { id } = useParams();
  const [tab, setTab] = useState<Tab>("Console");
  const qc = useQueryClient();
  const { success: ok, error: err } = useToast();

  const { data: bot, isLoading, error } = useQuery<BotData>({
    queryKey: ["bot", id],
    queryFn: async () => { const r = await api.get(`/bots/${id}`); return r.data; },
    refetchInterval: 10_000,
  });

  const doAction = useMutation({
    mutationFn: async (a:string) => { await api.post(`/bots/${id}/${a}`); },
    onSuccess: (_,a) => { ok("Done",`Bot ${a} triggered.`); qc.invalidateQueries({queryKey:["bot",id]}); qc.invalidateQueries({queryKey:["bots"]}); },
    onError: (e:any) => err("Failed", e.response?.data?.error ?? "Action failed"),
  });

  if (isLoading) return (
    <DashboardLayout fullHeight>
      <div className="flex flex-col gap-3 p-4">
        {[40,56,240].map(h => <div key={h} className="rounded-xl animate-pulse" style={{ background:S, height:h }}/>)}
      </div>
    </DashboardLayout>
  );

  if (!bot || error) return (
    <DashboardLayout fullHeight>
      <div className="flex flex-col items-center py-16 text-center p-4">
        <AlertCircle size={28} className="mb-3" style={{ color:"#ef4444" }}/>
        <p className="text-base font-semibold text-white mb-1">Bot not found</p>
        <Link href="/dashboard"><span className="text-xs" style={{ color:BL }}>← Back to dashboard</span></Link>
      </div>
    </DashboardLayout>
  );

  const dot     = STATUS_DOT[bot.status] ?? STATUS_DOT.not_created;
  const running = bot.status === "running";
  const canStart = ["stopped","crashed","not_created"].includes(bot.status);
  const isPro   = (bot.plan ?? "basic") === "pro";

  return (
    <DashboardLayout fullHeight>
      <div className="flex flex-col h-full min-h-0">

        {/* ── Header ── */}
        <div className="flex items-center gap-2.5 px-4 py-3 border-b shrink-0" style={{ borderColor: B }}>
          <Link href="/dashboard">
            <button className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-white/10 shrink-0" style={{ color: DIM }}>
              <ChevronLeft size={15}/>
            </button>
          </Link>

          <div className="w-2 h-2 rounded-full shrink-0" style={{ background:dot, boxShadow: running?`0 0 6px ${GR}`:"none" }}/>

          <span className="text-sm font-bold text-white truncate flex-1">{bot.name}</span>

          {/* Plan badge */}
          <span className="text-[10px] font-black px-1.5 py-0.5 rounded shrink-0 uppercase tracking-wide"
            style={isPro
              ? { background:"rgba(59,130,246,0.12)", color:BL }
              : { background:"rgba(255,255,255,0.06)", color:MUT }
            }>
            {isPro?"Pro":"Basic"}
          </span>

          {/* Actions */}
          <div className="flex items-center gap-1 shrink-0">
            {canStart && (
              <button onClick={()=>doAction.mutate("start")} disabled={doAction.isPending}
                className="flex items-center gap-1 h-7 px-2.5 rounded-lg text-xs font-bold disabled:opacity-50"
                style={{ background:"rgba(34,197,94,0.1)", color:GR, border:"1px solid rgba(34,197,94,0.2)" }}>
                <Play size={10} fill="currentColor"/> Start
              </button>
            )}
            {running && (
              <button onClick={()=>doAction.mutate("stop")} disabled={doAction.isPending}
                className="flex items-center gap-1 h-7 px-2.5 rounded-lg text-xs font-bold disabled:opacity-50"
                style={{ background:"rgba(239,68,68,0.1)", color:"#ef4444", border:"1px solid rgba(239,68,68,0.2)" }}>
                <Square size={10} fill="currentColor"/> Stop
              </button>
            )}
            <button onClick={()=>doAction.mutate("restart")} disabled={doAction.isPending}
              className="w-7 h-7 rounded-lg flex items-center justify-center disabled:opacity-50"
              style={{ background:S, color:DIM, border:`1px solid ${B}` }}>
              <RefreshCw size={11}/>
            </button>
          </div>
        </div>

        {/* ── Tab bar ── */}
        <div className="flex border-b shrink-0 overflow-x-auto scrollbar-none" style={{ borderColor: B }}>
          {TABS.map(t => (
            <button key={t} onClick={()=>setTab(t)}
              className="px-5 py-2.5 text-sm font-semibold border-b-2 -mb-px whitespace-nowrap shrink-0 transition-colors"
              style={tab===t ? { color:"white", borderColor:BL } : { color:MUT, borderColor:"transparent" }}>
              {t}
            </button>
          ))}
        </div>

        {/* ── Tab content ── */}
        <div className="flex-1 min-h-0 flex flex-col">
          {tab === "Console"  && <ConsoleTab  botId={id!}/>}
          {tab === "Files"    && <FilesTab    botId={id!}/>}
          {tab === "Config"   && <ConfigTab   bot={bot}/>}
          {tab === "Settings" && <SettingsTab bot={bot}/>}
        </div>

      </div>
    </DashboardLayout>
  );
};

export default BotDetailPage;
