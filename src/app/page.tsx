import Link from "next/link";
import { Zap, FileText, Headphones, Send } from "lucide-react";

export default function LandingPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <header className="flex items-center justify-between px-6 py-4 border-b border-border">
        <div className="flex items-center gap-2">
          <Zap className="w-6 h-6 text-accent" />
          <span className="text-xl font-bold">XFeed</span>
        </div>
        <Link
          href="/login"
          className="bg-accent hover:bg-accent-dark text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
        >
          Get Started
        </Link>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center px-6 text-center">
        <div className="max-w-2xl mx-auto space-y-6">
          <div className="inline-flex items-center gap-2 bg-accent/10 text-accent-light px-4 py-1.5 rounded-full text-sm font-medium">
            <Zap className="w-4 h-4" />
            Stop doomscrolling. Start briefing.
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold leading-tight tracking-tight">
            Your X feed,
            <br />
            <span className="text-accent-light">distilled.</span>
          </h1>

          <p className="text-lg text-muted max-w-lg mx-auto">
            XFeed reads your timeline, filters the noise, and delivers what
            matters — as a quick brief or a podcast you can listen to on the go.
          </p>

          <div className="flex flex-col sm:flex-row gap-3 justify-center pt-4">
            <Link
              href="/login"
              className="bg-accent hover:bg-accent-dark text-white px-6 py-3 rounded-lg font-medium transition-colors"
            >
              Start for free
            </Link>
            <a
              href="#features"
              className="bg-card hover:bg-card-hover border border-border text-foreground px-6 py-3 rounded-lg font-medium transition-colors"
            >
              How it works
            </a>
          </div>
        </div>
      </main>

      <section id="features" className="px-6 py-20 border-t border-border">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl font-bold text-center mb-12">
            Everything you need, nothing you don&apos;t.
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-8">
            <FeatureCard
              icon={<FileText className="w-6 h-6" />}
              title="Smart Summaries"
              description="AI-powered briefs that group topics, detect trends, and skip the noise."
            />
            <FeatureCard
              icon={<Headphones className="w-6 h-6" />}
              title="Audio Briefings"
              description="Listen to your feed like a podcast — perfect for commuting or working out."
            />
            <FeatureCard
              icon={<Send className="w-6 h-6" />}
              title="Telegram Delivery"
              description="Get your briefing sent straight to Telegram, on your schedule."
            />
          </div>
        </div>
      </section>

      <footer className="px-6 py-6 border-t border-border text-center text-sm text-muted">
        XFeed — Built to save your time.
      </footer>
    </div>
  );
}

function FeatureCard({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="bg-card border border-border rounded-xl p-6 space-y-3">
      <div className="text-accent-light">{icon}</div>
      <h3 className="font-semibold">{title}</h3>
      <p className="text-sm text-muted">{description}</p>
    </div>
  );
}
