// Load polyfills FIRST before anything else
import './src/polyfills';

// Register the app
import { registerRootComponent } from 'expo';
import App from './App';

registerRootComponent(App);
