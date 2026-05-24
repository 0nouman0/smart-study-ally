import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Kinetic — Study smarter, not longer" },
      {
        name: "description",
        content:
          "An AI study companion for students: tutor, planner, focus timer, and flashcards in one editorial-grade app.",
      },
    ],
  }),
  component: Landing,
});

const MODULES = [
  {
    n: "01",
    title: "AI Tutor",
    desc: "Ask anything. Get explanations, summaries, and exam strategy.",
  },
  { n: "02", title: "Smart Planner", desc: "Tasks, deadlines, and AI-suggested order." },
  { n: "03", title: "Focus Sessions", desc: "Pomodoro timer with streaks and XP rewards." },
  { n: "04", title: "Flashcards", desc: "Spaced repetition that respects your time." },
];

function Landing() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <nav className="sticky top-0 z-50 bg-background/80 backdrop-blur-md border-b border-foreground/5 px-6 py-4 flex justify-between items-center">
        <div className="flex items-center gap-2">
          <div className="size-6 bg-primary rounded-sm" />
          <span className="font-bold tracking-tight text-lg">KINETIC</span>
        </div>
        <Link
          to="/login"
          className="rounded-full bg-foreground px-4 py-2 text-xs font-bold uppercase tracking-widest text-background"
        >
          Sign in
        </Link>
      </nav>

      <main className="max-w-3xl mx-auto px-6 py-16 md:py-24">
        <section className="animate-reveal">
          <p className="font-mono text-[11px] uppercase tracking-[0.25em] text-muted">
            Study OS · v1
          </p>
          <h1 className="mt-4 text-5xl md:text-7xl font-extrabold tracking-tighter leading-[0.95]">
            Study smarter.
            <br />
            <span className="text-primary">Stress less.</span>
          </h1>
          <p className="mt-6 text-lg text-muted max-w-[52ch] text-pretty">
            A focused study companion built for students who actually care about their grades. AI
            tutor, planner, Pomodoro timer, and spaced-repetition flashcards — all in one place.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              to="/login"
              className="rounded-full bg-primary px-6 py-3 text-sm font-bold uppercase tracking-widest text-primary-foreground"
            >
              Start free
            </Link>
            <a
              href="#modules"
              className="rounded-full border border-foreground/10 px-6 py-3 text-sm font-bold uppercase tracking-widest"
            >
              See modules
            </a>
          </div>
        </section>

        <section
          id="modules"
          className="mt-24 grid grid-cols-1 md:grid-cols-2 gap-3 animate-reveal [animation-delay:120ms]"
        >
          {MODULES.map((m) => (
            <div key={m.n} className="bg-accent p-6 rounded-2xl flex flex-col gap-4 aspect-[4/3]">
              <span className="font-mono text-[10px] uppercase tracking-widest text-muted">
                Module {m.n}
              </span>
              <h3 className="text-2xl font-bold leading-tight mt-auto">{m.title}</h3>
              <p className="text-sm text-muted text-pretty">{m.desc}</p>
            </div>
          ))}
        </section>

        <section className="mt-24 bg-foreground text-background p-8 md:p-12 rounded-3xl animate-fade">
          <p className="font-mono text-[10px] uppercase tracking-[0.25em] opacity-60">
            The discipline
          </p>
          <h2 className="mt-3 text-3xl md:text-4xl font-extrabold tracking-tighter">
            Every feature earns its place. If it doesn't save time, reduce anxiety, or improve
            retention — it's cut.
          </h2>
          <Link
            to="/login"
            className="mt-8 inline-flex rounded-full bg-primary px-6 py-3 text-sm font-bold uppercase tracking-widest text-primary-foreground"
          >
            Join free →
          </Link>
        </section>

        <footer className="mt-24 pb-12 flex justify-between items-center text-xs font-mono uppercase tracking-widest text-muted">
          <span>© Kinetic 2026</span>
          <span>Made for students</span>
        </footer>
      </main>
    </div>
  );
}
