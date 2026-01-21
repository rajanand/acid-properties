"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

interface NavItem {
    name: string;
    href: string;
    icon: string;
    description: string;
}

const navItems: NavItem[] = [
    {
        name: "Dashboard",
        href: "/",
        icon: "dashboard",
        description: "Overview of all ACID properties",
    },
    {
        name: "Atomicity",
        href: "/atomicity",
        icon: "grain",
        description: "All or nothing transactions",
    },
    {
        name: "Consistency",
        href: "/consistency",
        icon: "rule",
        description: "Valid data states only",
    },
    {
        name: "Isolation",
        href: "/isolation",
        icon: "security",
        description: "Independent transaction execution",
    },
    {
        name: "Durability",
        href: "/durability",
        icon: "hard_drive",
        description: "Permanent data persistence",
    },
];

export default function Sidebar() {
    const pathname = usePathname();

    return (
        <aside className="hidden md:flex flex-col w-72 h-full bg-sidebar-bg border-r border-white/5 shrink-0">
            {/* Logo */}
            <div className="p-6">
                <div className="flex items-center gap-3 mb-8">
                    <div className="flex items-center justify-center w-10 h-10 rounded-full bg-gradient-to-br from-primary to-emerald-900 shadow-lg shadow-primary/20 text-white">
                        <span className="material-symbols-outlined text-xl">database</span>
                    </div>
                    <div>
                        <h1 className="font-display font-bold text-lg leading-tight tracking-tight text-white">
                            ACID Lab
                        </h1>
                        <p className="text-slate-400 text-xs font-medium tracking-wide">
                            Database Simulator
                        </p>
                    </div>
                </div>

                {/* Navigation */}
                <nav className="flex flex-col gap-2">
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3 pl-1">
                        Modules
                    </p>
                    {navItems.map((item) => {
                        const isActive = pathname === item.href;
                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                className={`group flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${isActive
                                        ? "bg-primary/10 border border-primary/20 text-primary"
                                        : "hover:bg-white/5 text-slate-400 hover:text-white border border-transparent"
                                    }`}
                            >
                                <span
                                    className="material-symbols-outlined"
                                    style={isActive ? { fontVariationSettings: "'FILL' 1" } : {}}
                                >
                                    {item.icon}
                                </span>
                                <span
                                    className={`text-sm font-display ${isActive ? "font-bold" : "font-medium"}`}
                                >
                                    {item.name}
                                </span>
                                {isActive && (
                                    <span className="ml-auto w-1.5 h-1.5 rounded-full bg-primary shadow-[0_0_8px_rgba(19,134,124,0.8)]" />
                                )}
                            </Link>
                        );
                    })}
                </nav>
            </div>

            {/* Server Status */}
            <div className="mt-auto p-6 border-t border-white/5">
                <div className="rounded-xl bg-surface-darker p-4 border border-white/5">
                    <div className="flex justify-between items-center mb-2">
                        <span className="text-xs text-slate-400 font-mono">
                            SERVER STATUS
                        </span>
                        <span className="flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-accent-success animate-pulse" />
                            <span className="text-[10px] text-accent-success font-bold">
                                ONLINE
                            </span>
                        </span>
                    </div>
                    <div className="h-1 w-full bg-gray-800 rounded-full overflow-hidden">
                        <div className="h-full bg-primary w-2/3" />
                    </div>
                    <div className="flex justify-between mt-2 text-[10px] text-slate-500 font-mono">
                        <span>LATENCY: 12ms</span>
                        <span>LOAD: 42%</span>
                    </div>
                </div>
            </div>
        </aside>
    );
}
