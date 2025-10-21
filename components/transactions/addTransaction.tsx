"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";

import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { TxItem } from "@/lib/middleware/transactions";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { CalendarIcon } from "lucide-react";

const TX_TYPES = ["INCOME", "EXPENSE", "TRANSFER"] as const;
type TxType = (typeof TX_TYPES)[number];

const FormSchema = z
  .object({
    type: z.enum(TX_TYPES),
    amount: z
      .string()
      .trim()
      .min(1, "Enter an amount")
      .refine(
        (value) => !Number.isNaN(Number(value)) && Number(value) > 0,
        "Amount must be greater than zero"
      ),
    categoryId: z.string().trim().optional(),
    note: z
      .string()
      .trim()
      .max(500, "Note must be 500 characters or less")
      .optional(),
    date: z
      .string()
      .min(1, "Select a date")
      .refine(
        (value) => !Number.isNaN(Date.parse(value)),
        "Select a valid date"
      ),
  })
  .superRefine((values, ctx) => {
    const needsCategory = values.type !== "TRANSFER";
    if (needsCategory && !values.categoryId?.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Select a category",
        path: ["categoryId"],
      });
    }
  });

type FormValues = z.infer<typeof FormSchema>;

type CategoryOption = {
  id: string;
  name: string;
  entryType: Extract<TxType, "INCOME" | "EXPENSE">;
};

type AddTransactionProps = {
  jarId: string;
  onCreated?: (tx: TxItem) => void;
};

const inputLikeClass =
  "border-input selection:bg-primary selection:text-primary-foreground focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]" +
  " aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive flex h-9 w-full rounded-md border bg-background" +
  " px-3 text-sm shadow-xs outline-none transition disabled:cursor-not-allowed disabled:opacity-50";

