
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";

export default function HomePage() {
  const [, setLocation] = useLocation();

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-violet-500/20 to-indigo-500/20 p-4">
      <div className="max-w-3xl text-center space-y-6">
        <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold bg-gradient-to-r from-violet-500 to-indigo-500 text-transparent bg-clip-text">
          Optimize Your Resume
        </h1>
        <p className="text-xl text-muted-foreground">
          Get your resume optimized for any job with AI-powered suggestions
        </p>
        <Button
          onClick={() => setLocation("/auth")}
          size="lg"
          className="group"
        >
          Get Started
          <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
        </Button>
      </div>
    </div>
  );
}
