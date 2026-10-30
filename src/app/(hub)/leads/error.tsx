"use client";
export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <div className="panel p-6 space-y-3">
      <h2>Could not load Lead Finder</h2>
      <p>Check that the local database is available.</p>
      <button className="underline" onClick={reset}>
        Try again
      </button>
    </div>
  );
}
