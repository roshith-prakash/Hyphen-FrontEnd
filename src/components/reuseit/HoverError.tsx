import { cn } from "@/lib/utils";
import { ReactNode } from "react";

interface HoverErrorProps {
  text: string;
  displayed?: boolean;
  children: ReactNode;
  className?: string;
  position?: "top" | "bottom" | "left" | "right";
}

const HoverError = ({
  text,
  displayed = true,
  children,
  className,
  position = "bottom",
}: HoverErrorProps) => {
  const positionStyles: { [key: string]: string } = {
    top: "bottom-full left-1/2 transform -translate-x-1/2 -translate-y-2",
    bottom: "top-full left-1/2 transform -translate-x-1/2 translate-y-2",
    left: "right-full top-1/2 transform -translate-y-1/2 -translate-x-2",
    right: "left-full top-1/2 transform -translate-y-1/2 translate-x-2",
  };

  return (
    <div className="relative flex items-center justify-center">
      {children}

      {displayed && (
        <div
          className={cn(
            `absolute z-10 w-max max-w-3xs rounded-lg px-4 py-2 text-center text-sm ${
              displayed ? "opacity-100" : "opacity-0"
            } dark:bg-darkbg bg-white shadow-lg dark:shadow-white/50 dark:shadow-sm transition-all duration-300 ${className} ${
              positionStyles[position]
            }`
          )}
        >
          {text}
        </div>
      )}
    </div>
  );
};

export default HoverError;
