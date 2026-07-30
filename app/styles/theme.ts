import type { Theme } from "@/app/types/landing";

export interface ThemeConfig {
  colors: {
    background: string;
    surface: string;
    card: string;

    primary: string;
    secondary: string;

    border: string;

    accent: string;
    accentHover: string;

    success: string;
    warning: string;
    danger: string;
  };

  gradients: {
    hero: string;
    button: string;
    glow: string;
  };

  radius: {
    sm: string;
    md: string;
    lg: string;
    xl: string;
  };

  spacing: {
    xs: string;
    sm: string;
    md: string;
    lg: string;
    xl: string;
  };

  shadow: {
    sm: string;
    md: string;
    lg: string;
    glow: string;
  };

  typography: {
    hero: string;
    title: string;
    subtitle: string;
    body: string;
    button: string;
  };

  animation: {
    fast: string;
    normal: string;
    slow: string;
  };
}

const base = {
  radius: {
    sm: "8px",
    md: "16px",
    lg: "24px",
    xl: "32px",
  },

  spacing: {
    xs: "8px",
    sm: "16px",
    md: "24px",
    lg: "48px",
    xl: "80px",
  },

  shadow: {
    sm: "0 2px 8px rgba(0,0,0,.12)",
    md: "0 10px 30px rgba(0,0,0,.20)",
    lg: "0 30px 80px rgba(0,0,0,.35)",
    glow: "0 0 60px rgba(99,102,241,.35)",
  },

  typography: {
    hero: "text-6xl md:text-7xl font-black tracking-tight",
    title: "text-4xl font-bold",
    subtitle: "text-xl leading-relaxed",
    body: "text-base leading-7",
    button: "font-semibold",
  },

  animation: {
    fast: "transition-all duration-200",
    normal: "transition-all duration-300",
    slow: "transition-all duration-500",
  },
};

export const themes: Record<Theme, ThemeConfig> = {
  startup: {
    ...base,

    colors: {
      background: "#050505",
      surface: "#111111",
      card: "#18181b",

      primary: "#ffffff",
      secondary: "#a1a1aa",

      border: "#27272a",

      accent: "#4f46e5",
      accentHover: "#6366f1",

      success: "#22c55e",
      warning: "#f59e0b",
      danger: "#ef4444",
    },

    gradients: {
      hero: "linear-gradient(135deg,#4f46e5,#7c3aed)",
      button: "linear-gradient(135deg,#4f46e5,#6366f1)",
      glow: "radial-gradient(circle,#6366f155,transparent)",
    },
  },

  luxury: {
    ...base,

    colors: {
      background: "#050505",
      surface: "#111111",
      card: "#1b1b1b",

      primary: "#f5e6b3",
      secondary: "#d6c68a",

      border: "#5d4b1f",

      accent: "#d4af37",
      accentHover: "#e6c85c",

      success: "#65a30d",
      warning: "#ca8a04",
      danger: "#dc2626",
    },

    gradients: {
      hero: "linear-gradient(135deg,#d4af37,#f5e6b3)",
      button: "linear-gradient(135deg,#d4af37,#fcd34d)",
      glow: "radial-gradient(circle,#d4af3744,transparent)",
    },
  },

  agency: {
    ...base,

    colors: {
      background: "#07111f",
      surface: "#0d1728",
      card: "#132036",

      primary: "#ffffff",
      secondary: "#cbd5e1",

      border: "#23314b",

      accent: "#3b82f6",
      accentHover: "#60a5fa",

      success: "#10b981",
      warning: "#f59e0b",
      danger: "#ef4444",
    },

    gradients: {
      hero: "linear-gradient(135deg,#2563eb,#3b82f6)",
      button: "linear-gradient(135deg,#2563eb,#60a5fa)",
      glow: "radial-gradient(circle,#3b82f644,transparent)",
    },
  },

  medical: {
    ...base,

    colors: {
      background: "#f8fbff",
      surface: "#ffffff",
      card: "#ffffff",

      primary: "#0f172a",
      secondary: "#475569",

      border: "#dbeafe",

      accent: "#2563eb",
      accentHover: "#1d4ed8",

      success: "#16a34a",
      warning: "#f59e0b",
      danger: "#dc2626",
    },

    gradients: {
      hero: "linear-gradient(135deg,#2563eb,#38bdf8)",
      button: "linear-gradient(135deg,#2563eb,#3b82f6)",
      glow: "radial-gradient(circle,#3b82f633,transparent)",
    },
  },

  restaurant: {
    ...base,

    colors: {
      background: "#120b08",
      surface: "#1b120d",
      card: "#241812",

      primary: "#fff7ed",
      secondary: "#fdba74",

      border: "#7c2d12",

      accent: "#ea580c",
      accentHover: "#f97316",

      success: "#22c55e",
      warning: "#facc15",
      danger: "#dc2626",
    },

    gradients: {
      hero: "linear-gradient(135deg,#ea580c,#fb923c)",
      button: "linear-gradient(135deg,#ea580c,#f97316)",
      glow: "radial-gradient(circle,#ea580c44,transparent)",
    },
  },

  fitness: {
    ...base,

    colors: {
      background: "#050505",
      surface: "#111111",
      card: "#18181b",

      primary: "#ffffff",
      secondary: "#d4d4d8",

      border: "#3f3f46",

      accent: "#dc2626",
      accentHover: "#ef4444",

      success: "#22c55e",
      warning: "#f59e0b",
      danger: "#dc2626",
    },

    gradients: {
      hero: "linear-gradient(135deg,#dc2626,#ef4444)",
      button: "linear-gradient(135deg,#dc2626,#ef4444)",
      glow: "radial-gradient(circle,#dc262644,transparent)",
    },
  },
};

export function getTheme(theme: Theme): ThemeConfig {
  return themes[theme];
}