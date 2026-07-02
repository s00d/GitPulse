import { tv } from "./tv";

export const uiControlSizes = {
  "2xs": "2xs",
  xs: "xs",
  sm: "sm",
  md: "md",
  lg: "lg",
  xl: "xl",
} as const;

export type UiControlSize = keyof typeof uiControlSizes;

export const uiSizeClasses = {
  button: {
    "2xs": "h-7 px-2 text-[10px] sm:h-7 sm:px-2 sm:text-[10px]",
    xs: "h-8 px-2.5 text-xs sm:h-8 sm:px-2.5 sm:text-xs",
    sm: "h-8.5 px-2.5 text-xs sm:h-9 sm:px-3 sm:text-sm",
    md: "h-9 px-3 text-sm sm:h-10 sm:px-4 sm:text-sm",
    lg: "h-10 px-3.5 text-sm sm:h-11 sm:px-5 sm:text-base",
    xl: "h-11 px-4 text-base sm:h-12 sm:px-6 sm:text-lg",
  },
  input: {
    "2xs": "h-7 px-2 text-[10px] sm:h-7 sm:px-2 sm:text-[10px]",
    xs: "h-8 px-2.5 text-xs sm:h-8 sm:px-2.5 sm:text-xs",
    sm: "h-8.5 px-2.5 text-xs sm:h-9 sm:px-3 sm:text-sm",
    md: "h-9 px-3 text-sm sm:h-10 sm:px-3.5 sm:text-sm",
    lg: "h-10 px-3.5 text-sm sm:h-11 sm:px-4 sm:text-base",
    xl: "h-11 px-4 text-base sm:h-12 sm:px-4.5 sm:text-lg",
  },
  icon: {
    "2xs": "12px",
    xs: "14px",
    sm: "16px",
    md: "18px",
    lg: "20px",
    xl: "24px",
  },
} as const;

export const uiMotion = {
  fast: "duration-150 ease-out",
  base: "duration-200 ease-out",
  slow: "duration-300 ease-out",
  enter: "transition-opacity transition-transform duration-200 ease-out opacity-100 scale-100",
  exit: "transition-opacity transition-transform duration-150 ease-in",
} as const;

export const controlStyles = tv({
  slots: {
    root: "inline-flex items-center gap-2 sm:gap-2.5",
    label: "text-sm font-medium text-slate-700 dark:text-slate-200",
    help: "text-xs text-slate-500 dark:text-slate-400",
    error: "text-xs text-rose-600 dark:text-rose-400",
  },
});

export const fieldStyles = tv({
  slots: {
    wrapper: "flex flex-col gap-1.5 sm:gap-2",
    label: "text-sm font-medium text-slate-700 dark:text-slate-200",
    helper: "text-xs text-slate-500 dark:text-slate-400",
    error: "text-xs text-rose-600 dark:text-rose-400",
  },
});
