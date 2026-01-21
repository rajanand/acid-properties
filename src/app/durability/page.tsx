"use client";

import { useState, useCallback, useRef } from "react";
import Header from "@/components/Header";

type OrderRecord = {
    id: number;
    customer: string;
    product: string;
    amount: number;
    status: "memory" | "wal" | "disk" | "lost";
};

type LogEntry = {
    time: string;
    level: "INFO" | "SUCCESS" | "WARN" | "ERROR";
    message: string;
};

type NarratorMessage = {
    id: number;
    stepIndex: number;
    text: string;
    type: "info" | "success" | "warning" | "error";
};

const STEP_DELAY = 5000;

const initialOrders: OrderRecord[] = [
    { id: 1001, customer: "Priya", product: "Laptop", amount: 75000, status: "disk" },
    { id: 1002, customer: "Vikram", product: "Mouse", amount: 1200, status: "disk" },
];

export default function DurabilityPage() {
    const [orders, setOrders] = useState<OrderRecord[]>(initialOrders);
    const [newCustomer, setNewCustomer] = useState("Arjun");
    const [newProduct, setNewProduct] = useState("Keyboard");
    const [newAmount, setNewAmount] = useState(3500);
    const [isRunning, setIsRunning] = useState(false);
    const [isPaused, setIsPaused] = useState(false);
    const [walEntries, setWalEntries] = useState<string[]>([]);
    const [logs, setLogs] = useState<LogEntry[]>([]);
    const [narratorMessages, setNarratorMessages] = useState<NarratorMessage[]>([]);
    const [showNarrator, setShowNarrator] = useState(false);
    const [activeMessageId, setActiveMessageId] = useState<number | null>(null);
    const [showRecovery, setShowRecovery] = useState(false);
    const [crashType, setCrashType] = useState<"none" | "before_wal" | "after_wal">("none");
    const [nextId, setNextId] = useState(1003);

    const pauseRef = useRef(false);
    const abortRef = useRef(false);

    const getTime = () => {
        const now = new Date();
        return `${now.getHours().toString().padStart(2, "0")}:${now.getMinutes().toString().padStart(2, "0")}:${now.getSeconds().toString().padStart(2, "0")}`;
    };

    const addLog = useCallback((level: LogEntry["level"], message: string) => {
        setLogs((prev) => [...prev, { time: getTime(), level, message }]);
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

    const resetDemo = () => {
        abortRef.current = true;
        pauseRef.current = false;
        setOrders(initialOrders);
        setWalEntries([]);
        setLogs([]);
        setNarratorMessages([]);
        setCrashType("none");
        setShowRecovery(false);
        setIsRunning(false);
        setIsPaused(false);
        setActiveMessageId(null);
        setNextId(1003);
    };

    const togglePause = () => {
        pauseRef.current = !pauseRef.current;
        setIsPaused(!isPaused);
    };

    const getInsertSQL = () => {
        return `INSERT INTO orders (id, customer, product, amount) VALUES (${nextId}, '${newCustomer}', '${newProduct}', ${newAmount})`;
    };

    const runNormalWrite = async () => {
        resetDemo();
        await delay(100);
        abortRef.current = false;
        setIsRunning(true);
        setShowNarrator(true);

        const orderId = 1003;
        const sql = `INSERT INTO orders VALUES (${orderId}, '${newCustomer}', '${newProduct}', ${newAmount})`;

        addNarratorMessage(0, "👋 Let's see how databases ensure your data survives crashes using Write-Ahead Logging (WAL).", "info");
        addLog("INFO", `Executing: ${sql}`);
        await smartDelay(STEP_DELAY);
        if (abortRef.current) return;

        addNarratorMessage(1, "📝 Step 1: New row is written to MEMORY first. This is fast but volatile — lost if power fails.", "info");
        const newOrder: OrderRecord = { id: orderId, customer: newCustomer, product: newProduct, amount: newAmount, status: "memory" };
        setOrders((prev) => [...prev, newOrder]);
        addLog("INFO", "Row written to memory buffer");
        await smartDelay(STEP_DELAY);
        if (abortRef.current) return;

        addNarratorMessage(2, "📋 Step 2: INSERT written to WAL (Write-Ahead Log) on DISK. Now it's DURABLE — survives crashes!", "success");
        setWalEntries([sql]);
        setOrders((prev) => prev.map((o) => (o.id === orderId ? { ...o, status: "wal" } : o)));
        addLog("SUCCESS", "WAL entry created - DATA IS DURABLE!");
        await smartDelay(STEP_DELAY);
        if (abortRef.current) return;

        addNarratorMessage(3, "💾 Step 3: Row written to the actual database file (orders.db).", "success");
        setOrders((prev) => prev.map((o) => (o.id === orderId ? { ...o, status: "disk" } : o)));
        addLog("SUCCESS", "Persisted to disk");
        await smartDelay(STEP_DELAY);
        if (abortRef.current) return;

        addNarratorMessage(4, "✅ Complete! WAL entry cleared since data is safely on disk. Order #1003 is now permanent.", "success");
        setWalEntries([]);
        addLog("SUCCESS", "WAL checkpoint complete");
        setNextId(1004);

        setIsRunning(false);
    };

    const runCrashBeforeWAL = async () => {
        resetDemo();
        await delay(100);
        abortRef.current = false;
        setIsRunning(true);
        setShowNarrator(true);
        setCrashType("before_wal");

        const orderId = 1003;
        const sql = `INSERT INTO orders VALUES (${orderId}, '${newCustomer}', '${newProduct}', ${newAmount})`;

        addNarratorMessage(0, "⚠️ Simulating crash BEFORE WAL write. The new order is only in memory...", "warning");
        addLog("INFO", `Executing: ${sql}`);
        await smartDelay(STEP_DELAY);
        if (abortRef.current) return;

        addNarratorMessage(1, "📝 Row written to memory. It's in the buffer but not yet safe...", "info");
        const newOrder: OrderRecord = { id: orderId, customer: newCustomer, product: newProduct, amount: newAmount, status: "memory" };
        setOrders((prev) => [...prev, newOrder]);
        addLog("INFO", "Row written to memory buffer");
        await smartDelay(STEP_DELAY);
        if (abortRef.current) return;

        addNarratorMessage(2, "⚡ CRASH! Power failure before WAL write!", "error");
        addLog("ERROR", "⚡ SYSTEM CRASH!");
        await smartDelay(STEP_DELAY);
        if (abortRef.current) return;

        addNarratorMessage(3, "❌ ORDER LOST! Memory was cleared. Since we never wrote to WAL, Order #1003 is gone forever.", "error");
        setOrders((prev) => prev.filter((o) => o.id !== orderId));
        addLog("WARN", "Memory cleared. Row NOT in WAL - LOST!");
        addLog("ERROR", "Transaction was NOT durable!");
        setShowRecovery(true);

        setIsRunning(false);
    };

    const runCrashAfterWAL = async () => {
        resetDemo();
        await delay(100);
        abortRef.current = false;
        setIsRunning(true);
        setShowNarrator(true);
        setCrashType("after_wal");

        const orderId = 1003;
        const sql = `INSERT INTO orders VALUES (${orderId}, '${newCustomer}', '${newProduct}', ${newAmount})`;

        addNarratorMessage(0, "🔄 Simulating crash AFTER WAL write. Watch how the database recovers the order!", "warning");
        addLog("INFO", `Executing: ${sql}`);
        await smartDelay(STEP_DELAY);
        if (abortRef.current) return;

        addNarratorMessage(1, "📝 Row written to memory buffer...", "info");
        const newOrder: OrderRecord = { id: orderId, customer: newCustomer, product: newProduct, amount: newAmount, status: "memory" };
        setOrders((prev) => [...prev, newOrder]);
        addLog("INFO", "Row written to memory buffer");
        await smartDelay(STEP_DELAY);
        if (abortRef.current) return;

        addNarratorMessage(2, "📋 INSERT written to WAL! Transaction is COMMITTED. Client received success response.", "success");
        setWalEntries([sql]);
        setOrders((prev) => prev.map((o) => (o.id === orderId ? { ...o, status: "wal" } : o)));
        addLog("SUCCESS", "WAL entry created");
        addLog("SUCCESS", "COMMIT acknowledged to client");
        await smartDelay(STEP_DELAY);
        if (abortRef.current) return;

        addNarratorMessage(3, "⚡ CRASH! Power failure after WAL but before disk write!", "error");
        addLog("ERROR", "⚡ SYSTEM CRASH!");
        setOrders((prev) => prev.map((o) => (o.id === orderId ? { ...o, status: "lost" } : o)));
        addLog("WARN", "Memory cleared. Disk write incomplete...");
        await smartDelay(STEP_DELAY);
        if (abortRef.current) return;

        addNarratorMessage(4, "🔄 System restarting... Database checks WAL for uncommitted changes...", "info");
        addLog("INFO", "Checking WAL for recovery...");
        await smartDelay(STEP_DELAY);
        if (abortRef.current) return;

        addNarratorMessage(5, "📋 WAL entry found! Replaying INSERT to restore Order #1003...", "success");
        addLog("SUCCESS", "WAL entry found! Replaying transaction...");
        setOrders((prev) => prev.map((o) => (o.id === orderId ? { ...o, status: "disk" } : o)));
        await smartDelay(STEP_DELAY);
        if (abortRef.current) return;

        addNarratorMessage(6, "✅ RECOVERY COMPLETE! Order #1003 was restored from WAL. This is the power of durability!", "success");
        setWalEntries([]);
        addLog("SUCCESS", "Recovery complete! Order restored.");
        setShowRecovery(true);
        setNextId(1004);

        setIsRunning(false);
    };

    const getStatusBadge = (status: OrderRecord["status"]) => {
        switch (status) {
            case "memory":
                return <span className="px-2 py-0.5 rounded text-xs font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30">MEMORY</span>;
            case "wal":
                return <span className="px-2 py-0.5 rounded text-xs font-bold bg-blue-500/20 text-blue-400 border border-blue-500/30">WAL</span>;
            case "disk":
                return <span className="px-2 py-0.5 rounded text-xs font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">DISK</span>;
            case "lost":
                return <span className="px-2 py-0.5 rounded text-xs font-bold bg-red-500/20 text-red-400 border border-red-500/30 animate-pulse">LOST</span>;
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
            <Header title="Durability" />
            <div className="flex h-[calc(100vh-64px)]">
                <div className={`flex-1 p-6 lg:p-8 overflow-y-auto transition-all ${showNarrator ? "lg:mr-[400px]" : ""}`}>
                    <div className="max-w-4xl mx-auto flex flex-col gap-6">
                        <header className="pb-6 border-b border-card-border">
                            <h2 className="text-3xl md:text-4xl font-display font-bold text-foreground tracking-tight mb-3">
                                <span className="text-primary">Durability</span> — Forever{" "}
                                <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-emerald-400">Saved</span>
                            </h2>
                            <p className="text-foreground-muted text-base leading-relaxed max-w-2xl">
                                Once committed, data survives crashes, power failures, and system restarts.
                            </p>
                        </header>

                        {/* SQL Input */}
                        <div className="p-4 bg-surface rounded-xl border border-card-border">
                            <div className="flex items-center gap-2 mb-3">
                                <span className="material-symbols-outlined text-primary">code</span>
                                <span className="text-sm font-bold text-foreground">INSERT Statement</span>
                            </div>
                            <div className="grid grid-cols-3 gap-3 mb-3">
                                <div>
                                    <label className="text-xs text-foreground-muted mb-1 block">Customer</label>
                                    <input
                                        type="text"
                                        value={newCustomer}
                                        onChange={(e) => setNewCustomer(e.target.value)}
                                        disabled={isRunning}
                                        className="w-full px-3 py-2 rounded-lg bg-surface-darker border border-card-border text-foreground text-sm"
                                    />
                                </div>
                                <div>
                                    <label className="text-xs text-foreground-muted mb-1 block">Product</label>
                                    <input
                                        type="text"
                                        value={newProduct}
                                        onChange={(e) => setNewProduct(e.target.value)}
                                        disabled={isRunning}
                                        className="w-full px-3 py-2 rounded-lg bg-surface-darker border border-card-border text-foreground text-sm"
                                    />
                                </div>
                                <div>
                                    <label className="text-xs text-foreground-muted mb-1 block">Amount (₹)</label>
                                    <input
                                        type="number"
                                        value={newAmount}
                                        onChange={(e) => setNewAmount(Number(e.target.value))}
                                        disabled={isRunning}
                                        className="w-full px-3 py-2 rounded-lg bg-surface-darker border border-card-border text-foreground text-sm"
                                    />
                                </div>
                            </div>
                            <div className="p-3 bg-[#0d1014] rounded-lg font-mono text-sm text-emerald-400 overflow-x-auto">
                                {getInsertSQL()}
                            </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex flex-wrap gap-2">
                            {!isRunning ? (
                                <>
                                    <button onClick={runNormalWrite} className="px-4 py-2.5 text-sm font-bold text-white bg-primary hover:bg-primary/90 rounded-lg flex items-center gap-2 shadow-sm">
                                        <span className="material-symbols-outlined text-lg">save</span>
                                        Execute Normal
                                    </button>
                                    <button onClick={runCrashBeforeWAL} className="px-4 py-2.5 text-sm font-bold text-red-600 dark:text-red-400 border border-red-500/50 bg-red-500/10 rounded-lg flex items-center gap-1">
                                        <span className="material-symbols-outlined text-lg">flash_on</span>
                                        Crash Before WAL
                                    </button>
                                    <button onClick={runCrashAfterWAL} className="px-4 py-2.5 text-sm font-bold text-amber-600 dark:text-amber-400 border border-amber-500/50 bg-amber-500/10 rounded-lg flex items-center gap-1">
                                        <span className="material-symbols-outlined text-lg">flash_on</span>
                                        Crash After WAL
                                    </button>
                                </>
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

                        {/* Orders Table */}
                        <div className="bg-surface rounded-xl border border-card-border overflow-hidden">
                            <div className="px-4 py-3 bg-surface-darker border-b border-card-border flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <span className="material-symbols-outlined text-primary">table_chart</span>
                                    <span className="text-sm font-bold text-foreground">orders</span>
                                    <span className="text-xs text-foreground-muted">TABLE</span>
                                </div>
                                <button onClick={resetDemo} className="text-xs text-foreground-muted hover:text-foreground">Reset</button>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead>
                                        <tr className="bg-surface-darker text-left text-xs font-bold text-foreground-muted uppercase">
                                            <th className="px-4 py-3 border-b border-card-border">ID</th>
                                            <th className="px-4 py-3 border-b border-card-border">Customer</th>
                                            <th className="px-4 py-3 border-b border-card-border">Product</th>
                                            <th className="px-4 py-3 border-b border-card-border">Amount</th>
                                            <th className="px-4 py-3 border-b border-card-border">Status</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {orders.map((order) => (
                                            <tr key={order.id} className={`border-b border-card-border ${order.status === "lost" ? "bg-red-500/5" : "hover:bg-surface-darker"}`}>
                                                <td className={`px-4 py-3 font-mono text-sm ${order.status === "lost" ? "line-through opacity-50" : ""} text-foreground`}>
                                                    {order.id}
                                                </td>
                                                <td className={`px-4 py-3 text-sm ${order.status === "lost" ? "line-through opacity-50" : ""} text-foreground`}>
                                                    {order.customer}
                                                </td>
                                                <td className={`px-4 py-3 text-sm ${order.status === "lost" ? "line-through opacity-50" : ""} text-foreground`}>
                                                    {order.product}
                                                </td>
                                                <td className={`px-4 py-3 font-mono text-sm ${order.status === "lost" ? "line-through opacity-50" : ""} text-foreground`}>
                                                    ₹{order.amount.toLocaleString()}
                                                </td>
                                                <td className="px-4 py-3">
                                                    {getStatusBadge(order.status)}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {/* WAL */}
                        <div className="bg-blue-500/10 rounded-xl border border-blue-500/30 overflow-hidden">
                            <div className="px-4 py-3 bg-blue-500/20 border-b border-blue-500/30 flex items-center gap-2">
                                <span className="material-symbols-outlined text-blue-400">description</span>
                                <span className="text-sm font-bold text-blue-400">Write-Ahead Log (WAL)</span>
                            </div>
                            <div className="p-4 font-mono text-sm min-h-[60px]">
                                {walEntries.length > 0 ? walEntries.map((e, i) => <div key={i} className="text-blue-300">{e}</div>) : <span className="text-foreground-muted opacity-50">WAL is empty</span>}
                            </div>
                        </div>

                        {/* Result */}
                        {showRecovery && crashType === "after_wal" && (
                            <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center gap-3">
                                <span className="material-symbols-outlined text-2xl text-accent-success">verified</span>
                                <div>
                                    <h4 className="font-bold text-accent-success">Durability Demonstrated!</h4>
                                    <p className="text-sm text-foreground-muted">WAL preserved the committed order through a crash.</p>
                                </div>
                            </div>
                        )}
                        {showRecovery && crashType === "before_wal" && (
                            <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/30 flex items-center gap-3">
                                <span className="material-symbols-outlined text-2xl text-accent-error">error</span>
                                <div>
                                    <h4 className="font-bold text-accent-error">Order Lost!</h4>
                                    <p className="text-sm text-foreground-muted">Crash before WAL = no recovery. That&apos;s why COMMIT waits for WAL!</p>
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
