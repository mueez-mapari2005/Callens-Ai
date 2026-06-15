import { createFileRoute } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { ArrowRight, Check, Clipboard, FileAudio, Headphones, LoaderCircle, MapPin, PiggyBank, RotateCcw, UploadCloud, Waves } from "lucide-react";
import { Button } from "@/components/ui/button";

type Status = "yes" | "no" | "unclear" | "not_asked";
type BpclItem = { status: Status; value: string; customerResponse?: string; evidence: string };
type Analysis = { transcript: Array<{ speaker: string; text: string; timestamp: string }>; summary: string; bpcl: { budget: BpclItem; possession: BpclItem; configuration: BpclItem; location: BpclItem }; customerComfort: string; customerComfortEvidence: string; outcome: string };

export const Route = createFileRoute("/")({
  head: () => ({ meta: [
    { title: "CallLens — English Transcript & BPCL Analysis" },
    { name: "description", content: "Upload call-centre audio for an English transcript, summary, and evidence-based BPCL report." },
    { property: "og:title", content: "CallLens — Call Audio Analysis" },
    { property: "og:description", content: "English transcripts, summaries, and BPCL qualification from call recordings." },
  ] }),
  component: Index,
});

const bpclMeta = {
  budget: { letter: "B", label: "Budget", icon: PiggyBank }, possession: { letter: "P", label: "Possession", icon: Check },
  configuration: { letter: "C", label: "Configuration", icon: Waves }, location: { letter: "L", label: "Location", icon: MapPin },
} as const;

