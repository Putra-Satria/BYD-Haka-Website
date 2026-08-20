import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Download, ExternalLink, X, FileText, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface PDFPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  fileUrl: string;
  title: string;
}

export function PDFPreviewModal({ isOpen, onClose, fileUrl, title }: PDFPreviewModalProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  // No need for signed URL logic since buckets are public
  // We will pass the full public URL from the parent component
  useEffect(() => {
    if (isOpen && fileUrl) {
      setLoading(false);
    }
  }, [isOpen, fileUrl]);

  const handleDownload = () => {
    if (fileUrl) {
      window.open(fileUrl, "_blank");
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl h-[90vh] flex flex-col p-0">
        <DialogHeader className="p-4 border-b flex flex-row items-center justify-between">
          <DialogTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            {title}
          </DialogTitle>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleDownload} disabled={!fileUrl}>
              <Download className="w-4 h-4 mr-2" />
              Download
            </Button>
            {fileUrl && (
              <Button variant="outline" size="sm" asChild>
                <a href={fileUrl} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="w-4 h-4 mr-2" />
                  Open in New Tab
                </a>
              </Button>
            )}
          </div>
        </DialogHeader>

        <div className="flex-1 bg-muted/30 overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
              <span className="ml-2 text-muted-foreground">Loading document...</span>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
              <FileText className="w-16 h-16 mb-4 opacity-50" />
              <p className="text-lg font-medium">Unable to preview document</p>
              <p className="text-sm">Please try downloading the file instead</p>
              <Button variant="outline" className="mt-4" onClick={handleDownload}>
                <Download className="w-4 h-4 mr-2" />
                Download File
              </Button>
            </div>
          ) : fileUrl ? (
            <iframe
              src={`${fileUrl}#toolbar=0`}
              className="w-full h-full border-0"
              title={title}
              onLoad={() => setLoading(false)}
              onError={() => setError(true)}
            />
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}