export default function AddTransaction({
  jarId,
  onCreated,
}: AddTransactionProps) {
  const [open, setOpen] = React.useState(false);
  const [categoryOptions, setCategoryOptions] = React.useState<
    CategoryOption[]
  >([]);
  const [loadingCategories, setLoadingCategories] = React.useState(false);
  const [submitting, setSubmitting] = React.useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(FormSchema),
    defaultValues: {
      type: "EXPENSE",
      amount: "",
      date: formatDateForInput(new Date()),
    },
    mode: "onSubmit",
    reValidateMode: "onChange",
  });

  const watchType = form.watch("type");

  React.useEffect(() => {
    if (!open) {
      return;
    }

    if (watchType === "TRANSFER") {
      form.setValue("categoryId", undefined, { shouldValidate: false });
      setCategoryOptions([]);
      return;
    }

    let isActive = true;
    const controller = new AbortController();

    setLoadingCategories(true);
    fetch(`/api/jars/${jarId}/categories?entryType=${watchType}`, {
      method: "GET",
      signal: controller.signal,
    })
      .then(async (res) => {
        if (!res.ok) {
          const errorBody = await safeJson(res);
          const message =
            typeof errorBody?.message === "string"
              ? errorBody.message
              : "Unable to load categories.";
          throw new Error(message);
        }
        const data = (await res.json()) as CategoryOption[];
        if (!isActive) return;
        setCategoryOptions(data);
      })
      .catch((err) => {
        if (!isAbortError(err)) {
          console.error(err);
          toast.error("Failed to load categories", {
            description: err instanceof Error ? err.message : undefined,
          });
        }
        if (isActive) {
          setCategoryOptions([]);
        }
      })
      .finally(() => {
        if (isActive) {
          setLoadingCategories(false);
        }
      });

    return () => {
      isActive = false;
      controller.abort();
    };
  }, [jarId, watchType, open, form]);

  const handleSubmit = form.handleSubmit(async (values) => {
    setSubmitting(true);
    try {
      const payload = {
        type: values.type,
        amount: Number(values.amount),
        date: new Date(values.date).toISOString(),
        categoryId: values.categoryId?.trim() || undefined,
        note: values.note?.trim() || undefined,
      };

      const response = await fetch(`/api/jars/${jarId}/transactions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorBody = await safeJson(response);
        const description =
          typeof errorBody?.message === "string"
            ? errorBody.message
            : "The transaction could not be saved.";
        toast.error("Unable to add transaction", { description });
        return;
      }

      const raw = await response.json();
      const normalized = normalizeTransaction(raw);
      toast.success("Transaction added");
      onCreated?.(normalized);

      setOpen(false);
      form.reset({
        type: "EXPENSE",
        amount: "",
        date: formatDateForInput(new Date()),
      });
      setCategoryOptions([]);
    } catch (error) {
      console.error(error);
      toast.error("Something went wrong", {
        description:
          error instanceof Error ? error.message : "Please try again later.",
      });
    } finally {
      setSubmitting(false);
    }
  });

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) {
          form.reset({
            type: "EXPENSE",
            amount: "",
            date: formatDateForInput(new Date()),
          });
          setCategoryOptions([]);
        }
      }}
    >
      <DialogTrigger asChild>
        <Button size="sm">+</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add transaction</DialogTitle>
          <DialogDescription>
            Create a new transaction record for this jar.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Type</FormLabel>
                    <Select
                      value={field.value}
                      onValueChange={(value) => field.onChange(value as TxType)}
                    >
                      <FormControl>
                        <SelectTrigger className="w-full justify-between">
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent className="w-[var(--radix-select-trigger-width)]">
                        {TX_TYPES.map((option) => (
                          <SelectItem key={option} value={option}>
                            {capitalize(option.toLowerCase())}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="amount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Amount</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        inputMode="decimal"
                        min="0"
                        step="0.01"
                        placeholder="0.00"
                        value={field.value}
                        onChange={(event) => field.onChange(event.target.value)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="categoryId"
              render={({ field }) => {
                const disabled = watchType === "TRANSFER";
                const placeholder = disabled
                  ? "Transfers do not use categories"
                  : loadingCategories
                  ? "Loading categories..."
                  : categoryOptions.length
                  ? "Select a category"
                  : "No categories available";
                const value = disabled ? undefined : field.value ?? undefined;
                return (
                  <FormItem>
                    <FormLabel>Category</FormLabel>
                    <Select
                      value={value}
                      onValueChange={(next) =>
                        field.onChange(next || undefined)
                      }
                      disabled={disabled || loadingCategories}
                    >
                      <FormControl>
                        <SelectTrigger className="w-full justify-between">
                          <SelectValue placeholder={placeholder} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent className="w-[var(--radix-select-trigger-width)]">
                        {categoryOptions.length ? (
                          categoryOptions.map((category) => (
                            <SelectItem key={category.id} value={category.id}>
                              {category.name}
                            </SelectItem>
                          ))
                        ) : (
                          <SelectItem value="__empty" disabled>
                            No categories available
                          </SelectItem>
                        )}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                );
              }}
            />

            <FormField
              control={form.control}
              name="date"
              render={({ field }) => {
                const selectedDate = parseInputDate(field.value);
                return (
                  <FormItem className="flex flex-col">
                    <FormLabel>Date</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant="outline"
                            className={cn(
                              "w-full justify-start text-left font-normal",
                              !selectedDate && "text-muted-foreground"
                            )}
                          >
                            <CalendarIcon className="mr-2 size-4" />
                            {selectedDate
                              ? formatDisplayDate(selectedDate)
                              : "Pick a date"}
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent
                        className="w-auto p-0 overflow-hidden"
                        align="start"
                      >
                        <Calendar
                          mode="single"
                          selected={selectedDate ?? undefined}
                          onSelect={(date) => {
                            if (!date) {
                              field.onChange("");
                              return;
                            }
                            field.onChange(formatDateForInput(date));
                          }}
                          autoFocus
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                );
              }}
            />

            <FormField
              control={form.control}
              name="note"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Note</FormLabel>
                  <FormControl>
                    <textarea
                      rows={3}
                      className={cn(
                        inputLikeClass,
                        "min-h-[96px] resize-y py-2 leading-relaxed"
                      )}
                      placeholder="Optional details..."
                      value={field.value ?? ""}
                      onChange={(event) =>
                        field.onChange(event.target.value || undefined)
                      }
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter className="pt-2">
              <DialogClose asChild>
                <Button type="button" variant="outline" disabled={submitting}>
                  Cancel
                </Button>
              </DialogClose>
              <Button type="submit" disabled={submitting}>
                {submitting ? "Saving..." : "Save transaction"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

function formatDateForInput(date: Date) {
  const tzOffsetMs = date.getTimezoneOffset() * 60_000;
  const local = new Date(date.getTime() - tzOffsetMs);
  return local.toISOString().slice(0, 10);
}

function parseInputDate(value?: string | null) {
  if (!value) return null;
  const parts = value.split("-");
  if (parts.length !== 3) return null;
  const [yearStr, monthStr, dayStr] = parts;
  const year = Number(yearStr);
  const month = Number(monthStr);
  const day = Number(dayStr);
  if (
    !Number.isFinite(year) ||
    !Number.isFinite(month) ||
    !Number.isFinite(day) ||
    month < 1 ||
    month > 12 ||
    day < 1 ||
    day > 31
  ) {
    return null;
  }
  const date = new Date(year, month - 1, day);
  return Number.isNaN(date.getTime()) ? null : date;
}

function formatDisplayDate(value?: string | Date | null) {
  const date = value instanceof Date ? value : parseInputDate(value);
  if (!date) return "";
  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(
    date
  );
}

async function safeJson(response: Response) {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

function normalizeTransaction(input: any): TxItem {
  const fallbackId =
    typeof input?.id === "string"
      ? input.id
      : globalThis.crypto?.randomUUID?.() ?? `temp-${Date.now()}`;
  return {
    id: String(fallbackId),
    date:
      typeof input?.date === "string" ? input.date : new Date().toISOString(),
    amount: Number(input?.amount ?? 0),
    type: (input?.type ?? "EXPENSE") as TxItem["type"],
    currency: input?.currency ?? null,
    note: input?.note ?? null,
    category: input?.Category
      ? { name: input.Category?.name ?? null }
      : input?.category ?? null,
  };
}

function isAbortError(error: unknown): boolean {
  return error instanceof Error && error.name === "AbortError";
}

function capitalize(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}
