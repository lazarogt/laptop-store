import { ReactNode } from "react";
import { motion } from "framer-motion";
import { Header } from "@/components/common/Header";
import { Footer } from "@/components/common/Footer";
import { cn } from "@/lib/utils";

type LayoutProps = {
  children: ReactNode;
  className?: string;
  showFooter?: boolean;
};

export function Layout({ children, className, showFooter = true }: LayoutProps) {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <Header />
      <motion.main
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: "easeOut" }}
        className={cn("flex-1", className)}
      >
        {children}
      </motion.main>
      {showFooter ? <Footer /> : null}
    </div>
  );
}
