
import React from 'react';
import { useIsMobile } from '@/hooks/use-mobile';

interface ResponsiveContainerProps {
  children: React.ReactNode;
  className?: string;
  mobileClassName?: string;
  desktopClassName?: string;
  as?: React.ElementType;
  mobileBreakpoint?: 'sm' | 'md' | 'lg';
  mobilePadding?: boolean;
  mobileComponent?: React.ElementType;
  desktopComponent?: React.ElementType;
}

export function ResponsiveContainer({
  children,
  className = '',
  mobileClassName = '',
  desktopClassName = '',
  as: Component = 'div',
  mobileBreakpoint = 'md',
  mobilePadding = false,
  mobileComponent: MobileComponent,
  desktopComponent: DesktopComponent,
}: ResponsiveContainerProps) {
  const isMobile = useIsMobile(mobileBreakpoint);
  
  // If there are specific components for mobile and desktop
  if (isMobile && MobileComponent) {
    return (
      <MobileComponent 
        className={`${className} ${mobileClassName} ${mobilePadding ? 'px-3 py-2' : ''}`}
      >
        {children}
      </MobileComponent>
    );
  }
  
  if (!isMobile && DesktopComponent) {
    return (
      <DesktopComponent 
        className={`${className} ${desktopClassName}`}
      >
        {children}
      </DesktopComponent>
    );
  }
  
  // Default responsive container
  return (
    <Component 
      className={`${className} ${isMobile ? `${mobileClassName} ${mobilePadding ? 'px-3 py-2' : ''}` : desktopClassName}`}
    >
      {children}
    </Component>
  );
}

// Helper components for consistent use
export function MobileOnly({ children, className = '', breakpoint = 'md' }: { children: React.ReactNode, className?: string, breakpoint?: 'sm' | 'md' | 'lg' }) {
  const isMobile = useIsMobile(breakpoint);
  if (!isMobile) return null;
  return <div className={className}>{children}</div>;
}

export function DesktopOnly({ children, className = '', breakpoint = 'md' }: { children: React.ReactNode, className?: string, breakpoint?: 'sm' | 'md' | 'lg' }) {
  const isMobile = useIsMobile(breakpoint);
  if (isMobile) return null;
  return <div className={className}>{children}</div>;
}
