"use client";

import { useEffect, useState } from "react";

/** Bottom-left toast. Auto-dismisses after 5 s. Remount (change `key`) to show it again. */
export function Toast({ message }: { message: string }) {
  const [visible, setVisible] = useState(true);
  useEffect(() => {
    const t = setTimeout(() => setVisible(false), 5000);
    return () => clearTimeout(t);
  }, []);
  return (
    <div role="status" aria-live="polite" className="fixed bottom-4 left-4 z-50">
      {visible ? (
        <div className="rounded-[12px] border border-line bg-paper px-4 py-3 text-small text-basalt shadow-pop">
          {message}
        </div>
      ) : null}
    </div>
  );
}