function Index() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [dragging, setDragging] = useState(false);

  const chooseFile = (selected?: File) => {
    if (!selected) return;
    setError(""); setAnalysis(null);
    if (selected.size > 20 * 1024 * 1024) { setError("This file is larger than 20 MB. Please choose a smaller recording."); return; }
    setFile(selected);
  };
  const analyze = async () => {
    if (!file) return;
    setLoading(true); setError("");
    const body = new FormData(); body.append("audio", file);
    try {
      const response = await fetch("/api/analyze-call", { method: "POST", body });
      const payload = (await response.json()) as Analysis & { error?: string };
      if (!response.ok) throw new Error(payload.error ?? "Analysis failed.");
      setAnalysis(payload);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Analysis failed. Please retry."); }
    finally { setLoading(false); }
  };
  const reset = () => { setFile(null); setAnalysis(null); setError(""); if (inputRef.current) inputRef.current.value = ""; };

  return <main className="min-h-screen">
    <header className="border-b border-border/70 bg-background/80 backdrop-blur"><div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4 sm:px-8">
      <div className="flex items-center gap-3"><span className="grid size-10 place-items-center rounded-xl bg-primary text-primary-foreground"><Headphones className="size-5" /></span><div><p className="font-display text-lg font-bold tracking-tight">CallLens</p><p className="text-[11px] font-semibold uppercase tracking-[.18em] text-muted-foreground">Conversation Intelligence</p></div></div>
      <div className="hidden items-center gap-2 text-xs font-semibold text-muted-foreground sm:flex"><span className="size-2 rounded-full bg-accent" /> English transcription · BPCL audit</div>
    </div></header>
    <section className="mx-auto max-w-7xl px-5 py-10 sm:px-8 sm:py-14">
      <div className="mb-10 grid items-end gap-6 lg:grid-cols-[1fr_auto]"><div className="max-w-3xl"><p className="mb-3 text-sm font-bold uppercase tracking-[.18em] text-primary">Call clarity, in minutes</p><h1 className="text-4xl font-bold leading-tight tracking-tight sm:text-6xl">Turn every sales call into <span className="text-primary">clear evidence.</span></h1><p className="mt-5 max-w-2xl text-base leading-7 text-muted-foreground sm:text-lg">Upload a call-centre recording. Get a complete English transcript, a concise call summary, and an evidence-based BPCL qualification report.</p></div><div className="flex gap-5 border-l border-border pl-6 text-sm text-muted-foreground"><div><strong className="block text-2xl text-foreground">20 MB</strong>Max file</div><div><strong className="block text-2xl text-foreground">5</strong>Audio formats</div></div></div>
      {!analysis ? <div className="grid gap-8 lg:grid-cols-[minmax(0,1.35fr)_minmax(300px,.65fr)]">
        <section className="overflow-hidden rounded-3xl border border-border bg-card shadow-sm"><div className="border-b border-border px-6 py-5 sm:px-8"><h2 className="text-xl font-bold">Upload call recording</h2><p className="mt-1 text-sm text-muted-foreground">Your audio is processed securely and is not displayed publicly.</p></div><div className="p-5 sm:p-8">
          <div onDragOver={(e) => { e.preventDefault(); setDragging(true); }} onDragLeave={() => setDragging(false)} onDrop={(e) => { e.preventDefault(); setDragging(false); chooseFile(e.dataTransfer.files[0]); }} className={`grid min-h-72 place-items-center rounded-2xl border-2 border-dashed p-8 text-center transition-colors ${dragging ? "border-primary bg-secondary/60" : "border-border bg-muted/40"}`}><div><span className="mx-auto grid size-16 place-items-center rounded-2xl bg-secondary text-primary"><UploadCloud className="size-8" /></span><h3 className="mt-5 text-lg font-bold">{file ? file.name : "Drop your audio file here"}</h3><p className="mt-2 text-sm text-muted-foreground">{file ? `${(file.size / 1024 / 1024).toFixed(1)} MB · Ready to analyze` : "MP3, WAV, M4A, WEBM or OGG · up to 20 MB"}</p><input ref={inputRef} type="file" accept="audio/mpeg,audio/mp3,audio/wav,audio/x-wav,audio/mp4,audio/x-m4a,audio/webm,audio/ogg" className="sr-only" onChange={(e) => chooseFile(e.target.files?.[0])} /><Button variant={file ? "outline" : "hero"} size="lg" className="mt-6" onClick={() => inputRef.current?.click()}>{file ? "Choose another file" : "Browse audio"}</Button></div></div>
          {error && <p role="alert" className="mt-4 rounded-xl bg-destructive/10 px-4 py-3 text-sm font-medium text-destructive">{error}</p>}<Button variant="hero" size="lg" className="mt-5 w-full" disabled={!file || loading} onClick={analyze}>{loading ? <><LoaderCircle className="animate-spin" /> Transcribing and analyzing…</> : <>Analyze this call <ArrowRight /></>}</Button>
        </div></section>
        <aside className="rounded-3xl bg-primary p-7 text-primary-foreground sm:p-8"><p className="text-xs font-bold uppercase tracking-[.2em] text-primary-foreground/65">Your report includes</p><div className="mt-7 space-y-6">{[{ n: "01", t: "English transcript", d: "Speaker-labelled dialogue translated into natural English." }, { n: "02", t: "Call summary", d: "Intent, discussion, outcome, and customer comfort at a glance." }, { n: "03", t: "BPCL evidence", d: "Budget, Possession, Configuration and Location—confirmed or missing." }].map((x) => <div key={x.n} className="flex gap-4"><span className="font-display text-sm font-bold text-accent">{x.n}</span><div><h3 className="font-bold">{x.t}</h3><p className="mt-1 text-sm leading-6 text-primary-foreground/70">{x.d}</p></div></div>)}</div><div className="mt-10 flex h-12 items-end gap-1 opacity-65" aria-hidden="true">{[45,75,35,90,60,100,55,80,40,70,30,65,45,85,55].map((height, i) => <span key={i} className="wave-bar w-full rounded-full bg-accent" style={{ height: `${height}%`, animationDelay: `${i * 70}ms` }} />)}</div></aside>
      </div> : <Results analysis={analysis} fileName={file?.name ?? "Call recording"} onReset={reset} />}
    </section>
  </main>;
}

