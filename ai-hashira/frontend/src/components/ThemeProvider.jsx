import { useEffect } from 'react';
import { useThemeStore } from '../store/useThemeStore';

const ThemeProvider = ({ children }) => {
  const { theme } = useThemeStore();

  useEffect(() => {
    // Apply theme to html element
    document.documentElement.setAttribute('data-theme', theme);
    
    // Also apply to body for good measure
    document.body.setAttribute('data-theme', theme);
  }, [theme]);

  return children;
};

export default ThemeProvider;