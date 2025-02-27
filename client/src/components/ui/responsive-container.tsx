
import React from 'react';
import { useIsMobile } from '@/hooks/use-mobile';

interface ResponsiveContainerProps {
  children: React.ReactNode;
  className?: string;
  mobileClassName?: string;
  desktopClassName?: string;
}

export function ResponsiveContainer({
  children,
  className = '',
  mobileClassName = '',
  desktopClassName = '',
}: ResponsiveContainerProps) {
  const isMobile = useIsMobile();
  
  return (
    <div className={`${className} ${isMobile ? mobileClassName : desktopClassName}`}>
      {children}
    </div>
  );
}
