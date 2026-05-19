import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { useEffect, useRef } from "react";

type ManualCopyDialogProps = {
  text: string;
  onClose: () => void;
};

export function ManualCopyDialog({ text, onClose }: ManualCopyDialogProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (text && textareaRef.current) {
      try { textareaRef.current.select(); } catch { /* noop */ }
    }
  }, [text]);

  const downloadBrief = () => {
    const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "case-brief.txt";
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };

  const selectAll = () => {
    if (textareaRef.current) {
      textareaRef.current.focus();
      textareaRef.current.select();
    }
  };

  return (
    <Dialog open={Boolean(text)} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="max-w-2xl rounded-none p-0 gap-0 border border-border">
        <DialogHeader className="px-4 py-3 border-b border-border">
          <DialogTitle className="text-sm font-medium">Case Brief — manual copy</DialogTitle>
          <p className="text-xs text-muted-foreground mt-1">
            Clipboard access is unavailable on this device. You can copy manually or download the brief.
          </p>
        </DialogHeader>
        <div className="px-4 py-3 max-h-[55vh] overflow-auto">
          <Textarea
            ref={textareaRef}
            readOnly
            value={text}
            className="min-h-[45vh] font-mono text-xs rounded-none"
            onFocus={(event) => event.currentTarget.select()}
          />
        </div>
        <DialogFooter className="px-4 py-3 border-t border-border gap-2">
          <Button size="sm" variant="outline" onClick={selectAll}>Select All</Button>
          <Button size="sm" variant="outline" onClick={downloadBrief}>Download .txt</Button>
          <Button size="sm" onClick={onClose}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
