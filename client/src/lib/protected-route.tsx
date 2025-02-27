
import React from 'react';
import { useLocation, useRoute } from "wouter";
import { useAuth } from "@/hooks/use-auth";

interface ProtectedRouteProps {
  component: React.ComponentType<any>;
  path: string;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  component: Component,
  path,
}) => {
  const { user, isLoading } = useAuth();
  const [isMatch] = useRoute(path);
  const [, setLocation] = useLocation();

  React.useEffect(() => {
    if (isMatch && !isLoading && !user) {
      setLocation('/auth');
    }
  }, [isMatch, user, isLoading, setLocation]);

  if (isLoading) {
    return <div className="flex items-center justify-center h-screen">Loading...</div>;
  }

  if (!user && isMatch) {
    return null;
  }

  return <Component />;
};

export const ProtectedLayout = ({ component: Component }: { component: React.ComponentType<any> }) => {
  return (
    <div className="flex h-screen flex-col md:flex-row">
      <div className="w-full flex-1 flex flex-col">
        <main className="flex-1 overflow-y-auto">
          <Component />
        </main>
      </div>
    </div>
  );
};
