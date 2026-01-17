import { useState } from "react";
import type { InputHTMLAttributes } from "react";
import { cn } from "@/lib/utils";
import { FaEye, FaEyeSlash } from "react-icons/fa6";

type InputProps = InputHTMLAttributes<HTMLInputElement>;

// Styled Text input
const PasswordInput = ({
  value,
  placeholder,
  onChange,
  className = "",
  disabled,
  ...rest
}: InputProps) => {
  // State to convert field to text or password field
  const [display, setDisplay] = useState(false);
  return (
    // Relative div
    <div className="relative w-full">
      {/* Input field - can be text or password field depending on state */}
      <input
        disabled={disabled}
        type={display ? "text" : "password"}
        className={cn(
          `dark:placeholder:text-grey/50 placeholder:text-darkbg/50 text-md border-darkbg/50 mt-3 min-h-8 w-full rounded-lg border-2 bg-transparent px-4 py-2 pr-10 placeholder:text-sm focus:outline-none dark:border-white/50 ${className}`
        )}
        value={value}
        placeholder={placeholder}
        onChange={onChange}
        {...rest}
      />
      {/* Absolutely positioned icon - acts as buttons to change field type */}
      {display ? (
        <FaEye
          className="absolute top-6.5 right-4 cursor-pointer"
          onClick={() => {
            if (!disabled) setDisplay((prev) => !prev);
          }}
        />
      ) : (
        <FaEyeSlash
          className="absolute top-6.5 right-4 cursor-pointer"
          onClick={() => {
            if (!disabled) setDisplay((prev) => !prev);
          }}
        />
      )}
    </div>
  );
};

export default PasswordInput;
