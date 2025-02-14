import { motion } from "framer-motion";
import { useAuth } from "@/hooks/use-auth";
import { cn } from "@/lib/utils";

interface WelcomeAnimationProps {
  className?: string;
}

export function WelcomeAnimation({ className }: WelcomeAnimationProps) {
  const { user } = useAuth();
  const firstName = user?.name?.split(' ')[0] || 'there';

  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.2,
        delayChildren: 0.3,
      },
    },
  };

  const item = {
    hidden: { opacity: 0, y: 20 },
    show: { 
      opacity: 1, 
      y: 0,
      transition: {
        duration: 0.8,
        ease: [0.04, 0.62, 0.23, 0.98],
      },
    },
  };

  return (
    <motion.div
      variants={container}
      initial="hidden"
      animate="show"
      className={cn("space-y-4 text-center lg:text-left", className)}
    >
      <motion.div variants={item} className="space-y-2">
        <motion.div
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="w-12 h-12 mb-4 rounded-full bg-gradient-to-r from-primary to-primary/60 mx-auto lg:mx-0 flex items-center justify-center"
        >
          <span className="text-2xl text-primary-foreground">
            {firstName.charAt(0).toUpperCase()}
          </span>
        </motion.div>
        <motion.h1 
          variants={item} 
          className="text-fluid-h1 bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent"
        >
          Hi {firstName}! 👋
        </motion.h1>
        <motion.p variants={item} className="text-fluid-base text-muted-foreground max-w-md mx-auto lg:mx-0">
          Welcome to ResumeFlight. Let's optimize your resume and boost your career opportunities.
        </motion.p>
      </motion.div>
    </motion.div>
  );
}
