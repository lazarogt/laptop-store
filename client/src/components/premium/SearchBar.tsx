import { FormEvent } from "react";
import { motion } from "framer-motion";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type SearchBarProps = {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  placeholder?: string;
  className?: string;
};

export function SearchBar({
  value,
  onChange,
  onSubmit,
  placeholder = "Buscar laptops, marcas o especificaciones",
  className,
}: SearchBarProps) {
  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    onSubmit();
  };

  return (
    <form onSubmit={handleSubmit} className={cn("relative w-full", className)}>
      <Input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className={cn(
          "h-12 rounded-2xl border-slate-200/80 bg-white/85 pr-14 text-[15px] shadow-sm",
          "placeholder:text-slate-400 focus-visible:ring-slate-300"
        )}
      />
      <motion.button
        type="submit"
        aria-label="Buscar"
        whileHover={{ y: -2 }}
        whileTap={{ scale: 0.95 }}
        transition={{ duration: 0.25, ease: "easeOut" }}
        className={cn(
          "absolute right-1.5 top-1.5 inline-flex h-9 w-9 items-center justify-center rounded-xl",
          "bg-slate-900 text-white shadow-sm transition-colors duration-300 hover:bg-slate-800"
        )}
      >
        <Search className="h-4 w-4" />
      </motion.button>
    </form>
  );
}
