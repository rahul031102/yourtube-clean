"use client";

import Link from "next/link";
import { Button } from "./ui/button";
import { useUser } from "@/lib/AuthContext";

interface UpgradePremiumProps {
  onUpgradeSuccess?: () => void;
}

export default function UpgradePremium({ onUpgradeSuccess }: UpgradePremiumProps) {
  const { user } = useUser();

  if (!user || user.plan === "gold") {
    return null;
  }

  const currentPlanLabel = user.plan === "bronze" ? "Bronze" : user.plan === "silver" ? "Silver" : "Free";

  return (
    <div className="space-y-3 rounded-xl border border-gray-200 bg-gray-50 p-4">
      <div>
        <p className="text-sm font-semibold">Upgrade your plan</p>
        <p className="text-sm text-gray-600">
          Current plan: <strong>{currentPlanLabel}</strong>. Visit the premium page to upgrade.
        </p>
      </div>
      <Link href="/premium">
        <Button className="w-full sm:w-auto">View upgrade plans</Button>
      </Link>
    </div>
  );
}
