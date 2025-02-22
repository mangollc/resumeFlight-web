
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Laptop } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

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
    <div className="grid grid-cols-2 gap-4 h-full">
      <div className="border rounded-lg p-4 overflow-auto">
        <h3 className="font-semibold mb-2">Original Version</h3>
        <pre className="whitespace-pre-wrap text-sm">{originalResume}</pre>
      </div>
      <div className="border rounded-lg p-4 overflow-auto">
        <h3 className="font-semibold mb-2">Optimized Version</h3>
        <pre className="whitespace-pre-wrap text-sm">{optimizedResume}</pre>
      </div>
    </div>
  );
}
