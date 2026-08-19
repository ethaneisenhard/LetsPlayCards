import { createRoot } from 'react-dom/client';
import { App } from './app';
import { bootAppearance } from './lib/appearance';

bootAppearance();
createRoot(document.getElementById('root')!).render(<App />);
