import React from 'react';
import { ClipboardCheck, History, Users, BarChart3, HelpCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface SidebarItem {
  id: string;
  label: string;
  icon: React.ReactNode;
}

interface DashboardLayoutProps {
  children: React.ReactNode;
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export const DashboardLayout: React.FC<DashboardLayoutProps> = ({
  children,
  activeTab,
  setActiveTab
}) => {
  const { user } = useAuth();
  
  const patientItems: SidebarItem[] = [
    { 
      id: 'wizard', 
      label: 'Assessment Wizard', 
      icon: <ClipboardCheck className="h-5 w-5" /> 
    },
    { 
      id: 'history', 
      label: 'Joint Health History', 
      icon: <History className="h-5 w-5" /> 
    }
  ];

  const doctorItems: SidebarItem[] = [
    { 
      id: 'registry', 
      label: 'Patient Registry', 
      icon: <Users className="h-5 w-5" /> 
    },
    { 
      id: 'analytics', 
      label: 'Clinical Analytics', 
      icon: <BarChart3 className="h-5 w-5" /> 
    }
  ];

  const menuItems = user?.role === 'doctor' ? doctorItems : patientItems;

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* === Background Images === */}
      {/* Bottom-left: Knee Joint Glow */}
      <div
        className="fixed bottom-0 left-0 w-[55%] h-[70%] pointer-events-none z-0"
        style={{
          backgroundImage: `url('/knee-joint-glow.png')`,
          backgroundSize: 'cover',
          backgroundPosition: 'center top',
          backgroundRepeat: 'no-repeat',
          opacity: 0.28,
          maskImage: 'radial-gradient(ellipse at 20% 80%, black 30%, transparent 80%)',
          WebkitMaskImage: 'radial-gradient(ellipse at 20% 80%, black 30%, transparent 80%)',
        }}
      />
      {/* Top-right: Bone Structure */}
      <div
        className="fixed top-0 right-0 w-[50%] h-[65%] pointer-events-none z-0"
        style={{
          backgroundImage: `url('/bone-structure.png')`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
          opacity: 0.22,
          maskImage: 'radial-gradient(ellipse at 80% 20%, black 30%, transparent 75%)',
          WebkitMaskImage: 'radial-gradient(ellipse at 80% 20%, black 30%, transparent 75%)',
        }}
      />

      {/* Base background */}
      <div className="fixed inset-0 bg-slate-50 dark:bg-slate-950 -z-10" />

      {/* Layout */}
      <div className="relative z-10 flex flex-col md:flex-row min-h-screen">
        {/* Sidebar Navigation */}
        <aside className="w-full md:w-64 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border-r border-slate-200/70 dark:border-slate-800/70 flex flex-col p-4 flex-shrink-0">
          <div className="mb-6 hidden md:block px-2">
            <span className="text-[10px] font-extrabold uppercase tracking-[0.15em] text-slate-400 dark:text-slate-500 font-display">
              Navigation Menu
            </span>
          </div>

          <nav className="space-y-1 flex-1 flex md:flex-col flex-wrap md:flex-nowrap gap-1">
            {menuItems.map((item) => {
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                    isActive
                      ? 'bg-primary text-white shadow-md shadow-primary/25'
                      : 'text-slate-600 hover:bg-slate-100/80 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800/60 dark:hover:text-slate-100'
                  }`}
                >
                  {item.icon}
                  <span className="hidden sm:inline font-display">{item.label}</span>
                </button>
              );
            })}
          </nav>

          {/* Sidebar Footer info card */}
          <div className="mt-auto pt-6 border-t border-slate-200/60 dark:border-slate-800/60 hidden md:block">
            <div className="bg-gradient-to-br from-slate-50 to-blue-50/50 dark:from-slate-950 dark:to-indigo-950/30 p-3.5 rounded-xl border border-slate-200/50 dark:border-slate-800/60">
              <h5 className="text-[11px] font-extrabold text-slate-700 dark:text-slate-300 flex items-center gap-1.5 uppercase tracking-wide font-display">
                <HelpCircle className="h-4 w-4 text-primary" />
                Low-Cost Sensors
              </h5>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                Connect and test acoustic transducers via normal audio ports. Early detections prevent joint surgeries.
              </p>
            </div>
          </div>
        </aside>

        {/* Main Content Area */}
        <main className="flex-1 p-6 md:p-8 overflow-y-auto max-w-7xl mx-auto w-full">
          {children}
        </main>
      </div>
    </div>
  );
};
