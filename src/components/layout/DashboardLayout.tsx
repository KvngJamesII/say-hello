import React from 'react';
import { useLocation } from 'wouter';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import { AppSidebar } from './AppSidebar';
import { AppHeader } from './AppHeader';
import { motion, AnimatePresence } from 'framer-motion';

interface Props {
  children: React.ReactNode;
  /** Render content in a flex column with no inner padding/width cap (for IDE-like pages). */
  fullHeight?: boolean;
}

export const DashboardLayout: React.FC<Props> = ({ children, fullHeight }) => {
  const [location] = useLocation();

  return (
    <SidebarProvider defaultOpen>
      <div className="flex w-full h-screen bg-[--bg-primary] text-[--text-primary] overflow-hidden">
        <AppSidebar />
        <SidebarInset className="flex-1 flex flex-col h-screen min-w-0 bg-[--bg-primary]">
          <AppHeader />

          {fullHeight ? (
            <main className="flex-1 min-h-0 flex flex-col overflow-hidden">
              {children}
            </main>
          ) : (
            <main className="flex-1 min-h-0 overflow-y-auto scrollbar-thin">
              <AnimatePresence mode="wait">
                <motion.div
                  key={location}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  transition={{ duration: 0.18, ease: 'easeOut' }}
                  className="px-4 sm:px-6 lg:px-8 py-6 lg:py-8 max-w-[1400px] mx-auto w-full"
                >
                  {children}
                </motion.div>
              </AnimatePresence>
            </main>
          )}
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
};
