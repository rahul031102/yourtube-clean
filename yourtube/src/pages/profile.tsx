import React from "react";
import { useUser } from "@/lib/AuthContext";
import DownloadsContent from "@/components/DownloadsContent";
import UpgradePremium from "@/components/UpgradePremium";

const Profile = () => {
  const { user } = useUser();

  return (
    <main className="flex-1 p-6">
      <div className="max-w-4xl space-y-6">
        <div className="rounded-2xl border bg-white p-6 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold">Profile</h1>
              <p className="text-sm text-gray-600 mt-1">
                Manage your plan and access downloaded videos from one place.
              </p>
            </div>
            <div className="space-y-1 text-right">
              <p className="text-sm text-gray-500">Current plan</p>
              <p className="text-lg font-semibold text-blue-600">
                {user?.plan === "gold"
                  ? "Gold"
                  : user?.plan === "silver"
                  ? "Silver"
                  : user?.plan === "bronze"
                  ? "Bronze"
                  : "Free"}
              </p>
              {user?.plan !== "gold" && (
                <div className="mt-3">
                  <UpgradePremium />
                </div>
              )}
            </div>
          </div>
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <div className="rounded-xl border bg-gray-50 p-4">
              <p className="text-sm text-gray-500">Name</p>
              <p className="mt-1 font-medium">{user?.name || "Not available"}</p>
            </div>
            <div className="rounded-xl border bg-gray-50 p-4">
              <p className="text-sm text-gray-500">Email</p>
              <p className="mt-1 font-medium">{user?.email || "Not available"}</p>
            </div>
          </div>
        </div>

        <section className="rounded-2xl border bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-6">
            <div>
              <h2 className="text-2xl font-semibold">Downloads</h2>
              <p className="text-sm text-gray-600">
                Videos you downloaded are recorded here for quick access.
              </p>
            </div>
            <div>
              <a
                href="/downloads"
                className="inline-flex items-center rounded-full border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Go to downloads page
              </a>
            </div>
          </div>
          <DownloadsContent />
        </section>
      </div>
    </main>
  );
};

export default Profile;
