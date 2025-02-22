import { motion } from "framer-motion";
import { useAuth } from "@/hooks/use-auth";
import { cn } from "@/lib/utils";
import { useEffect, useState } from "react";

interface WelcomeAnimationProps {
  className?: string;
}

export function WelcomeAnimation({ className }: WelcomeAnimationProps) {
  const { user } = useAuth();
  const [show, setShow] = useState(true); // Start as true when component mounts

  useEffect(() => {
    if (user) {
      // Hide animation after 5 seconds
      const timer = setTimeout(() => {
        setShow(false);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [user]);

  // Don't show welcome animation on review pages
  const isReviewPage = window.location.pathname.includes('/review') || window.location.search.includes('optimizedId');
  if (!show || !user || isReviewPage) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      className={cn("space-y-4 text-center lg:text-left", className)}
    >
      <h1 className="text-fluid-h1 bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
        Welcome back{user?.name ? `, ${user.name}` : ''}!
      </h1>
    </motion.div>
  );
}