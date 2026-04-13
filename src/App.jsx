import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import { Camera, Map as MapIcon, History as HistoryIcon, Sun, Moon } from 'lucide-react';
import CaptureScreen from './pages/CaptureScreen';
import MapDashboard from './pages/MapDashboard';
import ResultScreen from './pages/ResultScreen';
import History from './pages/History';

function App() {
  const [isDarkMode, setIsDarkMode] = useState(() => {
    const saved = localStorage.getItem('theme');
    if (saved) return saved === 'dark';
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [isDarkMode]);

  return (
    <Router>
      <div className="min-h-screen bg-base flex flex-col">
        <header className="bg-surface border-b border-primary/20 p-4 shadow-md flex justify-between items-center">
          <h1 className="text-2xl font-bold text-accent tracking-wide">RetroScan<span className="dark:text-gray-100 text-gray-800">AI</span></h1>
          <button 
            onClick={() => setIsDarkMode(!isDarkMode)} 
            className="p-2 rounded-full hover:bg-primary/10 transition-colors"
          >
            {isDarkMode ? <Sun className="w-6 h-6 text-yellow-400" /> : <Moon className="w-6 h-6 text-gray-600" />}
          </button>
        </header>

        <main className="flex-grow pb-20 overflow-y-auto">
          <Routes>
            <Route path="/" element={<CaptureScreen />} />
            <Route path="/map" element={<MapDashboard isDarkMode={isDarkMode} />} />
            <Route path="/result" element={<ResultScreen />} />
            <Route path="/history" element={<History />} />
          </Routes>
        </main>

        {/* Bottom Navigation */}
        <nav className="fixed bottom-0 w-full bg-surface border-t border-primary/20 px-6 py-4 flex justify-around shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)] dark:shadow-none">
          <Link to="/" className="flex flex-col items-center text-gray-500 dark:text-gray-400 hover:text-accent dark:hover:text-accent transition-colors">
            <Camera className="w-6 h-6 mb-1" />
            <span className="text-xs font-medium">Scan</span>
          </Link>
          <Link to="/map" className="flex flex-col items-center text-gray-500 dark:text-gray-400 hover:text-accent transition-colors">
            <MapIcon className="w-6 h-6 mb-1" />
            <span className="text-xs font-medium">Map</span>
          </Link>
          <Link to="/history" className="flex flex-col items-center text-gray-500 dark:text-gray-400 hover:text-accent transition-colors">
            <HistoryIcon className="w-6 h-6 mb-1" />
            <span className="text-xs font-medium">History</span>
          </Link>
        </nav>
      </div>
    </Router>
  );
}

export default App;