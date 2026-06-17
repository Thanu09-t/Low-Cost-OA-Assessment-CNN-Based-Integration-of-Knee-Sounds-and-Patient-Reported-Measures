import React, { useEffect, useRef, useState } from 'react';
import { Activity, Disc, RefreshCw, ZoomIn } from 'lucide-react';
import { API_HOST_URL } from '../api/client';

interface SignalVisualizerProps {
  signalsPlotUrl?: string;
  spectrogramPlotUrl?: string;
  isProcessing?: boolean;
}

export const SignalVisualizer: React.FC<SignalVisualizerProps> = ({
  signalsPlotUrl,
  spectrogramPlotUrl,
  isProcessing = false
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [activeTab, setActiveTab] = useState<'plots' | 'sensor'>('plots');
  const animationRef = useRef<number | null>(null);

  // Animated Oscilloscope Simulation for low-cost sensor testing
  useEffect(() => {
    if (activeTab !== 'sensor' || !canvasRef.current) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let width = canvas.width = canvas.parentElement?.clientWidth || 600;
    let height = canvas.height = 180;
    
    // Resize handler
    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = canvas.parentElement?.clientWidth || 600;
      height = canvas.height = 180;
    };
    window.addEventListener('resize', handleResize);

    let phase = 0;
    const draw = () => {
      ctx.fillStyle = 'rgba(15, 23, 42, 0.1)'; // Slate-900 background trail
      ctx.fillRect(0, 0, width, height);

      // Grid lines
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.05)';
      ctx.lineWidth = 1;
      for (let i = 0; i < width; i += 40) {
        ctx.beginPath();
        ctx.moveTo(i, 0);
        ctx.lineTo(i, height);
        ctx.stroke();
      }
      for (let j = 0; j < height; j += 30) {
        ctx.beginPath();
        ctx.moveTo(0, j);
        ctx.lineTo(width, j);
        ctx.stroke();
      }

      // Center line
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.15)';
      ctx.beginPath();
      ctx.moveTo(0, height / 2);
      ctx.lineTo(width, height / 2);
      ctx.stroke();

      // Oscilloscope Trace (Simulating joint crepitus bursts)
      ctx.strokeStyle = '#0EA5E9'; // Sky-500
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(0, height / 2);

      for (let x = 0; x < width; x++) {
        // Base sine wave representing normal movement
        const base = Math.sin(x * 0.01 + phase) * 12;
        
        // Add random crepitus bursts (high-frequency clicks)
        let noise = 0;
        if (Math.sin(x * 0.005 + phase * 0.3) > 0.7) {
          noise = (Math.random() - 0.5) * 35 * Math.sin(x * 0.2);
        }
        
        const y = (height / 2) + base + noise;
        ctx.lineTo(x, y);
      }
      ctx.stroke();

      phase += 0.05;
      animationRef.current = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      window.removeEventListener('resize', handleResize);
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [activeTab]);

  return (
    <div className="glass-panel p-5 rounded-2xl shadow-xl transition-all duration-300">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 pb-3 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h3 className="text-lg font-bold font-display text-slate-800 dark:text-slate-100 flex items-center gap-2">
            <Activity className="h-5 w-5 text-primary" />
            Joint Acoustic Emission (KAE) Waveforms
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Real-time noise filtering, min-max energy normalization, and STFT spectrogram
          </p>
        </div>
        
        {/* Tab Selection */}
        <div className="flex bg-slate-100 dark:bg-slate-800/80 p-1 rounded-lg mt-3 sm:mt-0">
          <button
            onClick={() => setActiveTab('plots')}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
              activeTab === 'plots'
                ? 'bg-white text-primary shadow dark:bg-slate-700 dark:text-white'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-800'
            }`}
          >
            Acoustic Plots
          </button>
          <button
            onClick={() => setActiveTab('sensor')}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all flex items-center gap-1.5 ${
              activeTab === 'sensor'
                ? 'bg-white text-primary shadow dark:bg-slate-700 dark:text-white'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-800'
            }`}
          >
            <Disc className={`h-3 w-3 ${activeTab === 'sensor' ? 'animate-spin' : ''}`} />
            Live Sensor Feed
          </button>
        </div>
      </div>

      {isProcessing && (
        <div className="flex flex-col items-center justify-center py-20 bg-slate-500/5 dark:bg-slate-900/10 rounded-xl border-2 border-dashed border-slate-200 dark:border-slate-800">
          <RefreshCw className="h-10 w-10 text-primary animate-spin" />
          <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mt-4">Analyzing Acoustic Signals...</h4>
          <p className="text-xs text-slate-400 dark:text-slate-500 mt-1 max-w-xs text-center">
            Performing bandpass filtering, joint segmenting, and compiling Mel-spectrogram parameters
          </p>
        </div>
      )}

      {!isProcessing && activeTab === 'plots' && (
        <div>
          {signalsPlotUrl && spectrogramPlotUrl ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Waveform Card */}
              <div className="bg-white/80 dark:bg-slate-900/60 p-3 rounded-xl border border-slate-100 dark:border-slate-800">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">Amplitude vs Time</span>
                  <span className="text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded-full font-medium">Filter: 50Hz-1kHz</span>
                </div>
                <div className="relative group overflow-hidden rounded-lg border border-slate-100 dark:border-slate-800 bg-slate-950">
                  <img
                    src={`${API_HOST_URL}${signalsPlotUrl}`}
                    alt="Raw & Processed Signal Graphs"
                    className="w-full h-auto object-cover transform transition duration-300 hover:scale-102"
                  />
                  <div className="absolute bottom-2 right-2 bg-slate-900/80 p-1.5 rounded-full text-white cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity">
                    <ZoomIn className="h-4 w-4" />
                  </div>
                </div>
              </div>

              {/* Spectrogram Card */}
              <div className="bg-white/80 dark:bg-slate-900/60 p-3 rounded-xl border border-slate-100 dark:border-slate-800">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">Frequency vs Time (Spectrogram)</span>
                  <span className="text-[10px] bg-secondary/10 text-secondary px-2 py-0.5 rounded-full font-medium">Mel Scale (dB)</span>
                </div>
                <div className="relative group overflow-hidden rounded-lg border border-slate-100 dark:border-slate-800 bg-slate-950">
                  <img
                    src={`${API_HOST_URL}${spectrogramPlotUrl}`}
                    alt="Acoustic Spectrogram Heatmap"
                    className="w-full h-auto object-cover transform transition duration-300 hover:scale-102"
                  />
                  <div className="absolute bottom-2 right-2 bg-slate-900/80 p-1.5 rounded-full text-white cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity">
                    <ZoomIn className="h-4 w-4" />
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-16 bg-slate-100/50 dark:bg-slate-900/40 rounded-xl border border-slate-200 dark:border-slate-800 text-center">
              <Activity className="h-10 w-10 text-slate-300 dark:text-slate-700" />
              <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mt-3">No Acoustic Profile Uploaded</h4>
              <p className="text-xs text-slate-400 dark:text-slate-500 mt-1 max-w-xs">
                Upload a Knee Acoustic Emission audio (.wav) or joint amplitude signal (.csv) file in the form above to view analysis.
              </p>
            </div>
          )}
        </div>
      )}

      {activeTab === 'sensor' && (
        <div className="bg-slate-950 rounded-xl p-3 border border-slate-800 shadow-inner overflow-hidden">
          <div className="flex justify-between items-center mb-3">
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-success sensor-active"></span>
              <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">Wearable Biosensor Grid Status</span>
            </div>
            <span className="text-[10px] text-slate-500">Sampling Rate: 2000 Hz</span>
          </div>
          <div className="w-full overflow-hidden">
            <canvas ref={canvasRef} className="w-full rounded bg-slate-900/50" />
          </div>
          <div className="grid grid-cols-3 gap-2 mt-3 text-center">
            <div className="bg-slate-900/60 p-2 rounded border border-slate-800">
              <span className="block text-[10px] text-slate-500 uppercase">Input Voltage</span>
              <span className="text-xs font-bold font-mono text-success">3.3 V (Nominal)</span>
            </div>
            <div className="bg-slate-900/60 p-2 rounded border border-slate-800">
              <span className="block text-[10px] text-slate-500 uppercase">Transducer Gain</span>
              <span className="text-xs font-bold font-mono text-secondary">40 dB</span>
            </div>
            <div className="bg-slate-900/60 p-2 rounded border border-slate-800">
              <span className="block text-[10px] text-slate-500 uppercase">Frequency Cut</span>
              <span className="text-xs font-bold font-mono text-warning">HP 50 Hz</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
