"use client";

import { useState, useCallback, useRef } from "react";
import Header from "@/components/Header";

type TransactionStep = {
    id: number;
    title: string;
    description: string;
    status: "pending" | "success" | "failed" | "rollback";
};

type LogEntry = {
    time: string;
    level: "INFO" | "SUCCESS" | "CRITICAL" | "WARN";
    message: string;
};

type NarratorMessage = {
    id: number;
    stepIndex: number;
    text: string;
    type: "info" | "success" | "warning" | "error";
};

// Initial balances
const INITIAL_ACCOUNT_A = 500;
const INITIAL_ACCOUNT_B = 200;

// Step delay
const STEP_DELAY = 5000;

export default function AtomicityPage() {
    const [accountA, setAccountA] = useState(INITIAL_ACCOUNT_A);
    const [accountB, setAccountB] = useState(INITIAL_ACCOUNT_B);
    const [transferAmount, setTransferAmount] = useState(100);
    const [isRunning, setIsRunning] = useState(false);
    const [isPaused, setIsPaused] = useState(false);
    const [steps, setSteps] = useState<TransactionStep[]>([
        { id: 1, title: "Begin Transaction", description: "TX_START initiated", status: "pending" },
        { id: 2, title: "Debit Account A", description: "Subtract from Raj", status: "pending" },
        { id: 3, title: "Credit Account B", description: "Add to Anand", status: "pending" },
        { id: 4, title: "Commit Transaction", description: "TX_COMMIT - Save all changes", status: "pending" },
    ]);
    const [logs, setLogs] = useState<LogEntry[]>([]);
    const [tempAccountA, setTempAccountA] = useState(INITIAL_ACCOUNT_A);
    const [tempAccountB, setTempAccountB] = useState(INITIAL_ACCOUNT_B);
    const [narratorMessages, setNarratorMessages] = useState<NarratorMessage[]>([]);
    const [showNarrator, setShowNarrator] = useState(false);
    const [currentStep, setCurrentStep] = useState(0);
    const [simulationType, setSimulationType] = useState<"success" | "crash" | null>(null);
    const [activeMessageId, setActiveMessageId] = useState<number | null>(null);

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
        return id;
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
            if (pauseRef.current) {
                await waitForResume();
            }
            await delay(interval);
            elapsed += interval;
        }
    };

    const resetSimulation = () => {
        abortRef.current = true;
        pauseRef.current = false;
        setSteps([
            { id: 1, title: "Begin Transaction", description: "TX_START initiated", status: "pending" },
            { id: 2, title: "Debit Account A", description: "Subtract from Raj", status: "pending" },
            { id: 3, title: "Credit Account B", description: "Add to Anand", status: "pending" },
            { id: 4, title: "Commit Transaction", description: "TX_COMMIT - Save all changes", status: "pending" },
        ]);
        setLogs([]);
        setAccountA(INITIAL_ACCOUNT_A);
        setAccountB(INITIAL_ACCOUNT_B);
        setTempAccountA(INITIAL_ACCOUNT_A);
        setTempAccountB(INITIAL_ACCOUNT_B);
        setNarratorMessages([]);
        setIsRunning(false);
        setIsPaused(false);
        setCurrentStep(0);
        setSimulationType(null);
        setActiveMessageId(null);
    };

    const togglePause = () => {
        pauseRef.current = !pauseRef.current;
        setIsPaused(!isPaused);
    };

    const replayFromStep = (stepIndex: number) => {
        // Highlight the clicked message
        const msg = narratorMessages.find(m => m.stepIndex === stepIndex);
        if (msg) {
            setActiveMessageId(msg.id);
        }
    };

    const runSuccessSimulation = async () => {
        resetSimulation();
        await delay(100); // Allow state to reset
        abortRef.current = false;
        setIsRunning(true);
        setShowNarrator(true);
        setSimulationType("success");

        const amount = transferAmount;
        const initialSteps: TransactionStep[] = [
            { id: 1, title: "Begin Transaction", description: "TX_START initiated", status: "pending" },
            { id: 2, title: "Debit Account A", description: `Subtract ₹${amount} from Raj`, status: "pending" },
            { id: 3, title: "Credit Account B", description: `Add ₹${amount} to Anand`, status: "pending" },
            { id: 4, title: "Commit Transaction", description: "TX_COMMIT - Save all changes", status: "pending" },
        ];
        setSteps(initialSteps);

        // Step 0: Intro
        setCurrentStep(0);
        addNarratorMessage(0, "👋 Welcome! Let's see how Atomicity works with a bank transfer from Raj to Anand.", "info");
        await smartDelay(STEP_DELAY);
        if (abortRef.current) return;

        // Step 1: Begin
        setCurrentStep(1);
        addNarratorMessage(1, "Starting a new transaction. Think of this as opening a 'safe container' for all our changes.", "info");
        addLog("INFO", `Transaction TX_${Math.floor(Math.random() * 900000) + 100000} initiated.`);
        setSteps((prev) => prev.map((s) => (s.id === 1 ? { ...s, status: "success" } : s)));
        await smartDelay(STEP_DELAY);
        if (abortRef.current) return;

        // Step 2: Debit Raj
        setCurrentStep(2);
        addNarratorMessage(2, `Now we subtract ₹${amount} from Raj's account. Notice his balance changes, but this isn't final yet!`, "info");
        addLog("SUCCESS", "Lock acquired on Account A.");
        setTempAccountA(INITIAL_ACCOUNT_A - amount);
        addLog("SUCCESS", `Balance A decremented by ₹${amount}.`);
        setSteps((prev) => prev.map((s) => (s.id === 2 ? { ...s, status: "success" } : s)));
        await smartDelay(STEP_DELAY);
        if (abortRef.current) return;

        // Step 3: Credit Anand
        setCurrentStep(3);
        addNarratorMessage(3, `Adding ₹${amount} to Anand's account. Both accounts are now updated in our 'safe container'.`, "success");
        addLog("SUCCESS", "Lock acquired on Account B.");
        setTempAccountB(INITIAL_ACCOUNT_B + amount);
        addLog("SUCCESS", `Balance B incremented by ₹${amount}.`);
        setSteps((prev) => prev.map((s) => (s.id === 3 ? { ...s, status: "success" } : s)));
        await smartDelay(STEP_DELAY);
        if (abortRef.current) return;

        // Step 4: Commit
        setCurrentStep(4);
        addNarratorMessage(4, "All steps succeeded! Now we COMMIT — this makes all changes permanent. 💾", "success");
        addLog("SUCCESS", "Transaction committed successfully. All locks released.");
        setSteps((prev) => prev.map((s) => (s.id === 4 ? { ...s, status: "success" } : s)));
        setAccountA(INITIAL_ACCOUNT_A - amount);
        setAccountB(INITIAL_ACCOUNT_B + amount);
        await smartDelay(STEP_DELAY);
        if (abortRef.current) return;

        // Final
        addNarratorMessage(5, "✅ Transfer complete! Both accounts updated atomically — as a single unit. That's Atomicity!", "success");
        setIsRunning(false);
    };

    const runCrashSimulation = async () => {
        resetSimulation();
        await delay(100);
        abortRef.current = false;
        setIsRunning(true);
        setShowNarrator(true);
        setSimulationType("crash");

        const amount = transferAmount;
        const initialSteps: TransactionStep[] = [
            { id: 1, title: "Begin Transaction", description: "TX_START initiated", status: "pending" },
            { id: 2, title: "Debit Account A", description: `Subtract ₹${amount} from Raj`, status: "pending" },
            { id: 3, title: "Credit Account B", description: `Add ₹${amount} to Anand`, status: "pending" },
            { id: 4, title: "Commit Transaction", description: "TX_COMMIT - Save all changes", status: "pending" },
        ];
        setSteps(initialSteps);

        // Step 0: Intro
        setCurrentStep(0);
        addNarratorMessage(0, "👋 Let's see what happens when something goes WRONG during a transfer...", "warning");
        await smartDelay(STEP_DELAY);
        if (abortRef.current) return;

        // Step 1
        setCurrentStep(1);
        addNarratorMessage(1, "Starting the transaction, just like before.", "info");
        addLog("INFO", `Transaction TX_${Math.floor(Math.random() * 900000) + 100000} initiated.`);
        setSteps((prev) => prev.map((s) => (s.id === 1 ? { ...s, status: "success" } : s)));
        await smartDelay(STEP_DELAY);
        if (abortRef.current) return;

        // Step 2
        setCurrentStep(2);
        addNarratorMessage(2, `Subtracting ₹${amount} from Raj... so far so good.`, "info");
        addLog("SUCCESS", "Lock acquired on Account A.");
        setTempAccountA(INITIAL_ACCOUNT_A - amount);
        addLog("SUCCESS", `Balance A decremented by ₹${amount}.`);
        setSteps((prev) => prev.map((s) => (s.id === 2 ? { ...s, status: "success" } : s)));
        await smartDelay(STEP_DELAY);
        if (abortRef.current) return;

        // Step 3 - CRASH!
        setCurrentStep(3);
        addNarratorMessage(3, "⚠️ OH NO! Network failure! We can't reach Anand's account!", "error");
        addLog("CRITICAL", "Write operation to Account B failed (Network Unreachable).");
        setSteps((prev) => prev.map((s) => (s.id === 3 ? { ...s, status: "failed", description: "ERROR: Connection timeout" } : s)));
        await smartDelay(STEP_DELAY);
        if (abortRef.current) return;

        // Rollback announcement
        setCurrentStep(4);
        addNarratorMessage(4, "🔄 This is where ATOMICITY saves us! Since one step failed, we must undo EVERYTHING.", "warning");
        addLog("WARN", "Transaction incomplete. Initiating ROLLBACK sequence.");
        setSteps((prev) => prev.map((s) => (s.id === 4 ? { ...s, title: "Rollback", description: "Reverting all changes...", status: "rollback" } : s)));
        await smartDelay(STEP_DELAY);
        if (abortRef.current) return;

        // Restore
        setCurrentStep(5);
        addNarratorMessage(5, "Restoring Raj's original balance. The money that was 'held' goes back to him.", "info");
        addLog("INFO", "Restoring Account A balance...");
        setTempAccountA(INITIAL_ACCOUNT_A);
        addLog("SUCCESS", "Rollback complete. Database state restored.");
        await smartDelay(STEP_DELAY);
        if (abortRef.current) return;

        // Final
        addNarratorMessage(6, "✅ Rollback complete! No money was lost. Raj still has ₹500, Anand still has ₹200. This is the power of Atomicity — ALL or NOTHING!", "success");
        setIsRunning(false);
    };

    const getStepIcon = (status: TransactionStep["status"]) => {
        switch (status) {
            case "success": return "check";
            case "failed": return "close";
            case "rollback": return "undo";
            default: return "hourglass_empty";
        }
    };

    const getStepStyles = (status: TransactionStep["status"]) => {
        switch (status) {
            case "success": return "border-accent-success bg-[#1c2625] text-accent-success";
            case "failed": return "border-accent-error bg-[#2a1f1f] text-accent-error animate-pulse";
            case "rollback": return "border-accent-warning bg-accent-warning text-slate-900";
            default: return "border-slate-600 bg-surface-darker text-slate-500";
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
            <Header title="Atomicity" />
            <div className="flex h-[calc(100vh-64px)]">
                {/* Main Content */}
                <div className={`flex-1 p-6 lg:p-8 overflow-y-auto transition-all ${showNarrator ? "lg:mr-[400px]" : ""}`}>
                    <div className="max-w-4xl mx-auto flex flex-col gap-6">
                        {/* Page Header */}
                        <header className="pb-6 border-b border-card-border">
                            <h2 className="text-3xl md:text-4xl font-display font-bold text-foreground tracking-tight mb-3">
                                <span className="text-primary">Atomicity</span> — All or{" "}
                                <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-emerald-400">
                                    Nothing
                                </span>
                            </h2>
                            <p className="text-foreground-muted text-base leading-relaxed max-w-2xl">
                                A transaction is a single unit of work. If any part fails, the entire transaction fails, and the database state is left unchanged.
                            </p>
                        </header>

                        {/* Controls */}
                        <div className="flex flex-wrap items-center gap-4 p-4 bg-surface rounded-xl border border-card-border">
                            <div className="flex-1 min-w-[200px]">
                                <label className="text-xs text-foreground-muted mb-2 block">
                                    Transfer Amount: <strong className="text-foreground">₹{transferAmount}</strong>
                                </label>
                                <input
                                    type="range" min="10" max="500" step="10"
                                    value={transferAmount}
                                    onChange={(e) => setTransferAmount(Number(e.target.value))}
                                    disabled={isRunning}
                                    className="w-full accent-primary"
                                />
                            </div>
                            <div className="flex gap-2">
                                {!isRunning ? (
                                    <>
                                        <button
                                            onClick={runSuccessSimulation}
                                            className="px-5 py-2.5 text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-500 rounded-lg flex items-center gap-2 shadow-sm"
                                        >
                                            <span className="material-symbols-outlined text-lg">play_arrow</span>
                                            Success
                                        </button>
                                        <button
                                            onClick={runCrashSimulation}
                                            className="px-5 py-2.5 text-sm font-bold text-amber-600 dark:text-amber-400 border border-amber-500/50 bg-amber-500/10 hover:bg-amber-500/20 rounded-lg flex items-center gap-2"
                                        >
                                            <span className="material-symbols-outlined text-lg">warning</span>
                                            Crash
                                        </button>
                                    </>
                                ) : (
                                    <>
                                        <button
                                            onClick={togglePause}
                                            className={`px-5 py-2.5 text-sm font-bold rounded-lg flex items-center gap-2 ${isPaused
                                                ? "text-white bg-emerald-600 hover:bg-emerald-500 shadow-sm"
                                                : "text-amber-600 dark:text-amber-400 border border-amber-500/50 bg-amber-500/10 hover:bg-amber-500/20"
                                                }`}
                                        >
                                            <span className="material-symbols-outlined text-lg">
                                                {isPaused ? "play_arrow" : "pause"}
                                            </span>
                                            {isPaused ? "Continue" : "Pause"}
                                        </button>
                                        <button
                                            onClick={resetSimulation}
                                            className="px-5 py-2.5 text-sm font-bold text-red-600 dark:text-red-400 border border-red-500/50 bg-red-500/10 hover:bg-red-500/20 rounded-lg flex items-center gap-2"
                                        >
                                            <span className="material-symbols-outlined text-lg">stop</span>
                                            Stop
                                        </button>
                                    </>
                                )}
                            </div>
                        </div>

                        {/* Account Cards */}
                        <div className="grid grid-cols-2 gap-6">
                            <div className="bg-surface rounded-xl p-5 border border-card-border">
                                <div className="flex items-center gap-3 mb-4">
                                    <div className="w-10 h-10 rounded-lg bg-indigo-500/20 flex items-center justify-center text-indigo-400">
                                        <span className="material-symbols-outlined">person</span>
                                    </div>
                                    <div>
                                        <div className="text-xs text-foreground-muted font-bold uppercase">Account A</div>
                                        <div className="text-foreground font-medium">Raj</div>
                                    </div>
                                </div>
                                <div className="flex justify-between items-end">
                                    <div>
                                        <div className="text-xs text-foreground-muted uppercase mb-1">Balance</div>
                                        <div className="text-3xl font-mono font-bold text-foreground">
                                            ₹{isRunning ? tempAccountA.toFixed(2) : accountA.toFixed(2)}
                                        </div>
                                    </div>
                                    {isRunning && steps.some((s) => s.id === 2 && s.status === "success") && (
                                        <div className="text-sm font-bold text-red-400 flex items-center bg-red-400/10 px-3 py-1.5 rounded-lg">
                                            <span className="material-symbols-outlined text-base mr-1">arrow_downward</span>
                                            -₹{transferAmount}
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className={`bg-surface rounded-xl p-5 border border-card-border relative ${isRunning && !steps.some((s) => s.id === 3 && s.status === "success") ? "opacity-60" : ""}`}>
                                <div className="absolute top-1/2 -left-5 -translate-y-1/2 text-foreground-muted">
                                    <span className="material-symbols-outlined text-2xl">arrow_right_alt</span>
                                </div>
                                <div className="flex items-center gap-3 mb-4">
                                    <div className="w-10 h-10 rounded-lg bg-pink-500/20 flex items-center justify-center text-pink-400">
                                        <span className="material-symbols-outlined">person</span>
                                    </div>
                                    <div>
                                        <div className="text-xs text-foreground-muted font-bold uppercase">Account B</div>
                                        <div className="text-foreground font-medium">Anand</div>
                                    </div>
                                </div>
                                <div className="flex justify-between items-end">
                                    <div>
                                        <div className="text-xs text-foreground-muted uppercase mb-1">Balance</div>
                                        <div className="text-3xl font-mono font-bold text-foreground">
                                            ₹{isRunning ? tempAccountB.toFixed(2) : accountB.toFixed(2)}
                                        </div>
                                    </div>
                                    {isRunning && steps.some((s) => s.id === 3 && s.status === "success") && (
                                        <div className="text-sm font-bold text-green-400 flex items-center bg-green-400/10 px-3 py-1.5 rounded-lg">
                                            <span className="material-symbols-outlined text-base mr-1">arrow_upward</span>
                                            +₹{transferAmount}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Transaction Steps */}
                        {steps.length > 0 && (
                            <div className="bg-surface rounded-xl p-5 border border-card-border">
                                <h3 className="text-sm font-bold text-foreground-muted uppercase mb-4">Transaction Steps</h3>
                                <div className="space-y-3">
                                    {steps.map((step) => (
                                        <div key={step.id} className="flex items-center gap-3">
                                            <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center shrink-0 ${getStepStyles(step.status)}`}>
                                                <span className="material-symbols-outlined text-sm">{getStepIcon(step.status)}</span>
                                            </div>
                                            <div className={`flex-1 p-3 rounded-lg border ${step.status === "failed" ? "bg-red-900/10 border-red-500/30" :
                                                step.status === "rollback" ? "bg-amber-500/10 border-amber-500/30" :
                                                    "bg-surface-darker border-card-border"
                                                }`}>
                                                <div className="flex items-center justify-between">
                                                    <h4 className={`text-sm font-bold ${step.status === "failed" ? "text-red-400" :
                                                        step.status === "rollback" ? "text-amber-400" : "text-foreground"
                                                        }`}>{step.title}</h4>
                                                    {step.status === "failed" && (
                                                        <span className="text-xs font-bold bg-red-500/20 text-red-400 px-2 py-0.5 rounded">FAILED</span>
                                                    )}
                                                </div>
                                                <p className="text-xs text-foreground-muted mt-1">{step.description}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* System Logs */}
                        <div className="rounded-xl border border-card-border overflow-hidden bg-surface">
                            <div className="px-4 py-3 bg-surface-darker border-b border-card-border flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <span className="material-symbols-outlined text-foreground-muted text-sm">terminal</span>
                                    <span className="text-xs font-bold text-foreground-muted uppercase">System Logs</span>
                                </div>
                                {logs.length > 0 && (
                                    <button onClick={() => setLogs([])} className="text-xs text-foreground-muted hover:text-foreground">Clear</button>
                                )}
                            </div>
                            <div className="p-4 h-80 overflow-y-auto font-mono text-xs text-foreground space-y-1 scrollbar-hide">
                                {logs.length === 0 ? (
                                    <p className="text-foreground-muted opacity-50">Waiting for simulation...</p>
                                ) : (
                                    logs.map((log, i) => (
                                        <div key={i} className={`flex gap-2 ${log.level === "CRITICAL" ? "bg-red-500/10 -mx-2 px-2 py-0.5 rounded" : ""}`}>
                                            <span className="text-slate-600">[{log.time}]</span>
                                            <span className={
                                                log.level === "INFO" ? "text-blue-400" :
                                                    log.level === "SUCCESS" ? "text-emerald-400" :
                                                        log.level === "CRITICAL" ? "text-red-400" : "text-amber-400"
                                            }>{log.level}:</span>
                                            <span>{log.message}</span>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>


                    </div>
                </div>

                {/* Right Side Narrator Panel */}
                {showNarrator && (
                    <div className="fixed right-0 top-16 bottom-0 w-[400px] bg-surface border-l border-card-border flex flex-col z-30">
                        <div className="p-4 border-b border-card-border flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-primary">
                                    <span className="material-symbols-outlined">smart_toy</span>
                                </div>
                                <div>
                                    <h3 className="font-bold text-foreground">Narrator</h3>
                                    <p className="text-xs text-foreground-muted">Click any message to highlight it</p>
                                </div>
                            </div>
                            <button
                                onClick={() => setShowNarrator(false)}
                                className="w-8 h-8 rounded-full hover:bg-surface-darker flex items-center justify-center text-foreground-muted hover:text-foreground"
                            >
                                <span className="material-symbols-outlined">close</span>
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-4 space-y-3 scrollbar-hide">
                            {narratorMessages.map((msg) => (
                                <button
                                    key={msg.id}
                                    onClick={() => replayFromStep(msg.stepIndex)}
                                    className={`w-full text-left p-4 rounded-lg border-l-4 transition-all ${getNarratorTypeStyles(msg.type)} ${activeMessageId === msg.id ? "ring-2 ring-primary ring-offset-2 ring-offset-surface" : "hover:opacity-80"
                                        }`}
                                >
                                    <p className="text-sm text-foreground leading-relaxed">{msg.text}</p>
                                    <p className="text-xs text-foreground-muted mt-2 flex items-center gap-1">
                                        <span className="material-symbols-outlined text-sm">touch_app</span>
                                        Step {msg.stepIndex}
                                    </p>
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
                                    <span className="material-symbols-outlined text-lg">pause_circle</span>
                                    <span>Paused — Click Continue to resume</span>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </>
    );
}
