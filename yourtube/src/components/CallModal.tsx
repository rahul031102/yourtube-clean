"use client";

import React from "react";
import { Dialog, DialogContent, DialogTitle, DialogHeader, DialogFooter } from "./ui/dialog";
import { Button } from "./ui/button";
import { useRouter } from "next/router";

export default function CallModal({ open, onOpenChange, friend }: any) {
  const router = useRouter();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Call {friend?.name || "friend"}</DialogTitle>
        </DialogHeader>
        <div className="py-4">
          <p className="text-sm text-gray-600">Starting a call will open the call page with camera/mic controls.</p>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={() => router.push(`/call/${friend?.id || "unknown"}`)}>Go to Call</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
