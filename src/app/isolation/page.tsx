"use client";

import { useState, useCallback, useRef } from "react";
import Header from "@/components/Header";

type Transaction = {
    id: string;
    name: string;
    status: "waiting" | "reading" | "writing" | "committed" | "blocked";
    readValue: number | null;
};

type LogEntry = {
    time: string;
    level: "INFO" | "SUCCESS" | "WARN" | "ERROR";
    message: string;
    txId?: string;
};

type NarratorMessage = {
    id: number;
    stepIndex: number;
    text: string;
    type: "info" | "success" | "warning" | "error";
};

type IsolationLevel = "read_uncommitted" | "read_committed" | "repeatable_read" | "serializable";

const STEP_DELAY = 5000;

export default function IsolationPage() {
    const [sharedValue, setSharedValue] = useState(100);
    const [isolationLevel, setIsolationLevel] = useState<IsolationLevel>("read_uncommitted");
    const [isRunning, setIsRunning] = useState(false);
    const [isPaused, setIsPaused] = useState(false);
    const [transactions, setTransactions] = useState<Transaction[]>([
        { id: "T1", name: "Transaction 1", status: "waiting", readValue: null },
        { id: "T2", name: "Transaction 2", status: "waiting", readValue: null },
    ]);
    const [logs, setLogs] = useState<LogEntry[]>([]);
    const [narratorMessages, setNarratorMessages] = useState<NarratorMessage[]>([]);
    const [showNarrator, setShowNarrator] = useState(false);
    const [activeMessageId, setActiveMessageId] = useState<number | null>(null);
    const [demoResult, setDemoResult] = useState<string | null>(null);
    const [anomalyDetected, setAnomalyDetected] = useState<string | null>(null);

    const pauseRef = useRef(false);
    const abortRef = useRef(false);

    const getTime = () => {
        const now = new Date();
        return `${now.getHours().toString().padStart(2, "0")}:${now.getMinutes().toString().padStart(2, "0")}:${now.getSeconds().toString().padStart(2, "0")}`;
    };

    const addLog = useCallback((level: LogEntry["level"], message: string, txId?: string) => {
        setLogs((prev) => [...prev, { time: getTime(), level, message, txId }]);
    }, []);

    const addNarratorMessage = (stepIndex: number, text: string, type: NarratorMessage["type"] = "info") => {
        const id = Date.now();
        setNarratorMessages((prev) => [...prev, { id, stepIndex, text, type }]);
        setActiveMessageId(id);
    };

    const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

    const waitForResume = async () => {
        while (pauseRef.current && !abortRef.current) {
            await delay(100);
        }
    };

    const smartDelay = async (ms: number) => {
        const interval = 100;
        let elapsed = 0;
        while (elapsed < ms && !abortRef.current) {
            if (pauseRef.current) await waitForResume();
            await delay(interval);
            elapsed += interval;
        }
    };

    const updateTransaction = (id: string, updates: Partial<Transaction>) => {
        setTransactions((prev) => prev.map((tx) => (tx.id === id ? { ...tx, ...updates } : tx)));
    };

    const resetDemo = () => {
        abortRef.current = true;
        pauseRef.current = false;
        setSharedValue(100);
        setTransactions([
            { id: "T1", name: "Transaction 1", status: "waiting", readValue: null },
            { id: "T2", name: "Transaction 2", status: "waiting", readValue: null },
        ]);
        setLogs([]);
        setNarratorMessages([]);
        setDemoResult(null);
        setAnomalyDetected(null);
        setIsRunning(false);
        setIsPaused(false);
        setActiveMessageId(null);
    };

    const togglePause = () => {
        pauseRef.current = !pauseRef.current;
        setIsPaused(!isPaused);
    };

    const runDemo = async () => {
        resetDemo();
        await delay(100);
        abortRef.current = false;
        setIsRunning(true);
        setShowNarrator(true);

        if (isolationLevel === "read_uncommitted") {
            addNarratorMessage(0, "🔓 Read Uncommitted is the LOWEST isolation level. It allows reading uncommitted data.", "warning");
            addLog("INFO", "Starting Read Uncommitted demo...");
            await smartDelay(STEP_DELAY);
            if (abortRef.current) return;

            addNarratorMessage(1, "T1 starts and writes value 100 → 200, but does NOT commit yet.", "info");
            updateTransaction("T1", { status: "writing" });
            addLog("INFO", "BEGIN TRANSACTION", "T1");
            addLog("INFO", "Writing: 100 → 200 (UNCOMMITTED)", "T1");
            setSharedValue(200);
            await smartDelay(STEP_DELAY);
            if (abortRef.current) return;

            addNarratorMessage(2, "T2 starts and reads the value. What does it see?", "info");
            updateTransaction("T2", { status: "reading" });
            addLog("INFO", "BEGIN TRANSACTION", "T2");
            await smartDelay(STEP_DELAY);
            if (abortRef.current) return;

            addNarratorMessage(3, "⚠️ DIRTY READ! T2 reads 200 — an UNCOMMITTED value!", "error");
            updateTransaction("T2", { readValue: 200 });
            addLog("ERROR", "Reading UNCOMMITTED value: 200 (DIRTY READ!)", "T2");
            setAnomalyDetected("Dirty Read");
            await smartDelay(STEP_DELAY);
            if (abortRef.current) return;

            addNarratorMessage(4, "T1 ROLLS BACK! The value returns to 100. But T2 already used 200!", "error");
            addLog("ERROR", "ROLLBACK - T1 aborted!", "T1");
            setSharedValue(100);
            updateTransaction("T1", { status: "waiting", readValue: null });
            updateTransaction("T2", { status: "committed" });
            await smartDelay(STEP_DELAY);
            if (abortRef.current) return;

            addNarratorMessage(5, "❌ T2 made decisions based on data that was NEVER committed. This can cause data corruption!", "error");
            setDemoResult("PROBLEM: T2 read uncommitted data. This is why Read Uncommitted is rarely used!");

        } else if (isolationLevel === "read_committed") {
            addNarratorMessage(0, "🔒 Read Committed prevents dirty reads by only showing committed data.", "info");
            addLog("INFO", "Starting Read Committed demo...");
            await smartDelay(STEP_DELAY);
            if (abortRef.current) return;

            addNarratorMessage(1, "T1 starts and writes 100 → 200 (not yet committed).", "info");
            updateTransaction("T1", { status: "writing" });
            addLog("INFO", "Writing: 100 → 200", "T1");
            await smartDelay(STEP_DELAY);
            if (abortRef.current) return;

            addNarratorMessage(2, "T2 starts and tries to read. It will only see COMMITTED data.", "info");
            updateTransaction("T2", { status: "reading", readValue: 100 });
            addLog("INFO", "BEGIN TRANSACTION", "T2");
            addLog("SUCCESS", "Reading COMMITTED value: 100", "T2");
            await smartDelay(STEP_DELAY);
            if (abortRef.current) return;

            addNarratorMessage(3, "✅ T2 sees 100, not 200. T1's uncommitted change is hidden.", "success");
            await smartDelay(STEP_DELAY);
            if (abortRef.current) return;

            addNarratorMessage(4, "T1 commits. Value 200 is now official.", "success");
            setSharedValue(200);
            addLog("SUCCESS", "COMMIT - Value 200 now visible", "T1");
            updateTransaction("T1", { status: "committed" });
            updateTransaction("T2", { status: "committed", readValue: 200 });
            await smartDelay(STEP_DELAY);
            if (abortRef.current) return;

            addNarratorMessage(5, "✅ No dirty reads! T2 only saw committed data.", "success");
            setDemoResult("SUCCESS: No dirty reads. T2 only saw committed values.");

        } else if (isolationLevel === "repeatable_read") {
            addNarratorMessage(0, "🔒🔒 Repeatable Read ensures you see the same data throughout your transaction.", "info");
            addLog("INFO", "Starting Repeatable Read demo...");
            await smartDelay(STEP_DELAY);
            if (abortRef.current) return;

            addNarratorMessage(1, "T2 starts first and reads value 100. This creates a 'snapshot'.", "info");
            updateTransaction("T2", { status: "reading", readValue: 100 });
            addLog("INFO", "BEGIN TRANSACTION", "T2");
            addLog("SUCCESS", "First read: 100 (snapshot taken)", "T2");
            await smartDelay(STEP_DELAY);
            if (abortRef.current) return;

            addNarratorMessage(2, "T1 starts, changes 100 → 200, and COMMITS.", "info");
            updateTransaction("T1", { status: "writing" });
            addLog("INFO", "Writing: 100 → 200", "T1");
            setSharedValue(200);
            addLog("SUCCESS", "COMMIT", "T1");
            updateTransaction("T1", { status: "committed" });
            await smartDelay(STEP_DELAY);
            if (abortRef.current) return;

            addNarratorMessage(3, "T2 reads the same row again. What does it see?", "info");
            await smartDelay(STEP_DELAY);
            if (abortRef.current) return;

            addNarratorMessage(4, "✅ T2 still sees 100! It has a consistent snapshot from when it started.", "success");
            addLog("SUCCESS", "Second read: Still sees 100 (snapshot isolation)", "T2");
            updateTransaction("T2", { status: "committed" });
            await smartDelay(STEP_DELAY);
            if (abortRef.current) return;

            addNarratorMessage(5, "✅ T2 saw consistent data throughout its transaction.", "success");
            setDemoResult("SUCCESS: T2 saw consistent data (100) even though T1 changed it to 200.");

        } else {
            addNarratorMessage(0, "🔒🔒🔒 Serializable is the STRICTEST level. Transactions run sequentially.", "info");
            addLog("INFO", "Starting Serializable demo...");
            await smartDelay(STEP_DELAY);
            if (abortRef.current) return;

            addNarratorMessage(1, "T1 starts and acquires an EXCLUSIVE lock. No one else can access this data.", "info");
            updateTransaction("T1", { status: "reading", readValue: 100 });
            addLog("INFO", "BEGIN TRANSACTION", "T1");
            addLog("SUCCESS", "Acquired EXCLUSIVE lock", "T1");
            await smartDelay(STEP_DELAY);
            if (abortRef.current) return;

            addNarratorMessage(2, "T2 tries to start, but the data is LOCKED. T2 must WAIT.", "warning");
            updateTransaction("T2", { status: "blocked" });
            addLog("INFO", "BEGIN TRANSACTION", "T2");
            addLog("WARN", "BLOCKED! Waiting for T1...", "T2");
            await smartDelay(STEP_DELAY);
            if (abortRef.current) return;

            addNarratorMessage(3, "T1 modifies value 100 → 150 and commits, releasing the lock.", "info");
            updateTransaction("T1", { status: "writing" });
            setSharedValue(150);
            addLog("INFO", "Writing: 100 → 150", "T1");
            addLog("SUCCESS", "COMMIT - Lock released", "T1");
            updateTransaction("T1", { status: "committed" });
            await smartDelay(STEP_DELAY);
            if (abortRef.current) return;

            addNarratorMessage(4, "T2 is now unblocked and can proceed. It reads 150.", "success");
            updateTransaction("T2", { status: "reading", readValue: 150 });
            addLog("SUCCESS", "Lock acquired! Reading: 150", "T2");
            updateTransaction("T2", { status: "committed" });
            await smartDelay(STEP_DELAY);
            if (abortRef.current) return;

            addNarratorMessage(5, "✅ Both transactions completed without anomalies. T2 waited for T1.", "success");
            setDemoResult("SUCCESS: Transactions ran sequentially. Safest but slowest.");
        }

        setIsRunning(false);
    };

    const isolationLevels = [
        { value: "read_uncommitted", label: "Read Uncommitted", risk: "high" },
        { value: "read_committed", label: "Read Committed", risk: "medium" },
        { value: "repeatable_read", label: "Repeatable Read", risk: "low" },
        { value: "serializable", label: "Serializable", risk: "none" },
    ];

    const getStatusColor = (status: Transaction["status"]) => {
        switch (status) {
            case "reading": return "bg-blue-500";
            case "writing": return "bg-amber-500";
            case "committed": return "bg-emerald-500";
            case "blocked": return "bg-red-500 animate-pulse";
            default: return "bg-slate-500";
        }
    };

    const getNarratorTypeStyles = (type: NarratorMessage["type"]) => {
        switch (type) {
            case "success": return "border-l-accent-success bg-emerald-500/5";
            case "warning": return "border-l-accent-warning bg-amber-500/5";
            case "error": return "border-l-accent-error bg-red-500/5";
            default: return "border-l-primary bg-primary/5";
        }
    };

    return (
        <>
            <Header title="Isolation" />
            <div className="flex h-[calc(100vh-64px)]">
                <div className={`flex-1 p-6 lg:p-8 overflow-y-auto transition-all ${showNarrator ? "lg:mr-[400px]" : ""}`}>
                    <div className="max-w-4xl mx-auto flex flex-col gap-6">
                        <header className="pb-6 border-b border-card-border">
                            <h2 className="text-3xl md:text-4xl font-display font-bold text-foreground tracking-tight mb-3">
                                <span className="text-primary">Isolation</span> — Independent{" "}
                                <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-emerald-400">Execution</span>
                            </h2>
                            <p className="text-foreground-muted text-base leading-relaxed max-w-2xl">
                                Isolation controls how concurrent transactions see each other&apos;s changes.
                            </p>
                        </header>

                        {/* Controls */}
                        <div className="flex flex-wrap items-center gap-4 p-4 bg-surface rounded-xl border border-card-border">
                            <div className="flex-1 min-w-[200px]">
                                <label className="text-xs text-foreground-muted mb-2 block">Isolation Level</label>
                                <div className="grid grid-cols-2 gap-2">
                                    {isolationLevels.map((level) => (
                                        <button
                                            key={level.value}
                                            onClick={() => { setIsolationLevel(level.value as IsolationLevel); resetDemo(); }}
                                            disabled={isRunning}
                                            className={`p-2 rounded-lg text-xs font-bold transition-all ${isolationLevel === level.value ? "bg-primary/20 border-primary text-primary" : "bg-surface-darker border-card-border text-foreground-muted hover:text-foreground"} border ${isRunning ? "opacity-50" : ""}`}
                                        >
                                            {level.label}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <div className="flex gap-2">
                                {!isRunning ? (
                                    <button onClick={runDemo} className="px-5 py-2.5 text-sm font-bold text-white bg-primary hover:bg-primary/90 rounded-lg flex items-center gap-2 shadow-sm">
                                        <span className="material-symbols-outlined text-lg">play_arrow</span>
                                        Run Demo
                                    </button>
                                ) : (
                                    <>
                                        <button onClick={togglePause} className={`px-5 py-2.5 text-sm font-bold rounded-lg flex items-center gap-2 ${isPaused ? "text-white bg-emerald-600 shadow-sm" : "text-amber-600 dark:text-amber-400 border border-amber-500/50 bg-amber-500/10"}`}>
                                            <span className="material-symbols-outlined text-lg">{isPaused ? "play_arrow" : "pause"}</span>
                                            {isPaused ? "Continue" : "Pause"}
                                        </button>
                                        <button onClick={resetDemo} className="px-5 py-2.5 text-sm font-bold text-red-600 dark:text-red-400 border border-red-500/50 bg-red-500/10 rounded-lg flex items-center gap-2">
                                            <span className="material-symbols-outlined text-lg">stop</span>
                                            Stop
                                        </button>
                                    </>
                                )}
                            </div>
                        </div>

                        {/* Shared Value */}
                        <div className="flex justify-center">
                            <div className="bg-surface rounded-2xl p-6 border border-card-border text-center">
                                <p className="text-xs text-foreground-muted uppercase font-bold mb-2">Shared Value</p>
                                <p className="text-5xl font-mono font-bold text-primary">{sharedValue}</p>
                            </div>
                        </div>

                        {/* Transactions */}
                        <div className="grid grid-cols-2 gap-6">
                            {transactions.map((tx) => (
                                <div key={tx.id} className={`bg-surface rounded-xl p-5 border-2 transition-all ${tx.status === "blocked" ? "border-red-500/50" : tx.status === "committed" ? "border-emerald-500/50" : tx.status !== "waiting" ? "border-blue-500/50" : "border-card-border"}`}>
                                    <div className="flex items-center justify-between mb-3">
                                        <div className="flex items-center gap-2">
                                            <div className={`w-8 h-8 rounded-lg ${tx.id === "T1" ? "bg-indigo-500/20 text-indigo-400" : "bg-pink-500/20 text-pink-400"} flex items-center justify-center`}>
                                                <span className="material-symbols-outlined text-lg">sync_alt</span>
                                            </div>
                                            <span className="font-bold text-foreground">{tx.name}</span>
                                        </div>
                                        <span className={`w-3 h-3 rounded-full ${getStatusColor(tx.status)}`} />
                                    </div>
                                    <div className="space-y-2 text-sm">
                                        <div className="flex justify-between">
                                            <span className="text-foreground-muted">Status:</span>
                                            <span className={`font-mono uppercase ${tx.status === "blocked" ? "text-red-400" : tx.status === "committed" ? "text-emerald-400" : "text-foreground"}`}>{tx.status}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-foreground-muted">Read:</span>
                                            <span className="font-mono text-foreground">{tx.readValue ?? "-"}</span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Result */}
                        {demoResult && (
                            <div className={`p-4 rounded-xl border ${anomalyDetected ? "bg-red-500/10 border-red-500/30" : "bg-emerald-500/10 border-emerald-500/30"}`}>
                                <div className="flex items-start gap-3">
                                    <span className={`material-symbols-outlined text-2xl ${anomalyDetected ? "text-accent-error" : "text-accent-success"}`}>
                                        {anomalyDetected ? "warning" : "check_circle"}
                                    </span>
                                    <div>
                                        {anomalyDetected && <h4 className="font-bold text-accent-error mb-1">Anomaly: {anomalyDetected}</h4>}
                                        <p className="text-sm text-foreground-muted">{demoResult}</p>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* System Logs */}
                        <div className="rounded-xl border border-card-border overflow-hidden bg-surface">
                            <div className="px-4 py-3 bg-surface-darker border-b border-card-border flex items-center gap-2">
                                <span className="material-symbols-outlined text-foreground-muted text-sm">terminal</span>
                                <span className="text-xs font-bold text-foreground-muted uppercase">System Logs</span>
                            </div>
                            <div className="p-4 h-80 overflow-y-auto font-mono text-xs text-foreground space-y-1 scrollbar-hide">
                                {logs.length === 0 ? <p className="text-foreground-muted opacity-50">Waiting...</p> : logs.map((log, i) => (
                                    <div key={i} className="flex gap-2">
                                        <span className="text-slate-600">[{log.time}]</span>
                                        {log.txId && <span className={log.txId === "T1" ? "text-indigo-400" : "text-pink-400"}>[{log.txId}]</span>}
                                        <span className={log.level === "INFO" ? "text-blue-400" : log.level === "SUCCESS" ? "text-emerald-400" : log.level === "ERROR" ? "text-red-400" : "text-amber-400"}>{log.level}:</span>
                                        <span>{log.message}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Narrator */}
                {showNarrator && (
                    <div className="fixed right-0 top-16 bottom-0 w-[400px] bg-surface border-l border-card-border flex flex-col z-30">
                        <div className="p-4 border-b border-card-border flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-primary">
                                    <span className="material-symbols-outlined">smart_toy</span>
                                </div>
                                <div>
                                    <h3 className="font-bold text-foreground">Narrator</h3>
                                    <p className="text-xs text-foreground-muted">Click any message to highlight</p>
                                </div>
                            </div>
                            <button onClick={() => setShowNarrator(false)} className="w-8 h-8 rounded-full hover:bg-surface-darker flex items-center justify-center text-foreground-muted">
                                <span className="material-symbols-outlined">close</span>
                            </button>
                        </div>
                        <div className="flex-1 overflow-y-auto p-4 space-y-3 scrollbar-hide">
                            {narratorMessages.map((msg) => (
                                <button key={msg.id} onClick={() => setActiveMessageId(msg.id)} className={`w-full text-left p-4 rounded-lg border-l-4 transition-all ${getNarratorTypeStyles(msg.type)} ${activeMessageId === msg.id ? "ring-2 ring-primary" : "hover:opacity-80"}`}>
                                    <p className="text-sm text-foreground leading-relaxed">{msg.text}</p>
                                    <p className="text-xs text-foreground-muted mt-2">Step {msg.stepIndex}</p>
                                </button>
                            ))}
                            {isRunning && !isPaused && (
                                <div className="flex items-center gap-2 text-foreground-muted text-sm">
                                    <span className="material-symbols-outlined text-lg animate-spin">progress_activity</span>
                                    <span>Processing...</span>
                                </div>
                            )}
                            {isPaused && (
                                <div className="flex items-center gap-2 text-amber-400 text-sm p-3 bg-amber-500/10 rounded-lg">
                                    <span className="material-symbols-outlined">pause_circle</span>
                                    <span>Paused</span>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </>
    );
}
