import SearchResult from "@/components/SearchResult";
import { useRouter } from "next/router";
import React, { Suspense } from "react";

export const getServerSideProps = () => {
  return {
    props: {},
  };
};

const index = () => {
  const router = useRouter();
  const { q } = router.query;
  
  if (!router.isReady) {
    return (
      <div className="flex-1 p-4">
        <div className="max-w-6xl text-center py-12">
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 p-4">
      <div className="max-w-6xl">
        {q && (
          <div className="mb-6">
            <h1 className="text-xl font-medium mb-4">
              Search results for "{q}"
            </h1>
          </div>
        )}
        <Suspense fallback={<div>Loading search results...</div>}>
          <SearchResult query={q || ""} />
        </Suspense>
      </div>
    </div>
  );
};

export default index;
