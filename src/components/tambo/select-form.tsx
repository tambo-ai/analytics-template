"use client";

import { cn } from "@/lib/utils";
import { useTamboComponentState, useTamboStreamStatus } from "@tambo-ai/react";
import * as React from "react";
import { z } from "zod";

const selectionGroupSchema = z.object({
  label: z.string().describe("The label/title for this group of options"),
  options: z.array(z.string()).describe("Array of selectable options"),
});

export const selectFormSchema = z.object({
  title: z.string().optional().describe("Optional title for the form"),
  groups: z
    .array(selectionGroupSchema)
    .describe("Selection groups with labels and options"),
  mode: z
    .enum(["single", "multi"])
    .optional()
    .describe(
      "Selection mode: 'single' for single-select (yes/no style), 'multi' for multi-select. Defaults to 'multi'",
    ),
});

export type SelectFormProps = z.infer<typeof selectFormSchema>;

type Selections = Record<string, string[]>;

const toggleInArray = (arr: string[], item: string) =>
  arr.includes(item) ? arr.filter((x) => x !== item) : [...arr, item];

export const SelectForm = React.forwardRef<HTMLDivElement, SelectFormProps>(
  ({ title = "", groups = [], mode = "multi" }, ref) => {
    const { streamStatus, propStatus } =
      useTamboStreamStatus<SelectFormProps>();
    const [selections, setSelections] = useTamboComponentState<Selections>(
      "selections",
      {},
    );

    const isSingleSelect = mode === "single";

    const toggle = (label: string, option: string) => {
      if (isSingleSelect) {
        // For single-select, only keep the selected option
        setSelections({ ...selections, [label]: [option] });
      } else {
        // For multi-select, toggle the option
        setSelections({
          ...selections,
          [label]: toggleInArray(selections?.[label] ?? [], option),
        });
      }
    };

    const clear = (label?: string) =>
      setSelections(label ? { ...selections, [label]: [] } : {});

    const displayGroups = groups.map((g) => ({
      ...g,
      options: g.options ?? [],
      selected: selections?.[g.label] ?? [],
    }));

    const isStreaming = streamStatus.isStreaming;
    const hasSelections = displayGroups.some((g) => g.selected.length > 0);

    if (streamStatus.isPending) {
      return (
        <div
          ref={ref}
          className="w-full rounded-lg border border-border bg-card p-4"
        >
          <div className="text-sm text-muted-foreground animate-pulse">
            Loading...
          </div>
        </div>
      );
    }

    return (
      <div
        ref={ref}
        className="w-full rounded-lg border border-border bg-card p-4 space-y-4"
      >
        {(title || hasSelections) && (
          <div className="flex items-center justify-between">
            {title && (
              <h3
                className={cn(
                  "text-sm font-medium",
                  propStatus.title?.isStreaming && "animate-pulse",
                )}
              >
                {title}
              </h3>
            )}
            {hasSelections && !isStreaming && (
              <button
                onClick={() => clear()}
                className="text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                Clear all
              </button>
            )}
          </div>
        )}

        {displayGroups.length === 0 && isStreaming && (
          <div className="text-sm text-muted-foreground animate-pulse">
            Loading options...
          </div>
        )}

        {displayGroups.map((group, i) => {
          if (!group.label) return null;

          return (
            <div key={`${group.label}-${i}`} className="space-y-2">
              <div className="flex items-center justify-between">
                <span
                  className={cn(
                    "text-sm font-medium",
                    propStatus.groups?.isStreaming && "animate-pulse",
                  )}
                >
                  {group.label}
                </span>
                {group.selected.length > 0 && !isStreaming && (
                  <button
                    onClick={() => clear(group.label)}
                    className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                  >
                    Clear
                  </button>
                )}
              </div>
              <div className="flex flex-wrap gap-2">
                {group.options.map((option) => {
                  if (!option) return null;
                  const selected = group.selected.includes(option);
                  return (
                    <button
                      key={option}
                      onClick={() => toggle(group.label, option)}
                      disabled={isStreaming}
                      className={cn(
                        "px-3 py-1.5 rounded-md text-sm border transition-all cursor-pointer",
                        "focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1",
                        "disabled:opacity-50 disabled:cursor-not-allowed",
                        selected
                          ? "bg-primary text-primary-foreground border-primary"
                          : "bg-background text-foreground border-border hover:bg-accent hover:border-accent",
                      )}
                    >
                      {option}
                    </button>
                  );
                })}
                {propStatus.groups?.isStreaming && (
                  <span className="px-3 py-1.5 text-sm text-muted-foreground animate-pulse">
                    ...
                  </span>
                )}
              </div>
            </div>
          );
        })}

        {streamStatus.isError && streamStatus.streamError && (
          <div className="pt-3 text-xs text-destructive">
            Error: {streamStatus.streamError.message}
          </div>
        )}
      </div>
    );
  },
);

SelectForm.displayName = "SelectForm";
