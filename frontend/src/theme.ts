import { createTheme } from '@mui/material/styles';

const theme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: '#3b82f6', // Blue primary - Tech inspired
      light: '#60a5fa', // blue-400
      dark: '#1d4ed8', // blue-700
    },
    secondary: {
      main: '#34d399', // Emerald secondary
      light: '#6ee7b7', // emerald-300
      dark: '#10b981', // emerald-500
    },
    warning: {
      main: '#f59e0b', // Amber warning
      light: '#fbbf24', // amber-400
      dark: '#d97706', // amber-600
    },
    info: {
      main: '#0ea5e9', // Sky blue info
      light: '#38bdf8', // sky-400
      dark: '#0284c7', // sky-600
    },
    success: {
      main: '#22c55e', // Green success
      light: '#4ade80', // green-400
      dark: '#16a34a', // green-600
    },
    error: {
      main: '#ef4444', // Red error
      light: '#f87171', // red-400
      dark: '#dc2626', // red-600
    },
    background: {
      default: '#0f172a', // Dark slate background
      paper: 'rgba(30, 41, 59, 0.8)', // Semi-transparent dark
    },
    text: {
      primary: '#f8fafc', // Light text
      secondary: '#94a3b8', // Slate-400
    },
    divider: 'rgba(255, 255, 255, 0.1)',
    grey: {
      50: '#f8fafc', // Slate-50
      100: '#f1f5f9', // Slate-100
      200: '#e2e8f0', // Slate-200
      300: '#cbd5e1', // Slate-300
      400: '#94a3b8', // Slate-400
      500: '#64748b', // Slate-500
      600: '#475569', // Slate-600
      700: '#334155', // Slate-700
      800: '#1e293b', // Slate-800
      900: '#0f172a', // Slate-900
    },
  },
  typography: {
    fontFamily: '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    h1: {
      fontSize: '2.5rem',
      fontWeight: 600,
      lineHeight: 1.2,
    },
    h2: {
      fontSize: '2rem',
      fontWeight: 600,
      lineHeight: 1.3,
    },
    h3: {
      fontSize: '1.5rem',
      fontWeight: 600,
      lineHeight: 1.4,
    },
    h4: {
      fontSize: '1.25rem',
      fontWeight: 600,
      lineHeight: 1.4,
    },
    h5: {
      fontSize: '1.125rem',
      fontWeight: 600,
      lineHeight: 1.5,
    },
    h6: {
      fontSize: '1rem',
      fontWeight: 600,
      lineHeight: 1.5,
    },
    body1: {
      fontSize: '1rem',
      lineHeight: 1.5,
    },
    body2: {
      fontSize: '0.875rem',
      lineHeight: 1.5,
    },
    button: {
      fontSize: '0.875rem',
      fontWeight: 500,
      textTransform: 'none' as const,
    },
  },
  shape: {
    borderRadius: 12,
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          textTransform: 'none',
          fontWeight: 500,
          padding: '12px 24px',
          boxShadow: 'none',
          '&:hover': {
            boxShadow: 'none',
          },
        },
        contained: {
          background: 'linear-gradient(135deg, #3b82f6 0%, #1e40af 100%)',
          color: '#ffffff',
          '&:hover': {
            background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
            transform: 'translateY(-1px)',
            boxShadow: '0 8px 25px rgba(59, 130, 246, 0.25)',
          },
        },
        outlined: {
          borderColor: 'rgba(59, 130, 246, 0.3)',
          color: '#3b82f6',
          '&:hover': {
            borderColor: '#3b82f6',
            backgroundColor: 'rgba(59, 130, 246, 0.08)',
            transform: 'translateY(-1px)',
          },
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 16,
          boxShadow: '0 4px 20px rgba(249, 115, 22, 0.08)',
          border: '1px solid rgba(120, 113, 108, 0.12)',
          background: 'linear-gradient(145deg, #ffffff 0%, #fffbf5 100%)',
        },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            borderRadius: 12,
            backgroundColor: '#fafaf9',
            '& fieldset': {
              borderColor: 'rgba(120, 113, 108, 0.24)',
            },
            '&:hover fieldset': {
              borderColor: 'rgba(59, 130, 246, 0.5)',
            },
            '&.Mui-focused fieldset': {
              borderColor: '#3b82f6',
              borderWidth: '2px',
            },
          },
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          fontWeight: 500,
        },
      },
    },
  },
});

export default theme;
