import { Route, Switch, Redirect } from "wouter";
import AuthPage from "@/pages/auth-page";
import Dashboard from "@/pages/dashboard";
import SubscriptionPage from "@/pages/subscription";
import SettingsPage from "@/pages/settings";
import { Toaster } from "@/components/ui/toaster";
import { Sidebar, SidebarProvider } from "@/components/ui/sidebar";
import { AuthProvider } from "@/hooks/use-auth";
import { ProtectedRoute } from "@/lib/protected-route";
import OptimizedResumesPage from "@/pages/optimized-resumes";
import UploadedResumesPage from "@/pages/uploaded-resumes";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <SidebarProvider> {/* Wrapped the entire content within SidebarProvider */}
          <Switch>
            <Route path="/auth">
              <AuthPage />
            </Route>
            <Route path="/">
              <Redirect to="/dashboard" />
            </Route>
            <Route path="/dashboard">
              <ProtectedRoute path="/dashboard">
                <div className="flex min-h-screen">
                  <Sidebar />
                  <div className="flex-1">
                    <Dashboard />
                  </div>
                </div>
              </ProtectedRoute>
            </Route>
            <Route path="/uploaded-resumes">
              <ProtectedRoute path="/uploaded-resumes">
                <div className="flex min-h-screen">
                  <Sidebar />
                  <div className="flex-1">
                    <UploadedResumesPage />
                  </div>
                </div>
              </ProtectedRoute>
            </Route>
            <Route path="/optimized-resumes">
              <ProtectedRoute path="/optimized-resumes">
                <div className="flex min-h-screen">
                  <Sidebar />
                  <div className="flex-1">
                    <OptimizedResumesPage />
                  </div>
                </div>
              </ProtectedRoute>
            </Route>
            <Route path="/subscription">
              <ProtectedRoute path="/subscription">
                <div className="flex min-h-screen">
                  <Sidebar />
                  <div className="flex-1">
                    <SubscriptionPage />
                  </div>
                </div>
              </ProtectedRoute>
            </Route>
            <Route path="/settings">
              <ProtectedRoute path="/settings">
                <div className="flex min-h-screen">
                  <Sidebar />
                  <div className="flex-1">
                    <SettingsPage />
                  </div>
                </div>
              </ProtectedRoute>
            </Route>
            <Route>
              <Redirect to="/not-found" />
            </Route>
          </Switch>
          <Toaster />
        </SidebarProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;