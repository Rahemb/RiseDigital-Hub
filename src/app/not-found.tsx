import Link from "next/link";
export default function NotFound() {
  return (
    <div className="p-16 text-center">
      <h1 className="text-2xl font-semibold">Record not found</h1>
      <p className="text-muted-foreground my-4">
        This page is unavailable in your current workspace.
      </p>
      <Link href="/" className="text-blue-500">
        Return to dashboard
      </Link>
    </div>
  );
}
