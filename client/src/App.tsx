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

function Router() {
  return (
    <Switch>
      <Route path="/">
        <Redirect to="/dashboard" />
      </Route>
      <ProtectedRoute path="/dashboard" component={() => <ProtectedLayout component={Dashboard} />} />
      <ProtectedRoute path="/resume/:id/optimize/review" component={() => <ProtectedLayout component={Dashboard} />} />
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
import { Route, Switch } from "wouter";
import Dashboard from "./pages/dashboard";
import Review from "./pages/review";
import OptimizedResumes from "./pages/optimized-resumes";
import CoverLetters from "./pages/cover-letters";
import { Toaster } from "@/components/ui/toaster";

export default function App() {
  return (
    <>
      <Switch>
        <Route path="/" component={Dashboard} />
        <Route path="/dashboard" component={Dashboard} />
        <Route path="/review/:id" component={Review} />
        <Route path="/optimized-resumes" component={OptimizedResumes} />
        <Route path="/cover-letters" component={CoverLetters} />
      </Switch>
      <Toaster />
    </>
  );
}
