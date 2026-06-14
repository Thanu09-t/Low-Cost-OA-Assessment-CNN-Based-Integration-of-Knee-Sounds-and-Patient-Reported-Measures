import React, { useState } from 'react';
import { FileDown, ShieldCheck, Heart, User, ClipboardList, Sparkles, Check, Edit3, RefreshCw } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { apiRequest } from '../api/client';

interface AssessmentReportProps {
  assessment: any;
  onUpdateRecommendations?: (newRec: string) => Promise<void>;
}

export const AssessmentReport: React.FC<AssessmentReportProps> = ({ 
  assessment,
  onUpdateRecommendations
}) => {
  const { user } = useAuth();
  const [isUpdatingRec, setIsUpdatingRec] = useState(false);
  const [recommendationsInput, setRecommendationsInput] = useState(assessment.recommendations || '');
  const [recUpdateSuccess, setRecUpdateSuccess] = useState(false);
  
  // Destructure assessment metrics
  const {
    id,
    severity,
    confidence,
    risk_score,
    womac_score,
    koos_score,
    assessment_date,
    signal_file_name
  } = assessment;

  // Extract raw survey variables & XAI details
  const questionnaire = assessment.questionnaire || {};
  const rawData = questionnaire.raw_responses || {};
  const xai = rawData.xai_insights || {
    clinical_contribution: 60,
    acoustic_contribution: 40,
    risk_factors: ["Acoustic click indicators detected", "Impaired joint mobility"],
    recommendations: assessment.recommendations
  };

  const severityConfigs: Record<string, { bg: string; text: string; border: string; desc: string }> = {
    "Normal": {
      bg: "bg-emerald-50 dark:bg-emerald-950/20",
      text: "text-emerald-700 dark:text-emerald-400",
      border: "border-emerald-200 dark:border-emerald-900/50",
      desc: "Healthy knee joint structure with smooth articulation and zero detectable acoustic crepitus signals."
    },
    "Mild OA": {
      bg: "bg-yellow-50 dark:bg-yellow-950/20",
      text: "text-yellow-700 dark:text-yellow-400",
      border: "border-yellow-200 dark:border-yellow-900/50",
      desc: "Early sign of cartilage erosion. Minor acoustic clicking detected during load bearing or flexion."
    },
    "Moderate OA": {
      bg: "bg-orange-50 dark:bg-orange-950/20",
      text: "text-orange-700 dark:text-orange-400",
      border: "border-orange-200 dark:border-orange-900/50",
      desc: "Intermediate progression. Cartilage narrowing is apparent. Joint friction clicks are frequent and localized."
    },
    "Severe OA": {
      bg: "bg-red-50 dark:bg-red-950/20",
      text: "text-red-700 dark:text-red-400",
      border: "border-red-200 dark:border-red-900/50",
      desc: "Severe joint space loss. Frequent bone-on-bone friction bursts. Daily physical activities are significantly limited."
    }
  };

  const config = severityConfigs[severity || "Normal"] || severityConfigs["Normal"];

  const handleDownloadPDF = async () => {
    try {
      const response = await apiRequest(`/assessments/${id}/download-report`, {
        method: 'GET',
      });
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `OA_Assessment_${id.slice(0, 8)}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.parentNode?.removeChild(link);
    } catch (error) {
      alert('Could not download PDF report. Please verify backend state.');
    }
  };

  const handleSaveRecommendations = async () => {
    if (!onUpdateRecommendations) return;
    setIsUpdatingRec(true);
    try {
      await onUpdateRecommendations(recommendationsInput);
      setRecUpdateSuccess(true);
      setTimeout(() => setRecUpdateSuccess(false), 3000);
    } catch (e) {
      alert('Failed to save recommendations.');
    } finally {
      setIsUpdatingRec(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. Main Severity Dashboard Card */}
      <div className={`border rounded-2xl p-6 shadow-md transition-all ${config.bg} ${config.border}`}>
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <span className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400 dark:text-slate-500 block mb-1">
              AI CLASSIFICATION REPORT
            </span>
            <h2 className={`text-2xl md:text-3xl font-extrabold font-display ${config.text}`}>
              {severity || 'Assessment Pending'}
            </h2>
            <p className="text-xs text-slate-600 dark:text-slate-400 mt-2 max-w-xl">
              {config.desc}
            </p>
          </div>
          
          <div className="flex gap-4 w-full md:w-auto">
            {/* Risk Index Ring Gauge */}
            <div className="bg-white/80 dark:bg-slate-900/60 border border-white/20 p-3 rounded-xl text-center flex-1 md:flex-none md:w-28 shadow-sm">
              <span className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider">RISK SCORE</span>
              <span className="text-xl font-black font-mono text-slate-800 dark:text-slate-100">{risk_score || 0}%</span>
              <div className="w-full bg-slate-200 dark:bg-slate-700 h-1.5 rounded-full mt-1.5 overflow-hidden">
                <div 
                  className={`h-full rounded-full ${
                    risk_score > 75 ? 'bg-danger' : risk_score > 50 ? 'bg-warning' : 'bg-success'
                  }`}
                  style={{ width: `${risk_score || 0}%` }}
                />
              </div>
            </div>

            {/* Confidence Block */}
            <div className="bg-white/80 dark:bg-slate-900/60 border border-white/20 p-3 rounded-xl text-center flex-1 md:flex-none md:w-28 shadow-sm">
              <span className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider">CONFIDENCE</span>
              <span className="text-xl font-black font-mono text-primary">{confidence || 0}%</span>
              <div className="w-full bg-slate-200 dark:bg-slate-700 h-1.5 rounded-full mt-1.5 overflow-hidden">
                <div 
                  className="h-full rounded-full bg-primary"
                  style={{ width: `${confidence || 0}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap justify-between items-center border-t border-slate-200 dark:border-slate-800/80 mt-5 pt-4 gap-3">
          <div className="text-xs text-slate-500 flex items-center gap-2">
            <ClipboardList className="h-4.5 w-4.5 text-slate-400" />
            <span>Assessment: <b>{new Date(assessment_date).toLocaleDateString()}</b></span>
            {signal_file_name && (
              <>
                <span className="text-slate-300">|</span>
                <span>Signal File: <b>{signal_file_name}</b></span>
              </>
            )}
          </div>
          
          <button
            onClick={handleDownloadPDF}
            className="bg-primary hover:bg-primary-dark text-white py-2 px-4 rounded-xl text-xs font-bold shadow-lg flex items-center gap-2 transition"
          >
            <FileDown className="h-4 w-4" />
            Download PDF Report
          </button>
        </div>
      </div>

      {/* 2. Clinical Metrics breakdown & Explainable AI details */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Clinician Index Scores */}
        <div className="glass-panel p-5 rounded-2xl shadow-lg">
          <h3 className="text-sm font-bold uppercase tracking-wider text-slate-800 dark:text-slate-100 flex items-center gap-2 mb-4">
            <ShieldCheck className="h-4.5 w-4.5 text-success" />
            Computed Clinical Score Sheets
          </h3>
          
          <div className="space-y-4">
            {/* WOMAC Panel */}
            <div className="p-3 bg-slate-50 dark:bg-slate-900/40 rounded-xl border border-slate-100 dark:border-slate-800/80">
              <div className="flex justify-between items-center mb-1.5">
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300">WOMAC Osteoarthritis Index</span>
                <span className="text-sm font-bold text-slate-900 dark:text-slate-100">{womac_score}/96</span>
              </div>
              <p className="text-[11px] text-slate-500">
                Measures joint pain, stiffness, and structural function. Higher scores indicate greater severity.
              </p>
            </div>

            {/* KOOS Panel */}
            <div className="p-3 bg-slate-50 dark:bg-slate-900/40 rounded-xl border border-slate-100 dark:border-slate-800/80">
              <div className="flex justify-between items-center mb-1.5">
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300">KOOS Outcome Index</span>
                <span className="text-sm font-bold text-slate-900 dark:text-slate-100">{koos_score}/100</span>
              </div>
              <p className="text-[11px] text-slate-500">
                Knee Injury and Osteoarthritis Outcome Score. 100 represents no limitations; 0 represents severe limitations.
              </p>
            </div>

            {/* Survey Subscores Grid */}
            <div className="grid grid-cols-3 gap-2.5 pt-2 text-center">
              <div className="bg-slate-50 dark:bg-slate-900/40 p-2 rounded-lg border border-slate-100 dark:border-slate-800/80">
                <span className="block text-[9px] text-slate-400 uppercase font-bold">Pain Subscore</span>
                <span className="text-sm font-bold font-mono text-slate-800 dark:text-slate-200">{questionnaire.pain_score || 0}/20</span>
              </div>
              <div className="bg-slate-50 dark:bg-slate-900/40 p-2 rounded-lg border border-slate-100 dark:border-slate-800/80">
                <span className="block text-[9px] text-slate-400 uppercase font-bold">Stiffness</span>
                <span className="text-sm font-bold font-mono text-slate-800 dark:text-slate-200">{questionnaire.stiffness_score || 0}/8</span>
              </div>
              <div className="bg-slate-50 dark:bg-slate-900/40 p-2 rounded-lg border border-slate-100 dark:border-slate-800/80">
                <span className="block text-[9px] text-slate-400 uppercase font-bold">Mobility Range</span>
                <span className="text-sm font-bold font-mono text-slate-800 dark:text-slate-200">{questionnaire.mobility_score || 0}%</span>
              </div>
            </div>
          </div>
        </div>

        {/* Explainable AI Panel */}
        <div className="glass-panel p-5 rounded-2xl shadow-lg">
          <h3 className="text-sm font-bold uppercase tracking-wider text-slate-800 dark:text-slate-100 flex items-center gap-2 mb-4">
            <Sparkles className="h-4.5 w-4.5 text-primary" />
            Explainable AI (XAI) Model Attribution
          </h3>

          <div className="space-y-4">
            {/* Feature fusion contribution ratios */}
            <div>
              <span className="block text-xs font-bold text-slate-500 mb-1.5">Decision Source Contribution Ratio</span>
              <div className="w-full h-4 rounded-full overflow-hidden flex text-[10px] font-bold text-white text-center">
                <div 
                  className="bg-primary flex items-center justify-center transition-all"
                  style={{ width: `${xai.clinical_contribution || 60}%` }}
                >
                  {Math.round(xai.clinical_contribution || 60)}% Survey
                </div>
                <div 
                  className="bg-secondary flex items-center justify-center transition-all"
                  style={{ width: `${xai.acoustic_contribution || 40}%` }}
                >
                  {Math.round(xai.acoustic_contribution || 40)}% Acoustic
                </div>
              </div>
            </div>

            {/* Identified Risk Factors */}
            <div>
              <span className="block text-xs font-bold text-slate-500 mb-2">Key OA Severity Risk Factors</span>
              <ul className="space-y-1.5">
                {(xai.risk_factors || []).map((factor: string, idx: number) => (
                  <li key={idx} className="text-xs text-slate-600 dark:text-slate-400 flex items-start gap-2">
                    <span className="h-1.5 w-1.5 rounded-full bg-danger mt-1.5 flex-shrink-0" />
                    <span>{factor}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Clinician Recommendations notes section */}
      <div className="glass-panel p-5 rounded-2xl shadow-lg">
        <div className="flex justify-between items-center mb-4 pb-2 border-b border-slate-200 dark:border-slate-800">
          <h3 className="text-sm font-bold uppercase tracking-wider text-slate-800 dark:text-slate-100 flex items-center gap-2">
            <Heart className="h-4.5 w-4.5 text-danger animate-pulse" />
            Rehabilitation & Treatment Action Plan
          </h3>
          {user?.role === 'doctor' && (
            <span className="text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded-full font-bold flex items-center gap-1">
              <Edit3 className="h-3 w-3" />
              Clinician Edit Mode
            </span>
          )}
        </div>

        {user?.role === 'doctor' ? (
          <div className="space-y-3">
            <textarea
              rows={4}
              value={recommendationsInput}
              onChange={(e) => setRecommendationsInput(e.target.value)}
              placeholder="Enter custom medical recommendations, medication guidelines, exercise routines or orthotic prescriptions for this patient..."
              className="w-full px-4 py-3 border rounded-xl text-xs glass-input focus:ring-2 focus:ring-primary focus:outline-none"
            />
            <div className="flex justify-end gap-3 items-center">
              {recUpdateSuccess && (
                <span className="text-xs font-bold text-success flex items-center gap-1">
                  <Check className="h-4 w-4" />
                  Recommendations updated successfully
                </span>
              )}
              <button
                type="button"
                onClick={handleSaveRecommendations}
                disabled={isUpdatingRec}
                className="py-2 px-4 bg-primary hover:bg-primary-dark text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition disabled:opacity-50"
              >
                {isUpdatingRec ? (
                  <>
                    <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                    Saving...
                  </>
                ) : (
                  'Update Clinical Action Plan'
                )}
              </button>
            </div>
          </div>
        ) : (
          <div className="bg-blue-50/60 dark:bg-slate-900/60 rounded-xl p-4 border border-blue-100 dark:border-slate-800/80">
            <p className="text-xs leading-relaxed text-slate-700 dark:text-slate-300 whitespace-pre-wrap">
              {assessment.recommendations || "No recommendations generated yet. Dr. Sarah Jenkins is reviewing your record."}
            </p>
            {assessment.doctor && (
              <div className="flex items-center gap-2 mt-4 pt-3 border-t border-blue-100 dark:border-slate-800/80 text-[10px] text-slate-500">
                <User className="h-4.5 w-4.5 text-slate-400" />
                <span>Assigned Clinician: <b>{assessment.doctor.first_name} {assessment.doctor.last_name}</b></span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
