"use client";
export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <div className="p-12">
      <h1 className="text-xl font-semibold">Something went wrong</h1>
      <p className="my-4 text-muted-foreground">
        Please try again. If this continues, check your local database
        configuration.
      </p>
      <button onClick={reset} className="text-blue-500">
        Try again
      </button>
    </div>
  );
}
