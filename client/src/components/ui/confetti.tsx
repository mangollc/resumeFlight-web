import { useCallback, useEffect, useState } from "react";
import ReactConfetti from "react-confetti";

interface ConfettiProps {
  trigger?: boolean;
  duration?: number;
}

export function Confetti({ trigger = false, duration = 3000 }: ConfettiProps) {
  const [isActive, setIsActive] = useState(false);
  const [size, setSize] = useState({ width: 0, height: 0 });

  const updateSize = useCallback(() => {
    setSize({
      width: window.innerWidth,
      height: window.innerHeight,
    });
  }, []);

  useEffect(() => {
    // Update size initially and on window resize
    updateSize();
    window.addEventListener("resize", updateSize);
    return () => window.removeEventListener("resize", updateSize);
  }, [updateSize]);

  useEffect(() => {
    if (trigger) {
      setIsActive(true);
      const timer = setTimeout(() => {
        setIsActive(false);
      }, duration);
      return () => clearTimeout(timer);
    }
  }, [trigger, duration]);

  if (!isActive) return null;

  return (
    <ReactConfetti
      width={size.width}
      height={size.height}
      recycle={false}
      numberOfPieces={200}
      gravity={0.3}
      initialVelocityY={20}
      style={{ position: "fixed", top: 0, left: 0, zIndex: 50 }}
    />
  );
}
