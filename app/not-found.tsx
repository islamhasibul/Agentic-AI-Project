import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Wordmark } from "@/components/brand/wordmark";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-sand-50">
      <header className="container-wide flex h-16 items-center">
        <Link href="/" className="focus-ring rounded-md">
          <Wordmark />
        </Link>
      </header>
      <main className="container-wide flex flex-col items-center pt-20">
        <h1 className="text-5xl font-semibold tracking-tight">404</h1>
        <p className="mt-4 text-ink-600">This page doesn't exist — or it hasn't been built yet.</p>
        <div className="mt-6">
          <Button asChild variant="accent">
            <Link href="/">Back home</Link>
          </Button>
        </div>
      </main>
    </div>
  );
}
