import { Button } from "@/components/ui/button";
import { RocketIcon } from "lucide-react";

export default function SubscriptionPage() {
  return (
    <div className="flex-1 p-8 flex items-center justify-center">
      <div className="text-center space-y-4 max-w-md">
        <RocketIcon className="mx-auto h-12 w-12 text-primary" />
        <h1 className="text-2xl font-bold">Coming Soon!</h1>
        <p className="text-muted-foreground">
          We're working hard to bring you premium features and subscription plans.
          Stay tuned for updates!
        </p>
        <Button disabled>Notify Me</Button>
      </div>
    </div>
  );
}
