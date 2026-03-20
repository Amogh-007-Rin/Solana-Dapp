"use client";

import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="mx-auto flex min-h-screen max-w-2xl flex-col items-center justify-center gap-4 px-6 text-center">
      <h2 className="text-2xl font-bold">Something went wrong</h2>
      <p className="text-sm text-gray-600">{error.message}</p>
      <button
        onClick={() => reset()}
        className="rounded-md bg-black px-4 py-2 text-white hover:bg-gray-800"
      >
        Try again
      </button>
    </div>
  );
}
