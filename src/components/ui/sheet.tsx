"use client";

// shadcn/ui Sheet, adapted to this app's light stone palette and localized close control.
import * as React from "react";
import { cn } from "cn";
import * as SheetPrimitive from "@radix-ui/react-dialog";

function Sheet(props: React.ComponentProps<typeof SheetPrimitive.Root>) {
  return <SheetPrimitive.Root data-slot="sheet" {...props} />;
}

function SheetClose(props: React.ComponentProps<typeof SheetPrimitive.Close>) {
  return <SheetPrimitive.Close data-slot="sheet-close" {...props} />;
}

function SheetContent({ className, children, ...props }: React.ComponentProps<typeof SheetPrimitive.Content>) {
  return (
    <SheetPrimitive.Portal>
      <SheetPrimitive.Overlay data-slot="sheet-overlay" className="fixed inset-0 z-50 bg-black/30 data-[state=closed]:animate-out data-[state=open]:animate-in" />
      <SheetPrimitive.Content
        data-slot="sheet-content"
        className={cn("fixed inset-y-0 right-0 z-50 flex h-full w-full max-w-md flex-col overflow-y-auto border-l border-stone-200 bg-white text-stone-950 shadow-lg transition-transform data-[state=closed]:translate-x-full data-[state=open]:translate-x-0 focus:outline-none", className)}
        {...props}
      >
        {children}
      </SheetPrimitive.Content>
    </SheetPrimitive.Portal>
  );
}

function SheetHeader({ className, ...props }: React.ComponentProps<"div">) {
  return <div data-slot="sheet-header" className={cn("flex flex-col gap-1.5", className)} {...props} />;
}

function SheetFooter({ className, ...props }: React.ComponentProps<"div">) {
  return <div data-slot="sheet-footer" className={cn("flex flex-wrap gap-2", className)} {...props} />;
}

function SheetTitle({ className, ...props }: React.ComponentProps<typeof SheetPrimitive.Title>) {
  return <SheetPrimitive.Title data-slot="sheet-title" className={cn("text-xl font-medium", className)} {...props} />;
}

function SheetDescription({ className, ...props }: React.ComponentProps<typeof SheetPrimitive.Description>) {
  return <SheetPrimitive.Description data-slot="sheet-description" className={cn("text-sm text-stone-600", className)} {...props} />;
}

export { Sheet, SheetClose, SheetContent, SheetHeader, SheetFooter, SheetTitle, SheetDescription };
