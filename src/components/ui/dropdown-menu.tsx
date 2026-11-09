"use client";

// shadcn/ui DropdownMenu, adapted to the workspace's stone palette.
import * as React from "react";
import { cn } from "cn";
import { CheckIcon } from "lucide-react";
import * as Primitive from "@radix-ui/react-dropdown-menu";

function DropdownMenu(props: React.ComponentProps<typeof Primitive.Root>) {
  return <Primitive.Root data-slot="dropdown-menu" {...props} />;
}

function DropdownMenuTrigger(props: React.ComponentProps<typeof Primitive.Trigger>) {
  return <Primitive.Trigger data-slot="dropdown-menu-trigger" {...props} />;
}

function DropdownMenuContent({ className, children, ...props }: React.ComponentProps<typeof Primitive.Content>) {
  return <Primitive.Portal>
    <Primitive.Content data-slot="dropdown-menu-content" sideOffset={4} className={cn("z-50 min-w-40 rounded-md border border-stone-200 bg-white p-1 text-stone-900 shadow-md", className)} {...props}>
      {children}
    </Primitive.Content>
  </Primitive.Portal>;
}

function DropdownMenuGroup(props: React.ComponentProps<typeof Primitive.Group>) {
  return <Primitive.Group data-slot="dropdown-menu-group" {...props} />;
}

function DropdownMenuRadioGroup(props: React.ComponentProps<typeof Primitive.RadioGroup>) {
  return <Primitive.RadioGroup data-slot="dropdown-menu-radio-group" {...props} />;
}

function DropdownMenuRadioItem({ className, children, ...props }: React.ComponentProps<typeof Primitive.RadioItem>) {
  return <Primitive.RadioItem data-slot="dropdown-menu-radio-item" className={cn("relative flex cursor-default select-none items-center gap-2 rounded-sm py-2 pl-3 pr-8 text-sm outline-none focus:bg-stone-100", className)} {...props}>
    {children}
    <Primitive.ItemIndicator className="absolute right-2"><CheckIcon className="size-4" aria-hidden={true} /></Primitive.ItemIndicator>
  </Primitive.RadioItem>;
}

export { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuGroup, DropdownMenuRadioGroup, DropdownMenuRadioItem };
