"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTheme } from "@/context/ThemeContext";

const navItems = [
    { name: "Dashboard", href: "/", icon: "dashboard" },
    { name: "Atomicity", href: "/atomicity", icon: "grain" },
    { name: "Consistency", href: "/consistency", icon: "rule" },
    { name: "Isolation", href: "/isolation", icon: "security" },
    { name: "Durability", href: "/durability", icon: "hard_drive" },
];

export default function Header({ title }: { title: string }) {
    const pathname = usePathname();
    const { theme, toggleTheme } = useTheme();

    return (
        <header className="flex h-16 w-full items-center justify-between border-b border-card-border px-6 bg-background/80 backdrop-blur-md sticky top-0 z-20">
            {/* Logo */}
            <Link href="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
                <div className="flex items-center justify-center w-9 h-9 rounded-full bg-gradient-to-br from-primary to-emerald-600 text-white">
                    <span className="material-symbols-outlined text-lg">database</span>
                </div>
                <h1 className="font-display font-bold text-lg text-foreground tracking-tight hidden sm:block">
                    ACID Lab
                </h1>
            </Link>

            {/* Center Navigation */}
            <nav className="flex items-center gap-1">
                {navItems.map((item) => {
                    const isActive = pathname === item.href;
                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${isActive
                                ? "bg-primary/10 text-primary"
                                : "text-foreground-muted hover:text-foreground hover:bg-surface"
                                }`}
                        >
                            <span
                                className="material-symbols-outlined text-lg"
                                style={isActive ? { fontVariationSettings: "'FILL' 1" } : {}}
                            >
                                {item.icon}
                            </span>
                            <span className="hidden md:inline">{item.name}</span>
                        </Link>
                    );
                })}
            </nav>

            {/* Theme Toggle */}
            <button
                onClick={toggleTheme}
                title={theme === "dark" ? "Switch to Light Mode" : "Switch to Dark Mode"}
                className="flex h-10 w-10 items-center justify-center rounded-full bg-surface border border-card-border hover:border-primary/30 text-foreground-muted hover:text-primary transition-colors"
            >
                <span className="material-symbols-outlined text-xl">
                    {theme === "dark" ? "light_mode" : "dark_mode"}
                </span>
            </button>
        </header>
    );
}
