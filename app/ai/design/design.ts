export type DesignSystem = {
  theme: "light" | "dark";

  primary: string;
  secondary: string;
  accent: string;

  radius: "sm" | "md" | "lg" | "xl";

  buttonStyle:
    | "solid"
    | "glass"
    | "outline";

  cardStyle:
    | "solid"
    | "glass"
    | "border";

  shadow:
    | "none"
    | "soft"
    | "strong";

  typography:
    | "modern"
    | "corporate"
    | "luxury";

  spacing:
    | "compact"
    | "comfortable"
    | "large";

  heroBackground:
    | "gradient"
    | "mesh"
    | "solid";
};

export function createDesignSystem(
  planner: {
    tone: string;
    colorPalette: string;
    background: string;
    spacing: string;
  }
): DesignSystem {

  return {

    theme: "light",

    primary: "#2563eb",

    secondary: "#1e40af",

    accent: "#60a5fa",

    radius: "xl",

    buttonStyle: "glass",

    cardStyle: "glass",

    shadow: "soft",

    typography: "modern",

    spacing: "comfortable",

    heroBackground: "gradient",

  };

}