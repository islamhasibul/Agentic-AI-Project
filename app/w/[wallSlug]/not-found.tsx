import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-screen max-w-xl items-center px-6">
      <Card className="w-full text-center">
        <h1 className="text-2xl font-semibold">Wall not found</h1>
        <p className="mt-2 text-ink-600">
          We couldn't find a wall at that URL. Double-check the link or head back home.
        </p>
        <div className="mt-6 flex justify-center">
          <Button asChild variant="accent">
            <Link href="/">Back to Proofly</Link>
          </Button>
        </div>
      </Card>
    </main>
  );
}
