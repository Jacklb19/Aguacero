"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Toast } from "@/components/ui/toast";
import { regions } from "@/config/regions";
import { dashboard } from "@/content/copy";
import { saveRegion, type SaveRegionState } from "./actions";

const initial: SaveRegionState = { status: "idle", seq: 0 };

export function RegionForm({ current }: { current?: string | undefined }) {
  const [state, action, pending] = useActionState(saveRegion, initial);
  return (
    <>
      <form action={action} className="flex flex-wrap items-end gap-3">
        <div className="flex flex-col gap-1">
          <label htmlFor="region" className="text-small font-medium text-basalt">
            {dashboard.label}
          </label>
          <select
            id="region"
            name="region"
            defaultValue={current ?? ""}
            required
            className="h-11 min-w-56 rounded-[6px] border border-line-strong bg-paper px-3 text-basalt"
          >
            <option value="" disabled>
              {dashboard.choose}
            </option>
            {regions.map((r) => (
              <option key={r.slug} value={r.slug}>
                {r.name}
              </option>
            ))}
          </select>
        </div>
        <Button type="submit" disabled={pending}>
          {dashboard.save}
        </Button>
      </form>
      {state.status === "error" ? (
        <p role="alert" className="mt-2 text-small text-mora">
          That region is not on the list. Choose one from the menu.
        </p>
      ) : null}
      {state.status === "saved" ? <Toast key={state.seq} message={dashboard.saved} /> : null}
    </>
  );
}
