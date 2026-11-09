"use client";

// shadcn/ui Select, adapted to the workspace's stone palette.
import * as React from "react";
import { cn } from "cn";
import { CheckIcon, ChevronDownIcon } from "lucide-react";
import * as Primitive from "@radix-ui/react-select";

const SELECT_POSITION = "popper" as const;

function Select(props: React.ComponentProps<typeof Primitive.Root>) {
  return <Primitive.Root data-slot="select" {...props} />;
}

function SelectGroup(props: React.ComponentProps<typeof Primitive.Group>) {
  return <Primitive.Group data-slot="select-group" {...props} />;
}

function SelectValue(props: React.ComponentProps<typeof Primitive.Value>) {
  return <Primitive.Value data-slot="select-value" {...props} />;
}

function SelectTrigger({ className, children, ...props }: React.ComponentProps<typeof Primitive.Trigger>) {
  return <Primitive.Trigger data-slot="select-trigger" className={cn("flex h-9 w-full items-center justify-between gap-2 rounded-md border border-stone-400 bg-white px-3 text-sm text-stone-900 outline-none hover:bg-stone-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-stone-900 disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-red-700", className)} {...props}>
    {children}
    <Primitive.Icon asChild><ChevronDownIcon className="size-4 shrink-0 text-stone-600" aria-hidden={true} /></Primitive.Icon>
  </Primitive.Trigger>;
}

function SelectContent({ className, children, ...props }: React.ComponentProps<typeof Primitive.Content>) {
  return <Primitive.Portal>
    <Primitive.Content data-slot="select-content" position={SELECT_POSITION} sideOffset={4} className={cn("z-[60] max-h-[var(--radix-select-content-available-height)] min-w-[var(--radix-select-trigger-width)] overflow-y-auto rounded-md border border-stone-200 bg-white text-stone-900 shadow-md", className)} {...props}>
      <Primitive.Viewport className="p-1">{children}</Primitive.Viewport>
    </Primitive.Content>
  </Primitive.Portal>;
}

function SelectItem({ className, children, ...props }: React.ComponentProps<typeof Primitive.Item>) {
  return <Primitive.Item data-slot="select-item" className={cn("relative flex cursor-default select-none items-center rounded-sm py-2 pl-3 pr-8 text-sm outline-none focus:bg-stone-100 data-[state=checked]:font-medium data-[disabled]:opacity-50", className)} {...props}>
    <Primitive.ItemText>{children}</Primitive.ItemText>
    <Primitive.ItemIndicator className="absolute right-2"><CheckIcon className="size-4" aria-hidden={true} /></Primitive.ItemIndicator>
  </Primitive.Item>;
}

export { Select, SelectGroup, SelectValue, SelectTrigger, SelectContent, SelectItem };
