/* Cấu hình Tailwind CDN dùng chung — token lấy từ stitch/academic_office_excellence/DESIGN.md */
tailwind.config = {
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        "surface": "#f8f9ff",
        "surface-dim": "#cbdbf5",
        "surface-bright": "#f8f9ff",
        "surface-container-lowest": "#ffffff",
        "surface-container-low": "#eff4ff",
        "surface-container": "#e5eeff",
        "surface-container-high": "#dce9ff",
        "surface-container-highest": "#d3e4fe",
        "on-surface": "#0b1c30",
        "on-surface-variant": "#434655",
        "inverse-surface": "#213145",
        "inverse-on-surface": "#eaf1ff",
        "outline": "#737686",
        "outline-variant": "#c3c6d7",
        "surface-tint": "#0053db",
        "primary": "#004ac6",
        "on-primary": "#ffffff",
        "primary-container": "#2563eb",
        "on-primary-container": "#eeefff",
        "inverse-primary": "#b4c5ff",
        "secondary": "#9d4300",
        "on-secondary": "#ffffff",
        "secondary-container": "#fd761a",
        "on-secondary-container": "#5c2400",
        "tertiary": "#735c00",
        "on-tertiary": "#ffffff",
        "tertiary-container": "#cea700",
        "on-tertiary-container": "#4e3d00",
        "error": "#ba1a1a",
        "on-error": "#ffffff",
        "error-container": "#ffdad6",
        "on-error-container": "#93000a",
        "primary-fixed": "#dbe1ff",
        "primary-fixed-dim": "#b4c5ff",
        "on-primary-fixed": "#00174b",
        "on-primary-fixed-variant": "#003ea8",
        "secondary-fixed": "#ffdbca",
        "secondary-fixed-dim": "#ffb690",
        "on-secondary-fixed": "#341100",
        "on-secondary-fixed-variant": "#783200",
        "tertiary-fixed": "#ffe083",
        "tertiary-fixed-dim": "#eec200",
        "on-tertiary-fixed": "#231b00",
        "on-tertiary-fixed-variant": "#574500",
        "background": "#f8f9ff",
        "on-background": "#0b1c30",
        "surface-variant": "#d3e4fe"
      },
      borderRadius: {
        DEFAULT: "0.25rem",
        lg: "0.5rem",
        xl: "0.75rem",
        "2xl": "1rem",
        "3xl": "1.5rem",
        full: "9999px"
      },
      spacing: {
        "margin-desktop": "32px",
        "margin-mobile": "16px",
        "container-max": "1280px",
        "gutter": "24px",
        "base": "4px",
        "stack-sm": "8px",
        "stack-md": "16px",
        "stack-lg": "24px"
      },
      fontFamily: {
        "be-vietnam": ["Be Vietnam Pro", "sans-serif"]
      }
    }
  }
};
