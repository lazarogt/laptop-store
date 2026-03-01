import { memo, ReactNode } from "react";
import { motion, type HTMLMotionProps } from "framer-motion";
import { cn } from "@/lib/utils";

type IconButtonProps = HTMLMotionProps<"button"> & {
  icon: ReactNode;
  label: string;
  isActive?: boolean;
};

function IconButtonComponent({ icon, label, isActive = false, className, ...props }: IconButtonProps) {
  return (
    <motion.button
      type="button"
      aria-label={label}
      title={label}
      whileHover={{ y: -2, scale: 1.02 }}
      whileTap={{ scale: 0.95 }}
      transition={{ duration: 0.25, ease: "easeOut" }}
      className={cn(
        "inline-flex h-11 w-11 items-center justify-center rounded-2xl border text-slate-600",
        "bg-white/80 border-slate-200/80 shadow-sm backdrop-blur",
        "hover:bg-white hover:text-slate-900 hover:shadow-md",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-300",
        isActive && "text-rose-500 bg-rose-50 border-rose-100",
        className
      )}
      {...props}
    >
      {icon}
    </motion.button>
  );
}

export const IconButton = memo(IconButtonComponent);
