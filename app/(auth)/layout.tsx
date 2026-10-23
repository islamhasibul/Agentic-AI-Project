import Link from "next/link";
import { Wordmark } from "@/components/brand/wordmark";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-sand-50">
      <header className="container-wide flex h-16 items-center">
        <Link href="/" className="focus-ring rounded-md" aria-label="Proofly home">
          <Wordmark />
        </Link>
      </header>
      <main className="container-wide flex items-center justify-center pb-20 pt-6">
        <div className="w-full max-w-md">{children}</div>
      </main>
    </div>
  );
}
