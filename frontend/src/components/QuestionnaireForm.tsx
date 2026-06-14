import React, { useState, useEffect } from 'react';
import { Upload, FileText, CheckCircle, ChevronRight, ChevronLeft, RefreshCw, AlertTriangle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface QuestionnaireFormProps {
  onSubmit: (formData: FormData) => Promise<void>;
  isSubmitting: boolean;
}

export const QuestionnaireForm: React.FC<QuestionnaireFormProps> = ({ onSubmit, isSubmitting }) => {
  const { user } = useAuth();
  const [step, setStep] = useState(1);
  const [file, setFile] = useState<File | null>(null);
  const [patientId, setPatientId] = useState('');
  
  // Intake questionnaire state (0-4 Likert scale options: 0=None, 1=Mild, 2=Moderate, 3=Severe, 4=Extreme)
  const [painQ1, setPainQ1] = useState(0); // walking on flat ground
  const [painQ2, setPainQ2] = useState(0); // going up/down stairs
  const [painQ3, setPainQ3] = useState(0); // in bed at night
  const [painQ4, setPainQ4] = useState(0); // sitting or lying down
  const [painQ5, setPainQ5] = useState(0); // standing upright

  const [stiffQ1, setStiffQ1] = useState(0); // morning stiffness
  const [stiffQ2, setStiffQ2] = useState(0); // later in the day stiffness

  const [mobility, setMobility] = useState(80); // 0-100 (100 = full mobility)
  const [walkDifficulty, setWalkDifficulty] = useState(1); // 0-4
  const [stairDifficulty, setStairDifficulty] = useState(1); // 0-4
  const [activityImpact, setActivityImpact] = useState(1); // 0-4

  // Live computed scores
  const [liveWomac, setLiveWomac] = useState(0);
  const [liveKoos, setLiveKoos] = useState(0);
  const [errorMsg, setErrorMsg] = useState('');

  // Calculate live scores when responses change
  useEffect(() => {
    // 1. Pain Score (sum of 5 questions, max 20)
    const painSum = painQ1 + painQ2 + painQ3 + painQ4 + painQ5;
    // 2. Stiffness Score (sum of 2 questions, max 8)
    const stiffSum = stiffQ1 + stiffQ2;
    // 3. Functional difficulty (mapped from mobility: 0 difficulty when mobility is 100)
    const funcDifficulty = Math.round(68.0 * (1.0 - (mobility / 100.0)));
    
    // WOMAC Sum (out of 96)
    const womacTotal = painSum + stiffSum + funcDifficulty;
    setLiveWomac(womacTotal);

    // KOOS calculation: average of subscales Pain, Stiffness, and Function
    const koosPain = (1 - (painSum / 20)) * 100;
    const koosStiff = (1 - (stiffSum / 8)) * 100;
    const koosADL = mobility;
    const koosTotal = (koosPain + koosStiff + koosADL) / 3;
    setLiveKoos(Math.round(koosTotal));
  }, [painQ1, painQ2, painQ3, painQ4, painQ5, stiffQ1, stiffQ2, mobility]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const selectedFile = e.target.files[0];
      const ext = selectedFile.name.split('.').pop()?.toLowerCase();
      if (ext === 'wav' || ext === 'csv') {
        setFile(selectedFile);
        setErrorMsg('');
      } else {
        setErrorMsg('Unsupported file type. Please upload a .wav or .csv file.');
        setFile(null);
      }
    }
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) {
      setErrorMsg('Knee Acoustic Emission file is required for assessment.');
      setStep(1);
      return;
    }

    if (user?.role === 'doctor' && !patientId) {
      setErrorMsg('Please specify the patient ID.');
      return;
    }

    const painSum = painQ1 + painQ2 + painQ3 + painQ4 + painQ5;
    const stiffSum = stiffQ1 + stiffQ2;

    const formData = new FormData();
    formData.append('file', file);
    formData.append('pain_score', painSum.toString());
    formData.append('stiffness_score', stiffSum.toString());
    formData.append('mobility_score', mobility.toString());
    formData.append('walking_difficulty', walkDifficulty.toString());
    formData.append('stair_climbing', stairDifficulty.toString());
    formData.append('daily_activity_impact', activityImpact.toString());
    
    if (user?.role === 'doctor') {
      formData.append('patient_id', patientId);
    }

    try {
      setErrorMsg('');
      await onSubmit(formData);
    } catch (err: any) {
      setErrorMsg(err.message || 'An error occurred during submission.');
    }
  };

  const LikertQuestion: React.FC<{
    label: string;
    value: number;
    onChange: (val: number) => void;
  }> = ({ label, value, onChange }) => (
    <div className="bg-white/50 dark:bg-slate-900/40 p-4 rounded-xl border border-slate-100 dark:border-slate-800/80 mb-3">
      <span className="block text-sm font-semibold text-slate-700 dark:text-slate-200 mb-2">{label}</span>
      <div className="grid grid-cols-5 gap-1.5 text-center">
        {[0, 1, 2, 3, 4].map((score) => {
          const scoreLabels = ['None', 'Mild', 'Mod', 'Sev', 'Ext'];
          const activeColors = [
            'bg-slate-200 text-slate-800 dark:bg-slate-700 dark:text-slate-100',
            'bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300',
            'bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300',
            'bg-orange-100 text-orange-800 border-orange-200 dark:bg-orange-950/40 dark:text-orange-300',
            'bg-red-100 text-red-800 border-red-200 dark:bg-red-950/40 dark:text-red-300'
          ];
          const isActive = value === score;
          
          return (
            <button
              key={score}
              type="button"
              onClick={() => onChange(score)}
              className={`py-2 px-1 rounded-lg text-xs font-bold transition-all border ${
                isActive 
                  ? activeColors[score] + ' border-transparent scale-102 ring-2 ring-primary/25' 
                  : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-400'
              }`}
            >
              <span className="block text-sm font-mono">{score}</span>
              <span className="text-[10px] font-normal">{scoreLabels[score]}</span>
            </button>
          );
        })}
      </div>
    </div>
  );

  return (
    <div className="glass-panel p-6 rounded-2xl shadow-xl transition-all">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h3 className="text-lg font-bold font-display text-slate-800 dark:text-slate-100">Assessment Wizard</h3>
          <p className="text-xs text-slate-500">Step {step} of 3</p>
        </div>
        
        {/* Progress Dots */}
        <div className="flex items-center gap-2">
          {[1, 2, 3].map((s) => (
            <div
              key={s}
              className={`h-2.5 rounded-full transition-all duration-300 ${
                s === step 
                  ? 'w-7 bg-primary' 
                  : s < step 
                    ? 'w-2.5 bg-emerald-500' 
                    : 'w-2.5 bg-slate-200 dark:bg-slate-700'
              }`}
            />
          ))}
        </div>
      </div>

      {errorMsg && (
        <div className="mb-5 bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400 p-3.5 rounded-xl border border-red-200 dark:border-red-900/50 text-xs flex items-center gap-2.5">
          <AlertTriangle className="h-4.5 w-4.5 flex-shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      <form onSubmit={handleFormSubmit}>
        {/* STEP 1: Acoustic File Upload */}
        {step === 1 && (
          <div className="animate-fadeIn">
            {user?.role === 'doctor' && (
              <div className="mb-5">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
                  Patient Account UUID / ID
                </label>
                <input
                  type="text"
                  required
                  placeholder="Enter patient uuid"
                  value={patientId}
                  onChange={(e) => setPatientId(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl text-sm border glass-input focus:ring-2 focus:ring-primary focus:outline-none"
                />
              </div>
            )}

            <div className="mb-6">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
                Knee Acoustic Emission Sensor Data
              </label>
              
              <div className="relative group border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-primary dark:hover:border-primary rounded-2xl p-8 text-center bg-slate-500/5 transition-all">
                <input
                  type="file"
                  onChange={handleFileChange}
                  accept=".wav,.csv"
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
                <div className="flex flex-col items-center">
                  <div className="p-4 bg-primary/10 rounded-full text-primary mb-3 group-hover:scale-110 transition-transform">
                    <Upload className="h-7 w-7" />
                  </div>
                  <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                    {file ? file.name : "Select Acoustic Signal File"}
                  </h4>
                  <p className="text-xs text-slate-400 mt-1.5 max-w-xs mx-auto">
                    Upload audio recordings (.wav) or Joint amplitude readings (.csv) gathered from wearable sensors
                  </p>
                  <span className="text-[10px] text-slate-400 dark:text-slate-500 block mt-2">
                    Max file size: 10MB
                  </span>
                </div>
              </div>
            </div>

            {file && (
              <div className="p-3 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/50 rounded-xl flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FileText className="h-5 w-5 text-emerald-500" />
                  <div className="text-left">
                    <p className="text-xs font-bold text-slate-700 dark:text-slate-300">{file.name}</p>
                    <p className="text-[10px] text-slate-400">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                  </div>
                </div>
                <CheckCircle className="h-5 w-5 text-emerald-500" />
              </div>
            )}

            <div className="mt-6 flex justify-end">
              <button
                type="button"
                onClick={() => {
                  if (!file) {
                    setErrorMsg('Please select an acoustic signal file before continuing.');
                  } else {
                    setStep(2);
                  }
                }}
                className="py-2.5 px-5 bg-primary hover:bg-primary-dark text-white rounded-xl text-xs font-bold shadow-lg flex items-center gap-2 transition"
              >
                Proceed to Questionnaires
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}

        {/* STEP 2: WOMAC (Pain & Stiffness) */}
        {step === 2 && (
          <div className="animate-fadeIn">
            <h4 className="text-xs font-bold uppercase tracking-wider text-primary border-b border-primary/20 pb-1.5 mb-4">
              Part A: Knee Joint Pain Index (WOMAC)
            </h4>
            
            <LikertQuestion
              label="1. How much knee pain do you experience walking on flat surfaces?"
              value={painQ1}
              onChange={setPainQ1}
            />
            <LikertQuestion
              label="2. How much pain do you experience going up or down stairs?"
              value={painQ2}
              onChange={setPainQ2}
            />
            <LikertQuestion
              label="3. How much pain do you experience in bed at night (sleeping)?"
              value={painQ3}
              onChange={setPainQ3}
            />
            <LikertQuestion
              label="4. How much pain do you feel while sitting or lying down?"
              value={painQ4}
              onChange={setPainQ4}
            />
            <LikertQuestion
              label="5. How much pain do you feel standing upright?"
              value={painQ5}
              onChange={setPainQ5}
            />

            <h4 className="text-xs font-bold uppercase tracking-wider text-secondary border-b border-secondary/20 pb-1.5 mt-6 mb-4">
              Part B: Joint Stiffness Index (WOMAC)
            </h4>
            
            <LikertQuestion
              label="6. How severe is your knee joint stiffness first waking up in the morning?"
              value={stiffQ1}
              onChange={setStiffQ1}
            />
            <LikertQuestion
              label="7. How severe is your stiffness later in the day after sitting/resting?"
              value={stiffQ2}
              onChange={setStiffQ2}
            />

            <div className="mt-6 flex justify-between">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700 rounded-xl text-xs font-bold flex items-center gap-1.5 transition"
              >
                <ChevronLeft className="h-4 w-4" />
                Back
              </button>
              <button
                type="button"
                onClick={() => setStep(3)}
                className="py-2.5 px-5 bg-primary hover:bg-primary-dark text-white rounded-xl text-xs font-bold shadow-lg flex items-center gap-2 transition"
              >
                Proceed to Mobility
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}

        {/* STEP 3: Mobility + Live Scores Summary */}
        {step === 3 && (
          <div className="animate-fadeIn">
            <h4 className="text-xs font-bold uppercase tracking-wider text-warning border-b border-warning/20 pb-1.5 mb-4">
              Part C: Functional Mobility & ADL Activities
            </h4>

            {/* Mobility Range slider */}
            <div className="bg-white/50 dark:bg-slate-900/40 p-4 rounded-xl border border-slate-100 dark:border-slate-800/80 mb-4">
              <div className="flex justify-between items-center mb-2">
                <label className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                  Global Flexion/Extension Joint Mobility
                </label>
                <span className="text-xs font-bold text-primary font-mono">{mobility}% Range</span>
              </div>
              <input
                type="range"
                min="10"
                max="100"
                value={mobility}
                onChange={(e) => setMobility(parseInt(e.target.value))}
                className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-primary"
              />
              <div className="flex justify-between text-[10px] text-slate-400 mt-1">
                <span>Severe Limitation (10%)</span>
                <span>Normal Joint Range (100%)</span>
              </div>
            </div>

            {/* Specific difficulties dropdowns */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Walking Flat Surface</label>
                <select
                  value={walkDifficulty}
                  onChange={(e) => setWalkDifficulty(parseInt(e.target.value))}
                  className="w-full px-3 py-2 border rounded-xl text-xs glass-input focus:ring-2 focus:ring-primary focus:outline-none"
                >
                  <option value={0}>0 - No Difficulty</option>
                  <option value={1}>1 - Mild Difficulty</option>
                  <option value={2}>2 - Moderate Difficulty</option>
                  <option value={3}>3 - Severe Difficulty</option>
                  <option value={4}>4 - Extreme Difficulty</option>
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Stair Climbing</label>
                <select
                  value={stairDifficulty}
                  onChange={(e) => setStairDifficulty(parseInt(e.target.value))}
                  className="w-full px-3 py-2 border rounded-xl text-xs glass-input focus:ring-2 focus:ring-primary focus:outline-none"
                >
                  <option value={0}>0 - No Difficulty</option>
                  <option value={1}>1 - Mild Difficulty</option>
                  <option value={2}>2 - Moderate Difficulty</option>
                  <option value={3}>3 - Severe Difficulty</option>
                  <option value={4}>4 - Extreme Difficulty</option>
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Daily Activity Impact</label>
                <select
                  value={activityImpact}
                  onChange={(e) => setActivityImpact(parseInt(e.target.value))}
                  className="w-full px-3 py-2 border rounded-xl text-xs glass-input focus:ring-2 focus:ring-primary focus:outline-none"
                >
                  <option value={0}>0 - No Impact</option>
                  <option value={1}>1 - Mild Impact</option>
                  <option value={2}>2 - Moderate Impact</option>
                  <option value={3}>3 - Severe Impact</option>
                  <option value={4}>4 - Extreme Impact</option>
                </select>
              </div>
            </div>

            {/* Live Scores Summary Indicator Banner */}
            <div className="bg-slate-900 text-white rounded-xl p-4 mb-6 border border-slate-800">
              <h5 className="text-xs font-bold text-slate-400 uppercase tracking-widest text-center mb-3">
                Calculated Clinical Score Metrics
              </h5>
              
              <div className="grid grid-cols-2 gap-4 text-center">
                {/* WOMAC indicator */}
                <div className="border-r border-slate-800">
                  <span className="block text-[10px] text-slate-400 uppercase">Computed WOMAC Score</span>
                  <span className="text-2xl font-bold font-mono text-primary-light">{liveWomac}</span>
                  <span className="block text-[10px] text-slate-500">Scale 0-96 (Higher is worse)</span>
                </div>
                
                {/* KOOS indicator */}
                <div>
                  <span className="block text-[10px] text-slate-400 uppercase">Computed KOOS Score</span>
                  <span className="text-2xl font-bold font-mono text-secondary-light">{liveKoos}%</span>
                  <span className="block text-[10px] text-slate-500">Scale 0-100 (Higher is better)</span>
                </div>
              </div>
            </div>

            <div className="mt-6 flex justify-between">
              <button
                type="button"
                onClick={() => setStep(2)}
                className="py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700 rounded-xl text-xs font-bold flex items-center gap-1.5 transition"
              >
                <ChevronLeft className="h-4 w-4" />
                Back
              </button>
              
              <button
                type="submit"
                disabled={isSubmitting}
                className="py-2.5 px-6 bg-success hover:bg-emerald-600 text-white rounded-xl text-xs font-bold shadow-lg flex items-center gap-2 transition disabled:opacity-50"
              >
                {isSubmitting ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    Running Diagnosis...
                  </>
                ) : (
                  <>
                    <CheckCircle className="h-4 w-4" />
                    Perform AI Assessment
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </form>
    </div>
  );
};
