import { Switch, Route, Redirect } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import NotFound from "@/pages/not-found";
import AuthPage from "@/pages/auth-page";
import HomePage from "@/pages/home-page";
import UploadedResumesPage from "@/pages/uploaded-resumes";
import OptimizedResumesPage from "@/pages/optimized-resumes";
import SubscriptionPage from "@/pages/subscription";
import SettingsPage from "@/pages/settings";
import { AuthProvider } from "@/hooks/use-auth";
import { ProtectedRoute } from "./lib/protected-route";
import { Sidebar } from "@/components/layout/sidebar";
import React from 'react';

function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />
      <main className="flex-1 flex flex-col pl-64">
        <div className="max-w-7xl mx-auto w-full p-8 space-y-8">
          {children}
        </div>
      </main>
    </div>
  );
}

function ProtectedLayout({ component: Component }: { component: React.ComponentType }) {
  return (
    <Layout>
      <Component />
    </Layout>
  );
}

function Router() {
  return (
    <Switch>
      <Route path="/">
        <Redirect to="/dashboard" />
      </Route>
      <ProtectedRoute path="/dashboard" component={() => <ProtectedLayout component={HomePage} />} />
      <ProtectedRoute path="/uploaded-resumes" component={() => <ProtectedLayout component={UploadedResumesPage} />} />
      <ProtectedRoute path="/optimized-resumes" component={() => <ProtectedLayout component={OptimizedResumesPage} />} />
      <ProtectedRoute path="/subscription" component={() => <ProtectedLayout component={SubscriptionPage} />} />
      <ProtectedRoute path="/settings" component={() => <ProtectedLayout component={SettingsPage} />} />
      <Route path="/auth" component={AuthPage} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <Router />
        <Toaster />
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;