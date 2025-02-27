import React, { useState } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import {
  FileText,
  ChevronRight,
  ChevronLeft,
  Settings,
  LogOut,
  Home,
  User,
  CheckCircle,
  BarChart,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

export function Sidebar() {
  const [expanded, setExpanded] = useState(true);
  const [location] = useLocation();
  const { user, logout } = useAuth();

  const toggleSidebar = () => {
    setExpanded(!expanded);
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase();
  };

  const isActive = (path: string) => {
    return location === path;
  };

  const navItems = [
    {
      name: "Dashboard",
      path: "/dashboard",
      icon: <Home className="h-5 w-5" />,
    },
    {
      name: "My Resumes",
      path: "/uploaded-resumes",
      icon: <FileText className="h-5 w-5" />,
    },
    {
      name: "Optimized Resumes",
      path: "/optimized-resumes",
      icon: <CheckCircle className="h-5 w-5" />,
    },
    {
      name: "Analytics",
      path: "/analytics",
      icon: <BarChart className="h-5 w-5" />,
    },
    {
      name: "Settings",
      path: "/settings",
      icon: <Settings className="h-5 w-5" />,
    },
  ];

  return (
    <div
      className={`bg-card border-r h-full flex flex-col transition-all duration-300 ${
        expanded ? "w-64" : "w-16"
      }`}
    >
      <div className="p-4 flex items-center justify-between">
        {expanded && (
          <div className="font-semibold text-lg bg-gradient-to-r from-primary to-primary-foreground bg-clip-text text-transparent">
            Resume AI
          </div>
        )}
        <Button
          variant="ghost"
          size="icon"
          onClick={toggleSidebar}
          className="h-8 w-8 ml-auto"
        >
          {expanded ? (
            <ChevronLeft className="h-4 w-4" />
          ) : (
            <ChevronRight className="h-4 w-4" />
          )}
        </Button>
      </div>

      <div className="mt-4 flex-1 overflow-y-auto">
        <nav className="space-y-1 px-2">
          {navItems.map((item) => (
            <TooltipProvider key={item.path}>
              <Tooltip delayDuration={200}>
                <TooltipTrigger asChild>
                  <Link href={item.path}>
                    <Button
                      variant={isActive(item.path) ? "secondary" : "ghost"}
                      className={`w-full justify-start ${
                        expanded ? "" : "justify-center"
                      }`}
                    >
                      {item.icon}
                      {expanded && <span className="ml-3">{item.name}</span>}
                    </Button>
                  </Link>
                </TooltipTrigger>
                {!expanded && (
                  <TooltipContent side="right">{item.name}</TooltipContent>
                )}
              </Tooltip>
            </TooltipProvider>
          ))}
        </nav>
      </div>

      <div className="p-4 border-t">
        <div
          className={`flex items-center ${
            expanded ? "justify-between" : "justify-center"
          }`}
        >
          {expanded && user && (
            <div className="flex items-center">
              <Avatar className="h-8 w-8">
                <AvatarFallback>
                  {getInitials(user.name || user.email)}
                </AvatarFallback>
              </Avatar>
              <div className="ml-2 overflow-hidden">
                <p className="text-sm font-medium truncate">
                  {user.name || user.email}
                </p>
              </div>
            </div>
          )}

          <TooltipProvider>
            <Tooltip delayDuration={200}>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={logout}
                  className="h-8 w-8"
                >
                  <LogOut className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="right">Log out</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>
    </div>
  );
}