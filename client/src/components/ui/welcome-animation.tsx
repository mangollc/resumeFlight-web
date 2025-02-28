import { useAuth } from "@/hooks/use-auth";
import { cn } from "@/lib/utils";
import { useEffect, useState } from "react";

interface WelcomeAnimationProps {
  className?: string;
}

export function WelcomeAnimation({ className }: WelcomeAnimationProps) {
  const { user } = useAuth();
  const [shouldShow, setShouldShow] = useState(false);

  useEffect(() => {
    // Check if we've already shown the welcome message this session
    const hasShownWelcome = localStorage.getItem('hasShownWelcome');
    setShouldShow(!hasShownWelcome && !!user);

    if (!hasShownWelcome && user) {
      localStorage.setItem('hasShownWelcome', 'true');
    }
  }, [user]);

  const isReviewPage = window.location.pathname.includes('/review') || window.location.search.includes('optimizedId');
  if (!shouldShow || !user || isReviewPage) return null;

  return (
    <div className={cn("space-y-2 text-center lg:text-left mb-4", className)}>
      <h1 className="text-2xl font-semibold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
        Welcome back{user?.name ? `, ${user.name}` : ''}!
      </h1>
    </div>
  );
}