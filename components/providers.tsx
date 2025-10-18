"use client";

import { ThemeProvider } from "@/lib/theme-provider";
// import { TutorialProvider } from "@/contexts/TutorialContext";
// import { TutorialOverlay } from "@/components/tutorial/TutorialOverlay";
// import { TutorialCompletionModal } from "@/components/tutorial/TutorialCompletionModal";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      {/* <TutorialProvider> */}
        {children}
        {/* <TutorialOverlay />
        <TutorialCompletionModal /> */}
      {/* </TutorialProvider> */}
    </ThemeProvider>
  );
}
