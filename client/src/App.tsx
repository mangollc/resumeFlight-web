
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

function App() {
  return (
    <AuthProvider>
      <Switch>
        <Route path="/auth">
          <AuthPage />
        </Route>
        <Route path="/not-found">
          <NotFound />
        </Route>
        <Route path="/">
          <Redirect to="/dashboard" />
        </Route>
        <Route path="/dashboard">
          <ProtectedRoute path="/dashboard" component={() => (
            <div className="flex min-h-screen">
              <Sidebar />
              <div className="flex-1">
                <Navbar />
                <div className="p-4 md:p-6">
                  <Dashboard />
                </div>
              </div>
            </div>
          )} />
        </Route>
        <Route path="/uploaded-resumes">
          <ProtectedRoute path="/uploaded-resumes" component={() => (
            <div className="flex min-h-screen">
              <Sidebar />
              <div className="flex-1">
                <Navbar />
                <div className="p-4 md:p-6">
                  <UploadedResumesPage />
                </div>
              </div>
            </div>
          )} />
        </Route>
        <Route path="/optimized-resumes">
          <ProtectedRoute path="/optimized-resumes" component={() => (
            <div className="flex min-h-screen">
              <Sidebar />
              <div className="flex-1">
                <Navbar />
                <div className="p-4 md:p-6">
                  <OptimizedResumesPage />
                </div>
              </div>
            </div>
          )} />
        </Route>
        <Route path="/subscription">
          <ProtectedRoute path="/subscription" component={() => (
            <div className="flex min-h-screen">
              <Sidebar />
              <div className="flex-1">
                <Navbar />
                <div className="p-4 md:p-6">
                  <SubscriptionPage />
                </div>
              </div>
            </div>
          </ProtectedRoute>
        </Route>
        <Route path="/settings">
          <ProtectedRoute>
            <div className="flex min-h-screen">
              <Sidebar />
              <div className="flex-1">
                <Navbar />
                <div className="p-4 md:p-6">
                  <SettingsPage />
                </div>
              </div>
            </div>
          </ProtectedRoute>
        </Route>
        <Route>
          <Redirect to="/not-found" />
        </Route>
      </Switch>
      <Toaster />
    </>
  );
}

export default App;
