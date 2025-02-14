import { clamp } from "./utils";

// Font scaling utility functions
export const fluidType = (
  minFontSize: number,
  maxFontSize: number,
  minScreenSize: number = 320, // min screen width
  maxScreenSize: number = 1920 // max screen width
): string => {
  const fontSizeRange = maxFontSize - minFontSize;
  const screenSizeRange = maxScreenSize - minScreenSize;
  const slope = fontSizeRange / screenSizeRange;
  const base = minFontSize - slope * minScreenSize;

  return `clamp(${minFontSize}px, ${base.toFixed(4)}px + ${(slope * 100).toFixed(4)}vw, ${maxFontSize}px)`;
};

// Preset scales for common text elements
export const fontScales = {
  h1: fluidType(28, 48),    // 1.75rem - 3rem
  h2: fluidType(24, 36),    // 1.5rem - 2.25rem
  h3: fluidType(20, 30),    // 1.25rem - 1.875rem
  h4: fluidType(18, 24),    // 1.125rem - 1.5rem
  base: fluidType(16, 18),  // 1rem - 1.125rem
  sm: fluidType(14, 16),    // 0.875rem - 1rem
  xs: fluidType(12, 14),    // 0.75rem - 0.875rem
};
