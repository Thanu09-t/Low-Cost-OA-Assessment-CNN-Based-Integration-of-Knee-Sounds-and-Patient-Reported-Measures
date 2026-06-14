import React, { useEffect, useState } from 'react';
import { LogOut, Sun, Moon, Activity } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const Navbar: React.FC = () => {
  const { user, logout } = useAuth();
  const [darkMode, setDarkMode] = useState(() => {
    return localStorage.getItem('theme') === 'dark' || 
      (!localStorage.getItem('theme') && window.matchMedia('(prefers-color-scheme: dark)').matches);
  });

  useEffect(() => {
    const root = window.document.documentElement;
    if (darkMode) {
      root.classList.add('dark');
      document.body.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      root.classList.remove('dark');
      document.body.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [darkMode]);

  return (
    <nav className="glass-panel sticky top-0 z-50 px-6 py-4 flex items-center justify-between border-b shadow-sm">
      <div className="flex items-center gap-3">
        <div className="bg-primary/10 text-primary p-2.5 rounded-2xl flex items-center justify-center">
          <Activity className="h-6 w-6" />
        </div>
        <div>
          <h1 className="text-lg font-black tracking-tight font-display text-slate-800 dark:text-slate-100 leading-none">
            OA Insight
          </h1>
          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block mt-0.5">
            Low-Cost OA Assessment System
          </span>
        </div>
      </div>

      <div className="flex items-center gap-4">
        {/* Dark Mode Switch */}
        <button
          onClick={() => setDarkMode(!darkMode)}
          className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition"
        >
          {darkMode ? <Sun className="h-4.5 w-4.5" /> : <Moon className="h-4.5 w-4.5" />}
        </button>

        {user && (
          <div className="flex items-center gap-3 pl-3 border-l border-slate-200 dark:border-slate-800">
            <div className="text-right hidden sm:block">
              <span className="block text-xs font-bold text-slate-700 dark:text-slate-300">{user.name}</span>
              <span className={`inline-block text-[9px] font-extrabold uppercase px-2 py-0.5 rounded-full mt-0.5 ${
                user.role === 'doctor' 
                  ? 'bg-primary/10 text-primary' 
                  : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300'
              }`}>
                {user.role}
              </span>
            </div>
            
            <button
              onClick={logout}
              className="p-2 rounded-xl text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 transition"
              title="Logout"
            >
              <LogOut className="h-4.5 w-4.5" />
            </button>
          </div>
        )}
      </div>
    </nav>
  );
};
