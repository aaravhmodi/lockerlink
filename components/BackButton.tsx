"use client";

import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { useEffect, useState } from "react";

interface BackButtonProps {
  fallback?: string;
  label?: string;
  className?: string;
}

export default function BackButton({
  fallback = "/home",
  label = "Back",
  className,
}: BackButtonProps) {
  const router = useRouter();
  const [canGoBack, setCanGoBack] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      setCanGoBack(window.history.length > 1);
    }
  }, []);

  const handleClick = () => {
    if (canGoBack) {
      router.back();
    } else {
      router.push(fallback);
    }
  };

  const baseClasses =
    "inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-600 shadow-sm transition hover:bg-slate-50 hover:text-slate-900";

  return (
    <button
      type="button"
      onClick={handleClick}
      className={className ? `${baseClasses} ${className}` : baseClasses}
      aria-label={label}
    >
      <ArrowLeft className="h-4 w-4" />
      <span>{label}</span>
    </button>
  );
}

