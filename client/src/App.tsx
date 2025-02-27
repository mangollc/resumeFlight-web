import { Route, Switch, Redirect } from "wouter";
import AuthPage from "@/pages/auth-page";
import Dashboard from "@/pages/dashboard";
import SubscriptionPage from "@/pages/subscription";
import SettingsPage from "@/pages/settings";
import { Toaster } from "@/components/ui/toaster";
import { Sidebar } from "@/components/layout/sidebar";
import { Navbar } from "@/components/layout/navbar";
import { AuthProvider } from "@/hooks/use-auth";
import { ProtectedRoute } from "@/lib/protected-route";
import OptimizedResumesPage from "@/pages/optimized-resumes";
import UploadedResumesPage from "@/pages/uploaded-resumes";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { useState } from "react";

// Layout component for protected pages
const ProtectedLayout = ({ children }: { children: React.ReactNode }) => {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="flex min-h-screen">
      <Sidebar onCollapsedChange={setCollapsed} />
      <div className="flex-1 flex flex-col">
        <Navbar collapsed={collapsed} />
        <main className="flex-1 p-6 mt-14">
          {children}
        </main>
      </div>
    </div>
  );
};

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <Switch>
          <Route path="/auth">
            <AuthPage />
          </Route>
          <Route path="/">
            <Redirect to="/dashboard" />
          </Route>
          <Route path="/dashboard">
            <ProtectedRoute>
              <ProtectedLayout>
                <Dashboard />
              </ProtectedLayout>
            </ProtectedRoute>
          </Route>
          <Route path="/uploaded-resumes">
            <ProtectedRoute>
              <ProtectedLayout>
                <UploadedResumesPage />
              </ProtectedLayout>
            </ProtectedRoute>
          </Route>
          <Route path="/optimized-resumes">
            <ProtectedRoute>
              <ProtectedLayout>
                <OptimizedResumesPage />
              </ProtectedLayout>
            </ProtectedRoute>
          </Route>
          <Route path="/subscription">
            <ProtectedRoute>
              <ProtectedLayout>
                <SubscriptionPage />
              </ProtectedLayout>
            </ProtectedRoute>
          </Route>
          <Route path="/settings">
            <ProtectedRoute>
              <ProtectedLayout>
                <SettingsPage />
              </ProtectedLayout>
            </ProtectedRoute>
          </Route>
          <Route>
            <Redirect to="/not-found" />
          </Route>
        </Switch>
        <Toaster />
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;