"use client";
import React from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Check } from "lucide-react";

const PopupComp = ({ isOpen, onClose, PopupData }) => {
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose?.()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-heading">{PopupData?.header}</DialogTitle>
          {PopupData?.description && (
            <DialogDescription>{PopupData.description}</DialogDescription>
          )}
        </DialogHeader>
        {PopupData?.message?.length > 0 && (
          <ul className="space-y-2.5 text-sm text-muted-foreground">
            {PopupData.message.map((message, index) => (
              <li key={index} className="flex items-start gap-2.5">
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
                <span>{message}</span>
              </li>
            ))}
          </ul>
        )}
        <DialogFooter>
          <Button onClick={onClose} className="w-full sm:w-auto">
            Got it
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default PopupComp;
