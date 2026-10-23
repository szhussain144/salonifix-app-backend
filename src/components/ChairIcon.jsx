import { forwardRef } from "react";

/* The "Chair" icon from the Salonifix Brand Guide (05 Icon set): the logo's
   chair redrawn as a 24-unit line icon with a 2-unit stroke. Same props as
   the lucide-react icons it sits beside (size, strokeWidth, className, …),
   so it can be passed anywhere an `icon` component is expected. */
const ChairIcon = forwardRef(function ChairIcon({ size = 24, strokeWidth = 2, color = "currentColor", ...props }, ref) {
  return (
    <svg
      ref={ref}
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      {...props}
    >
      <path d="M7 14V7a3 3 0 0 1 3-3" />
      <path d="M7 14h10" />
      <path d="M13 14v6" />
      <path d="M9 20h8" />
    </svg>
  );
});

export default ChairIcon;
