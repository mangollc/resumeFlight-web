import { Switch, Route, Redirect } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import NotFound from "@/pages/not-found";
import AuthPage from "@/pages/auth-page";
import Dashboard from "@/pages/dashboard";
import UploadedResumesPage from "@/pages/uploaded-resumes";
import OptimizedResumesPage from "@/pages/optimized-resumes";
import SubscriptionPage from "@/pages/subscription";
import SettingsPage from "@/pages/settings";
import { AuthProvider } from "@/hooks/use-auth";
import { ProtectedRoute } from "./lib/protected-route";
import { Sidebar } from "@/components/layout/sidebar";
import { Navbar } from "@/components/layout/navbar";
import React, { useState } from 'react';

const cn = (...args: (string | undefined)[]) => args.filter(Boolean).join(' ');

function Layout({ children }: { children: React.ReactNode }) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar onCollapsedChange={setSidebarCollapsed} />
      <div className="flex-1">
        <Navbar collapsed={sidebarCollapsed} />
        <main className={cn(
          "mt-14 lg:mt-12", 
          sidebarCollapsed ? "lg:ml-16" : "lg:ml-56",
          "transition-all duration-300 ease-in-out"
        )}>
          <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
            {children}
          </div>
        </main>
      </div>
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

function ProtectedLayoutWithSidebar({ component: Component }) {
  return (
    <div className="flex h-screen flex-col md:flex-row">
      <Sidebar />
      <div className="w-full flex-1 flex flex-col">
        <main className="flex-1 overflow-y-auto">
          <Component />
        </main>
      </div>
    </div>
  );
}

function Router() {
  return (
    <Switch>
      <Route path="/">
        <Redirect to="/dashboard" />
      </Route>
      <ProtectedRoute path="/dashboard" component={() => <ProtectedLayoutWithSidebar component={Dashboard} />} />
      <ProtectedRoute path="/resume/:id/optimize/review" component={() => <ProtectedLayoutWithSidebar component={Dashboard} />} />
      <ProtectedRoute path="/uploaded-resumes" component={() => <ProtectedLayoutWithSidebar component={UploadedResumesPage} />} />
      <ProtectedRoute path="/optimized-resumes" component={() => <ProtectedLayoutWithSidebar component={OptimizedResumesPage} />} />
      <ProtectedRoute path="/subscription" component={() => <ProtectedLayoutWithSidebar component={SubscriptionPage} />} />
      <ProtectedRoute path="/settings" component={() => <ProtectedLayoutWithSidebar component={SettingsPage} />} />
      <Route path="/auth" component={AuthPage} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <SidebarProvider>
          <Router />
          <Toaster />
        </SidebarProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;