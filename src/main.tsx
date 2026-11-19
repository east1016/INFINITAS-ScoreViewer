import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { AppProvider } from './context/AppContext';
import { CssBaseline } from '@mui/material';
import { ThemeProvider } from '@mui/material/styles';
import { theme } from './theme';

document.body.style.visibility = 'visible';

const root = ReactDOM.createRoot(document.getElementById('root')!);
root.render(
  <React.StrictMode>
    <AppProvider>
      <ThemeProvider theme={theme}>  
      <CssBaseline />
      <App />
          </ThemeProvider>
    </AppProvider>
  </React.StrictMode>
);