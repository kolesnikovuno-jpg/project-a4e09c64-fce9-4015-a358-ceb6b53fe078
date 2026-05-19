import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";

type ManualCopyDialogProps = {
  text: string;
  onClose: () => void;
};

export function ManualCopyDialog({ text, onClose }: ManualCopyDialogProps) {
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

  return (
    <Dialog open={Boolean(text)} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Manual Case Brief copy</DialogTitle>
          <DialogDescription>
            Browser clipboard access was blocked. Select and copy the brief below, or download it as a text file.
          </DialogDescription>
        </DialogHeader>
        <Textarea
          readOnly
          value={text}
          className="min-h-[45vh] font-mono text-xs"
          onFocus={(event) => event.currentTarget.select()}
        />
        <DialogFooter>
          <Button variant="outline" onClick={downloadBrief}>Download Brief (.txt)</Button>
          <Button onClick={onClose}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
