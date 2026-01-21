"use client";

import { useState, useCallback, useRef } from "react";
import Header from "@/components/Header";

type ConstraintRule = {
    id: number;
    name: string;
    description: string;
    check: (value: number, balance: number) => boolean;
    errorMessage: string;
};

type ValidationResult = {
    ruleId: number;
    passed: boolean;
    message: string;
};

type LogEntry = {
    time: string;
    level: "INFO" | "SUCCESS" | "ERROR" | "WARN";
    message: string;
};

type NarratorMessage = {
    id: number;
    stepIndex: number;
    text: string;
    type: "info" | "success" | "warning" | "error";
};

const INITIAL_BALANCE = 1000;
const STEP_DELAY = 5000;

export default function ConsistencyPage() {
    const [balance, setBalance] = useState(INITIAL_BALANCE);
    const [isValidating, setIsValidating] = useState(false);
    const [isPaused, setIsPaused] = useState(false);
    const [validationResults, setValidationResults] = useState<ValidationResult[]>([]);
    const [logs, setLogs] = useState<LogEntry[]>([]);
    const [transactionStatus, setTransactionStatus] = useState<"idle" | "success" | "failed">("idle");
    const [narratorMessages, setNarratorMessages] = useState<NarratorMessage[]>([]);
    const [showNarrator, setShowNarrator] = useState(false);
    const [activeMessageId, setActiveMessageId] = useState<number | null>(null);

    const pauseRef = useRef(false);
    const abortRef = useRef(false);

    const constraints: ConstraintRule[] = [
        { id: 1, name: "Non-Negative Balance", description: "Account balance cannot go below zero", check: (amount, bal) => bal - amount >= 0, errorMessage: "Insufficient funds" },
        { id: 2, name: "Minimum Balance", description: "Must maintain ₹50 minimum", check: (amount, bal) => bal - amount >= 50, errorMessage: "Minimum balance ₹50 required" },
        { id: 3, name: "Daily Limit", description: "Max ₹500 per withdrawal", check: (amount) => amount <= 500, errorMessage: "Exceeds ₹500 daily limit" },
        { id: 4, name: "Valid Amount", description: "Amount must be positive", check: (amount) => amount > 0, errorMessage: "Invalid amount" },
    ];

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
        setBalance(INITIAL_BALANCE);
        setValidationResults([]);
        setLogs([]);
        setTransactionStatus("idle");
        setNarratorMessages([]);
        setIsValidating(false);
        setIsPaused(false);
        setActiveMessageId(null);
    };

    const togglePause = () => {
        pauseRef.current = !pauseRef.current;
        setIsPaused(!isPaused);
    };

    const validateTransaction = async (amount: number, isValid: boolean) => {
        resetDemo();
        await delay(100);
        abortRef.current = false;
        setIsValidating(true);
        setShowNarrator(true);

        addNarratorMessage(0, `👋 Let's validate a withdrawal of ₹${amount}. The database will check each constraint.`, "info");
        addLog("INFO", `Validating withdrawal: ₹${amount}`);
        await smartDelay(STEP_DELAY);
        if (abortRef.current) return;

        let allPassed = true;
        const results: ValidationResult[] = [];

        for (let i = 0; i < constraints.length; i++) {
            if (abortRef.current) return;
            const constraint = constraints[i];
            const passed = constraint.check(amount, INITIAL_BALANCE);

            if (passed) {
                addNarratorMessage(i + 1, `✅ Checking "${constraint.name}"... ${constraint.description}. PASSED!`, "success");
                addLog("SUCCESS", `"${constraint.name}" passed`);
            } else {
                addNarratorMessage(i + 1, `❌ Checking "${constraint.name}"... VIOLATION! ${constraint.errorMessage}.`, "error");
                addLog("ERROR", `"${constraint.name}" violated: ${constraint.errorMessage}`);
                allPassed = false;
            }

            results.push({ ruleId: constraint.id, passed, message: passed ? "OK" : constraint.errorMessage });
            setValidationResults([...results]);
            await smartDelay(STEP_DELAY);
        }

        if (abortRef.current) return;

        if (allPassed) {
            addNarratorMessage(5, "✅ All constraints passed! The database allows this withdrawal and updates the balance.", "success");
            addLog("SUCCESS", "Transaction approved");
            setTransactionStatus("success");
            setBalance(INITIAL_BALANCE - amount);
        } else {
            addNarratorMessage(5, "❌ Transaction REJECTED! Constraints protect the database from invalid states. Balance unchanged.", "error");
            addLog("WARN", "Transaction rejected");
            setTransactionStatus("failed");
        }

        setIsValidating(false);
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
            <Header title="Consistency" />
            <div className="flex h-[calc(100vh-64px)]">
                <div className={`flex-1 p-6 lg:p-8 overflow-y-auto transition-all ${showNarrator ? "lg:mr-[400px]" : ""}`}>
                    <div className="max-w-4xl mx-auto flex flex-col gap-6">
                        <header className="pb-6 border-b border-card-border">
                            <h2 className="text-3xl md:text-4xl font-display font-bold text-foreground tracking-tight mb-3">
                                <span className="text-primary">Consistency</span> — Valid States{" "}
                                <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-emerald-400">Only</span>
                            </h2>
                            <p className="text-foreground-muted text-base leading-relaxed max-w-2xl">
                                Every transaction must bring the database from one valid state to another. Constraints ensure data integrity.
                            </p>
                        </header>

                        {/* Controls */}
                        <div className="flex flex-wrap items-center gap-4 p-4 bg-surface rounded-xl border border-card-border">
                            <div className="flex gap-2">
                                {!isValidating ? (
                                    <>
                                        <button onClick={() => validateTransaction(200, true)} className="px-5 py-2.5 text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-500 rounded-lg flex items-center gap-2 shadow-sm">
                                            <span className="material-symbols-outlined text-lg">check_circle</span>
                                            Valid (₹200)
                                        </button>
                                        <button onClick={() => validateTransaction(1100, false)} className="px-5 py-2.5 text-sm font-bold text-red-600 dark:text-red-400 border border-red-500/50 bg-red-500/10 hover:bg-red-500/20 rounded-lg flex items-center gap-2">
                                            <span className="material-symbols-outlined text-lg">cancel</span>
                                            Invalid (₹1100)
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
                        </div>

                        {/* Account */}
                        <div className="bg-surface rounded-xl p-6 border border-card-border">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                    <div className="w-14 h-14 rounded-full bg-primary/20 flex items-center justify-center text-primary">
                                        <span className="material-symbols-outlined text-3xl">account_balance</span>
                                    </div>
                                    <div>
                                        <h4 className="text-foreground font-bold text-lg">Savings Account</h4>
                                        <p className="text-foreground-muted text-sm">Harsha's Account #4532-7891</p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className="text-xs text-foreground-muted uppercase">Balance</p>
                                    <p className="text-4xl font-mono font-bold text-foreground">₹{balance.toFixed(2)}</p>
                                </div>
                            </div>
                        </div>

                        {/* Constraints */}
                        <div className="bg-surface rounded-xl p-5 border border-card-border">
                            <h3 className="text-sm font-bold text-foreground-muted uppercase mb-4">Database Constraints</h3>
                            <div className="space-y-3">
                                {constraints.map((c) => {
                                    const result = validationResults.find((r) => r.ruleId === c.id);
                                    return (
                                        <div key={c.id} className={`p-3 rounded-lg border transition-all ${result ? (result.passed ? "bg-emerald-500/10 border-emerald-500/30" : "bg-red-500/10 border-red-500/30") : "bg-surface-darker border-card-border"}`}>
                                            <div className="flex items-center gap-2">
                                                <span className={`material-symbols-outlined ${result ? (result.passed ? "text-accent-success" : "text-accent-error") : "text-foreground-muted"}`}>
                                                    {result ? (result.passed ? "check_circle" : "cancel") : "pending"}
                                                </span>
                                                <span className="font-bold text-sm text-foreground">{c.name}</span>
                                            </div>
                                            <p className="text-xs text-foreground-muted mt-1 ml-7">{c.description}</p>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Result */}
                        {transactionStatus !== "idle" && (
                            <div className={`p-4 rounded-xl border ${transactionStatus === "success" ? "bg-emerald-500/10 border-emerald-500/30" : "bg-red-500/10 border-red-500/30"}`}>
                                <div className="flex items-center gap-3">
                                    <span className={`material-symbols-outlined text-2xl ${transactionStatus === "success" ? "text-accent-success" : "text-accent-error"}`}>
                                        {transactionStatus === "success" ? "check_circle" : "error"}
                                    </span>
                                    <div>
                                        <h4 className={`font-bold ${transactionStatus === "success" ? "text-accent-success" : "text-accent-error"}`}>
                                            {transactionStatus === "success" ? "Transaction Approved" : "Transaction Rejected"}
                                        </h4>
                                        <p className="text-foreground-muted text-sm">
                                            {transactionStatus === "success" ? "Balance updated." : "Balance unchanged."}
                                        </p>
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
                                        <span className={log.level === "INFO" ? "text-blue-400" : log.level === "SUCCESS" ? "text-emerald-400" : log.level === "ERROR" ? "text-red-400" : "text-amber-400"}>{log.level}:</span>
                                        <span>{log.message}</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {!isValidating && transactionStatus === "idle" && (
                            <div className="flex flex-col items-center justify-center py-12 text-foreground-muted">
                                <span className="material-symbols-outlined text-5xl mb-4 opacity-30">fact_check</span>
                                <p className="text-center">Click <strong className="text-emerald-400">Valid</strong> or <strong className="text-red-400">Invalid</strong> to test constraints.</p>
                            </div>
                        )}
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
                            {isValidating && !isPaused && (
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
