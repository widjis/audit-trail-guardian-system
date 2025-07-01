
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { X, Maximize, Minimize } from "lucide-react";
import { useEffect, useState } from "react";

interface SrfDocumentPreviewProps {
  isOpen: boolean;
  onClose: () => void;
  pdfUrl: string | null;
  documentName: string;
}

export function SrfDocumentPreview({ isOpen, onClose, pdfUrl, documentName }: SrfDocumentPreviewProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [isFullScreen, setIsFullScreen] = useState(false);

  useEffect(() => {
    if (isOpen && pdfUrl) {
      setIsLoading(true);
    }
  }, [isOpen, pdfUrl]);

  useEffect(() => {
    const handleFullScreenChange = () => {
      setIsFullScreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullScreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullScreenChange);
  }, []);

  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !document.fullscreenElement) {
        handleClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      return () => document.removeEventListener('keydown', handleEscape);
    }
  }, [isOpen]);

  const handleIframeLoad = () => {
    setIsLoading(false);
  };

  const handleClose = () => {
    if (document.fullscreenElement) {
      document.exitFullscreen();
    }
    setIsLoading(true);
    onClose();
  };

  const toggleFullScreen = async () => {
    try {
      if (!document.fullscreenElement) {
        const dialogElement = document.querySelector('[data-pdf-preview]');
        if (dialogElement) {
          await dialogElement.requestFullscreen();
        }
      } else {
        await document.exitFullscreen();
      }
    } catch (error) {
      console.error('Error toggling fullscreen:', error);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent 
        className="w-[95vw] h-[95vh] max-w-none p-0 gap-0"
        data-pdf-preview
      >
        <DialogHeader className="p-4 border-b bg-white relative z-10 flex-shrink-0">
          <DialogTitle className="flex items-center justify-between pr-16">
            <span className="truncate text-base font-medium">{documentName}</span>
            <div className="flex items-center gap-1 absolute right-4 top-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={toggleFullScreen}
                className="h-8 w-8 p-0"
                title={isFullScreen ? "Exit fullscreen" : "Enter fullscreen"}
              >
                {isFullScreen ? (
                  <Minimize className="h-4 w-4" />
                ) : (
                  <Maximize className="h-4 w-4" />
                )}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClose}
                className="h-8 w-8 p-0"
                title="Close preview"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </DialogTitle>
        </DialogHeader>
        
        <div className="flex-1 relative overflow-hidden">
          {isLoading && (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-50 z-20">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
                <p className="text-sm text-gray-600">Loading document...</p>
              </div>
            </div>
          )}
          
          {pdfUrl && (
            <iframe
              src={pdfUrl}
              className="w-full h-full border-0"
              style={{ height: 'calc(95vh - 73px)' }}
              title={`Preview of ${documentName}`}
              onLoad={handleIframeLoad}
              allow="fullscreen"
            />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
