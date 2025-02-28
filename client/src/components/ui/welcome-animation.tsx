import { useAuth } from "@/hooks/use-auth";
import { cn } from "@/lib/utils";
import { useEffect, useState } from "react";

interface WelcomeAnimationProps {
  className?: string;
}

export function WelcomeAnimation({ className }: WelcomeAnimationProps) {
  const { user } = useAuth();
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (user) {
      const hasShownWelcome = localStorage.getItem('hasShownWelcome');
      if (!hasShownWelcome) {
        setShow(true);
        localStorage.setItem('hasShownWelcome', 'true');

        const timer = setTimeout(() => {
          setShow(false);
        }, 3000); 
        return () => clearTimeout(timer);
      }
    }
  }, [user]);

  const isReviewPage = window.location.pathname.includes('/review') || window.location.search.includes('optimizedId');
  if (!show || !user || isReviewPage) return null;

  
  return (
    <div className={cn("space-y-2 text-center lg:text-left mb-4", className)}>
      <h1 className="text-2xl font-semibold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
        Welcome back{user?.name ? `, ${user.name}` : ''}!
      </h1>
    </div>
  );
}