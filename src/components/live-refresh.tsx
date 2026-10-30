"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
export function LiveRefresh() {
  const router = useRouter();
  useEffect(() => {
    const refresh = () => {
      if (
        document.visibilityState === "visible" &&
        !["INPUT", "TEXTAREA", "SELECT"].includes(
          document.activeElement?.tagName ?? "",
        )
      )
        router.refresh();
    };
    const timer = setInterval(refresh, 30000);
    window.addEventListener("focus", refresh);
    return () => {
      clearInterval(timer);
      window.removeEventListener("focus", refresh);
    };
  }, [router]);
  return null;
}
