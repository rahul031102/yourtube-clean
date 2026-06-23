import { PlaySquare } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function SubscriptionsPage() {
  return (
    <main className="flex-1 flex items-center justify-center min-h-[70vh] p-6">
      <div className="text-center max-w-sm">
        <PlaySquare className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
        <h1 className="text-xl font-semibold mb-2">Subscriptions is coming soon</h1>
        <p className="text-sm text-muted-foreground mb-6">
          We're still building this page. In the meantime, check out videos on the home page.
        </p>
        <Link href="/">
          <Button>Go to Home</Button>
        </Link>
      </div>
    </main>
  );
}