import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Laptop } from "lucide-react";

interface ResumeSideBySideCompareProps {
  originalResume: string;
  optimizedResume: string;
}

export function ResumeSideBySideCompare({ originalResume, optimizedResume }: ResumeSideBySideCompareProps) {
  const [showMobileDialog, setShowMobileDialog] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      const isMobileView = window.innerWidth < 1024;
      setIsMobile(isMobileView);
      if (isMobileView) {
        setShowMobileDialog(true);
      }
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  if (isMobile) {
    return (
      <Dialog open={showMobileDialog} onOpenChange={setShowMobileDialog}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Laptop className="h-5 w-5" />
              Desktop View Required
            </DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm text-muted-foreground">
              The resume comparison feature is optimized for larger screens. 
              Please use a tablet or desktop device to access this feature for the best experience.
            </p>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-4 h-full">
      <div className="border rounded-lg p-4 bg-card">
        <h3 className="text-lg font-semibold mb-4">Original Resume</h3>
        <div className="prose max-w-none" dangerouslySetInnerHTML={{ __html: originalResume }} />
      </div>
      <div className="border rounded-lg p-4 bg-card">
        <h3 className="text-lg font-semibold mb-4">Optimized Resume</h3>
        <div className="prose max-w-none" dangerouslySetInnerHTML={{ __html: optimizedResume }} />
      </div>
    </div>
  );
}
