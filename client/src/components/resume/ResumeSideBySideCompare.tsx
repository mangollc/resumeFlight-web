import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Laptop } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ResumeSideBySideCompareProps {
  originalResume: string;
  optimizedResume: string;
}

export function ResumeSideBySideCompare({ originalResume, optimizedResume }: ResumeSideBySideCompareProps) {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 1024);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  if (isMobile) {
    return (
      <Dialog>
        <DialogTrigger asChild>
          <Button variant="outline" className="w-full">
            Compare Versions
          </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Laptop className="h-5 w-5" />
              Desktop View Required
            </DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm text-muted-foreground">
              The resume comparison feature requires a larger screen for optimal viewing. 
              Please use a tablet or desktop device to access the side-by-side comparison.
            </p>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <div className="hidden lg:grid grid-cols-2 gap-4 h-full">
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