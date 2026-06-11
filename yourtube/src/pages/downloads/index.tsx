import React from "react";
import DownloadsContent from "@/components/DownloadsContent";

const DownloadsPage = () => {
  return (
    <main className="flex-1 p-6">
      <div className="max-w-4xl">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold">Downloads</h1>
            <p className="text-sm text-gray-600">
              View the videos you've downloaded and re-download them anytime.
            </p>
          </div>
        </div>
        <DownloadsContent />
      </div>
    </main>
  );
};

export default DownloadsPage;
