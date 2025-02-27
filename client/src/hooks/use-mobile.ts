
import { useState, useEffect } from 'react';

// Map of breakpoints to pixel values
const breakpoints = {
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
  '2xl': 1536,
};

type Breakpoint = 'sm' | 'md' | 'lg' | 'xl' | '2xl';

/**
 * Hook to detect if the current viewport is mobile based on a breakpoint
 * @param breakpoint The breakpoint to check against, defaults to 'md' (768px)
 * @returns boolean indicating if viewport is below the breakpoint (mobile)
 */
export function useIsMobile(breakpoint: Breakpoint = 'md'): boolean {
  const [isMobile, setIsMobile] = useState<boolean>(false);
  
  useEffect(() => {
    // Initial check
    const checkIfMobile = () => {
      setIsMobile(window.innerWidth < breakpoints[breakpoint]);
    };
    
    // Set initial value
    checkIfMobile();
    
    // Add event listener
    window.addEventListener('resize', checkIfMobile);
    
    // Clean up
    return () => window.removeEventListener('resize', checkIfMobile);
  }, [breakpoint]);
  
  return isMobile;
}

/**
 * Hook to get the current viewport size
 * @returns object with width and height of viewport
 */
export function useViewportSize() {
  const [size, setSize] = useState({ width: 0, height: 0 });
  
  useEffect(() => {
    // Handler to call on window resize
    function handleResize() {
      // Set window width/height to state
      setSize({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    }
    
    // Add event listener
    window.addEventListener('resize', handleResize);
    
    // Call handler right away so state gets updated with initial window size
    handleResize();
    
    // Remove event listener on cleanup
    return () => window.removeEventListener('resize', handleResize);
  }, []); // Empty array ensures that effect is only run on mount
  
  return size;
}
