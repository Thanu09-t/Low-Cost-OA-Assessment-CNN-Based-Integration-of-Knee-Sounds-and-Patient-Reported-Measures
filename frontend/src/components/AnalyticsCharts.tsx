import React from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  Cell
} from 'recharts';
import { Calendar, TrendingUp, AlertTriangle } from 'lucide-react';

interface TrendData {
  date: string;
  womac: number;
  koos: number;
  pain: number;
  risk: number;
}

interface DistributionData {
  severity: string;
  count: number;
}

interface AnalyticsChartsProps {
  trendData?: TrendData[];
  distributionData?: DistributionData[];
  type?: 'patient' | 'doctor';
}

export const AnalyticsCharts: React.FC<AnalyticsChartsProps> = ({
  trendData = [],
  distributionData = [],
  type = "patient"
}) => {
  
  const COLORS = {
    "Normal": "#22C55E",      // Success
    "Mild OA": "#F59E0B",     // Warning
    "Moderate OA": "#EA580C", // Orange-600
    "Severe OA": "#EF4444"    // Danger
  };

  const getSeverityColor = (severity: string) => {
    return COLORS[severity as keyof typeof COLORS] || "#2563EB";
  };

  if (type === 'patient') {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pain & Function progression line chart */}
        <div className="glass-panel p-5 rounded-2xl shadow-lg">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-800 dark:text-slate-100 flex items-center gap-2">
                <TrendingUp className="h-4.5 w-4.5 text-primary" />
                WOMAC & KOOS Health Progression
              </h3>
              <p className="text-[11px] text-slate-400">Clinical score indices over previous assessments</p>
            </div>
          </div>
          
          <div className="h-64 w-full">
            {trendData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={trendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(226,232,240,0.15)" />
                  <XAxis dataKey="date" stroke="#94A3B8" fontSize={10} />
                  <YAxis domain={[0, 100]} stroke="#94A3B8" fontSize={10} />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'rgba(30, 41, 59, 0.9)', 
                      border: 'none', 
                      borderRadius: '8px',
                      color: '#fff',
                      fontSize: '11px'
                    }} 
                  />
                  <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                  <Line 
                    type="monotone" 
                    dataKey="koos" 
                    name="KOOS Index (Better ↑)" 
                    stroke="#0EA5E9" 
                    strokeWidth={3} 
                    activeDot={{ r: 8 }} 
                  />
                  <Line 
                    type="monotone" 
                    dataKey="womac" 
                    name="WOMAC Score (Worse ↓)" 
                    stroke="#EF4444" 
                    strokeWidth={2} 
                    strokeDasharray="5 5" 
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-slate-400">
                <Calendar className="h-8 w-8 mb-2 stroke-1" />
                <span className="text-xs">No historical data available</span>
              </div>
            )}
          </div>
        </div>

        {/* Joint Friction & Risk level index chart */}
        <div className="glass-panel p-5 rounded-2xl shadow-lg">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-800 dark:text-slate-100 flex items-center gap-2">
                <AlertTriangle className="h-4.5 w-4.5 text-warning" />
                Estimated Joint Risk & Pain Indices
              </h3>
              <p className="text-[11px] text-slate-400">Attributed pain intensity and CNN risk scores</p>
            </div>
          </div>

          <div className="h-64 w-full">
            {trendData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={trendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(226,232,240,0.15)" />
                  <XAxis dataKey="date" stroke="#94A3B8" fontSize={10} />
                  <YAxis domain={[0, 100]} stroke="#94A3B8" fontSize={10} />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'rgba(30, 41, 59, 0.9)', 
                      border: 'none', 
                      borderRadius: '8px',
                      color: '#fff',
                      fontSize: '11px'
                    }} 
                  />
                  <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                  <Line 
                    type="monotone" 
                    dataKey="risk" 
                    name="Composite Risk Score" 
                    stroke="#F59E0B" 
                    strokeWidth={3} 
                  />
                  <Line 
                    type="monotone" 
                    dataKey="pain" 
                    name="Pain Score (x5)" 
                    stroke="#EC4899" 
                    strokeWidth={2} 
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-slate-400">
                <Calendar className="h-8 w-8 mb-2 stroke-1" />
                <span className="text-xs">No historical data available</span>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Doctor view cohort stats
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* 1. Bar Chart for Severity Distribution */}
      <div className="glass-panel p-5 rounded-2xl shadow-lg">
        <h3 className="text-sm font-bold uppercase tracking-wider text-slate-800 dark:text-slate-100 mb-4 flex items-center gap-2">
          <AlertTriangle className="h-4.5 w-4.5 text-primary" />
          Cohort Severity Distribution
        </h3>
        
        <div className="h-64 w-full">
          {distributionData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={distributionData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(226,232,240,0.15)" />
                <XAxis dataKey="severity" stroke="#94A3B8" fontSize={10} />
                <YAxis allowDecimals={false} stroke="#94A3B8" fontSize={10} />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'rgba(30, 41, 59, 0.9)', 
                    border: 'none', 
                    borderRadius: '8px',
                    color: '#fff',
                    fontSize: '11px'
                  }} 
                />
                <Bar dataKey="count" name="Patient Count" radius={[4, 4, 0, 0]}>
                  {distributionData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={getSeverityColor(entry.severity)} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-slate-400">
              <span className="text-xs">No severity data compiled yet</span>
            </div>
          )}
        </div>
      </div>

      {/* 2. Line Chart for Cohort progression over time */}
      <div className="glass-panel p-5 rounded-2xl shadow-lg">
        <h3 className="text-sm font-bold uppercase tracking-wider text-slate-800 dark:text-slate-100 mb-4 flex items-center gap-2">
          <TrendingUp className="h-4.5 w-4.5 text-secondary" />
          Clinical Averages Trend
        </h3>

        <div className="h-64 w-full">
          {trendData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(226,232,240,0.15)" />
                <XAxis dataKey="date" stroke="#94A3B8" fontSize={10} />
                <YAxis stroke="#94A3B8" fontSize={10} />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'rgba(30, 41, 59, 0.9)', 
                    border: 'none', 
                    borderRadius: '8px',
                    color: '#fff',
                    fontSize: '11px'
                  }} 
                />
                <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                <Line type="monotone" dataKey="koos" name="Avg KOOS" stroke="#0EA5E9" strokeWidth={2.5} />
                <Line type="monotone" dataKey="womac" name="Avg WOMAC" stroke="#EF4444" strokeWidth={2} />
                <Line type="monotone" dataKey="risk" name="Avg Risk Score" stroke="#F59E0B" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-slate-400">
              <span className="text-xs">No progression history available</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
