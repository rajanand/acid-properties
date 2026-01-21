import Header from "@/components/Header";
import Link from "next/link";

const acidCards = [
  {
    title: "Atomicity",
    icon: "grain",
    description:
      "All or nothing. Ensures that all operations within a work unit are completed successfully; otherwise, the transaction is aborted.",

    href: "/atomicity",
    buttonText: "Simulate Transaction",
    buttonIcon: "play_arrow",
    primary: true,
  },
  {
    title: "Consistency",
    icon: "rule",
    description:
      "Valid data only. Ensures that the database properly changes states upon a successfully committed transaction, maintaining invariants.",

    href: "/consistency",
    buttonText: "Check Constraints",
    buttonIcon: "fact_check",
    primary: false,
  },
  {
    title: "Isolation",
    icon: "security",
    description:
      "Independent execution. Enables transactions to operate independently of and transparently to each other to prevent concurrency issues.",

    href: "/isolation",
    buttonText: "View Concurrency",
    buttonIcon: "visibility",
    primary: false,
  },
  {
    title: "Durability",
    icon: "hard_drive",
    description:
      "Forever saved. Ensures that the result or effect of a committed transaction persists in case of a system failure or crash.",

    href: "/durability",
    buttonText: "Test Crash Recovery",
    buttonIcon: "bug_report",
    primary: false,
  },
];



export default function Dashboard() {
  return (
    <>
      <Header title="Workbench" />
      <div className="p-8">
        <div className="mx-auto max-w-7xl flex flex-col gap-8">
          {/* Page Heading */}
          <div className="flex flex-col gap-2">
            <h1 className="font-display text-4xl font-black text-foreground tracking-tight">
              ACID Properties
            </h1>
            <p className="text-foreground-muted text-lg">
              Interactive workbench for database transaction properties.
            </p>
          </div>

          {/* What is ACID? - Educational Section */}
          <div className="rounded-2xl bg-gradient-to-r from-primary/10 to-emerald-500/10 border border-primary/20 p-6">
            <h2 className="font-display text-xl font-bold text-foreground mb-3 flex items-center gap-2">
              <span className="material-symbols-outlined text-primary">
                school
              </span>
              What is ACID?
            </h2>
            <p className="text-foreground-muted leading-relaxed">
              <strong className="text-foreground">ACID</strong> stands for{" "}
              <strong className="text-primary">A</strong>tomicity,{" "}
              <strong className="text-primary">C</strong>onsistency,{" "}
              <strong className="text-primary">I</strong>solation, and{" "}
              <strong className="text-primary">D</strong>urability. These are
              the four key properties that guarantee database transactions are
              processed reliably. Think of them as the &quot;rules&quot; that keep your
              data safe when multiple operations happen at once. Click on any
              card below to explore each property with interactive simulations!
            </p>
          </div>


          {/* Main ACID Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-12">
            {acidCards.map((card) => (
              <Link
                key={card.title}
                href={card.href}
                className="group relative flex flex-col justify-between overflow-hidden rounded-2xl bg-card-bg border border-card-border p-8 transition-all hover:border-primary/40 hover:shadow-[0_0_30px_rgba(19,134,124,0.1)]"
              >
                {/* Background glow effect */}
                <div className="absolute -right-12 -top-12 h-40 w-40 rounded-full bg-primary/5 blur-3xl group-hover:bg-primary/10 transition-all duration-500" />

                <div className="flex flex-col gap-6 z-10">
                  <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-surface border border-card-border shadow-inner">
                    <span className="material-symbols-outlined text-foreground text-[32px]">
                      {card.icon}
                    </span>
                  </div>
                  <div>
                    <h3 className="font-display text-2xl font-bold text-foreground mb-2">
                      {card.title}
                    </h3>
                    <p className="text-foreground-muted leading-relaxed">
                      {card.description}
                    </p>
                  </div>
                </div>

                <div className="mt-8 pt-6 border-t border-card-border z-10 flex items-center justify-end">
                  <span
                    className={`flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-bold transition-all active:scale-95 ${card.primary
                      ? "bg-primary text-white shadow-lg shadow-primary/20 group-hover:shadow-primary/40"
                      : "bg-card-bg border border-primary text-primary group-hover:bg-primary group-hover:text-white"
                      }`}
                  >
                    {card.buttonText}
                    <span className="material-symbols-outlined text-[18px]">
                      {card.buttonIcon}
                    </span>
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