function Results({ analysis, fileName, onReset }: { analysis: Analysis; fileName: string; onReset: () => void }) {
  const copy = () => navigator.clipboard.writeText(analysis.transcript.map((x) => `[${x.timestamp}] ${x.speaker}: ${x.text}`).join("\n"));
  return <div><div className="mb-6 flex flex-wrap items-center justify-between gap-4"><div className="flex items-center gap-3"><span className="grid size-11 place-items-center rounded-xl bg-secondary text-primary"><FileAudio /></span><div><h2 className="font-bold">Analysis complete</h2><p className="text-sm text-muted-foreground">{fileName}</p></div></div><Button variant="outline" onClick={onReset}><RotateCcw /> Analyze another call</Button></div>
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1.1fr)_minmax(380px,.9fr)]"><section className="rounded-3xl border border-border bg-card p-6 shadow-sm sm:p-8"><div className="flex items-center justify-between"><div><p className="text-xs font-bold uppercase tracking-[.18em] text-primary">Full conversation</p><h2 className="mt-1 text-2xl font-bold">English transcript</h2></div><Button variant="ghost" size="sm" onClick={copy}><Clipboard /> Copy</Button></div><div className="mt-7 max-h-[700px] space-y-5 overflow-y-auto pr-2">{analysis.transcript.map((line, i) => <div key={`${line.timestamp}-${i}`} className="grid grid-cols-[52px_1fr] gap-3"><span className="pt-1 font-mono text-xs text-muted-foreground">{line.timestamp}</span><div><p className="text-xs font-bold uppercase tracking-wider text-primary">{line.speaker}</p><p className="mt-1 leading-7 text-foreground/90">{line.text}</p></div></div>)}</div></section>
      <div className="space-y-6"><section className="rounded-3xl bg-primary p-6 text-primary-foreground sm:p-8"><p className="text-xs font-bold uppercase tracking-[.18em] text-accent">Executive summary</p><h2 className="mt-2 text-2xl font-bold">What happened on the call</h2><p className="mt-4 leading-7 text-primary-foreground/80">{analysis.summary}</p><div className="mt-6 border-t border-primary-foreground/15 pt-5"><p className="text-xs font-bold uppercase tracking-wider text-primary-foreground/55">Outcome</p><p className="mt-2 font-semibold">{analysis.outcome}</p></div><div className="mt-5 rounded-xl bg-primary-foreground/10 p-4"><p className="text-sm font-bold">Customer comfort: <span className="capitalize text-accent">{analysis.customerComfort.replaceAll("_", " ")}</span></p><p className="mt-1 text-sm text-primary-foreground/70">{analysis.customerComfortEvidence}</p></div></section>
        <section className="rounded-3xl border border-border bg-card p-6 shadow-sm sm:p-8"><p className="text-xs font-bold uppercase tracking-[.18em] text-primary">Customer BPCL confirmation</p><h2 className="mt-1 text-2xl font-bold">Did the customer say yes?</h2><p className="mt-2 text-sm text-muted-foreground">Shows whether the customer said Yes, Okay, or Comfortable for every BPCL point.</p><div className="mt-6 space-y-4">{(Object.keys(bpclMeta) as Array<keyof typeof bpclMeta>).map((key) => { const meta = bpclMeta[key], item = analysis.bpcl[key], Icon = meta.icon; return <div key={key} className="border-b border-border pb-4 last:border-0 last:pb-0"><div className="flex items-start gap-3"><span className="grid size-9 shrink-0 place-items-center rounded-lg bg-secondary font-display font-bold text-primary">{meta.letter}</span><Icon className="mt-2.5 size-4 shrink-0 text-muted-foreground" /><div className="min-w-0 flex-1"><div className="flex items-center justify-between gap-2"><h3 className="font-bold">{meta.label}</h3><StatusPill status={item.status} /></div><p className="mt-1 text-sm font-semibold">Customer response: <span className="text-primary">{item.customerResponse ?? statusResponse(item.status)}</span></p><p className="mt-1 text-sm text-foreground/80">Requirement: {item.value}</p><p className="mt-1 text-xs leading-5 text-muted-foreground">Evidence: {item.evidence}</p></div></div></div>; })}</div></section></div>
    </div></div>;
}

function StatusPill({ status }: { status: Status }) {
  const labels: Record<Status, string> = { yes: "Confirmed", no: "No", unclear: "Unclear", not_asked: "Not asked" };
  const styles: Record<Status, string> = { yes: "bg-emerald-100 text-emerald-800", no: "bg-red-100 text-red-800", unclear: "bg-amber-100 text-amber-900", not_asked: "bg-muted text-muted-foreground" };
  return <span className={`rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide ${styles[status]}`}>{labels[status]}</span>;
}

function statusResponse(status: Status) {
  const responses: Record<Status, string> = { yes: "Yes / Okay / Comfortable", no: "No / Not comfortable", unclear: "Unclear", not_asked: "Not asked" };
  return responses[status];
}
