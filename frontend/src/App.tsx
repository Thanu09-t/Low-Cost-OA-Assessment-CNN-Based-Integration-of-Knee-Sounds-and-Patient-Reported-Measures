import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Navbar } from './components/Navbar';
import { DashboardLayout } from './components/DashboardLayout';
import { QuestionnaireForm } from './components/QuestionnaireForm';
import { SignalVisualizer } from './components/SignalVisualizer';
import { AssessmentReport } from './components/AssessmentReport';
import { AnalyticsCharts } from './components/AnalyticsCharts';
import { apiRequest } from './api/client';
import { 
  Activity, Users, FileText, Search, 
  ArrowLeft, Plus, AlertCircle
} from 'lucide-react';

// Main Inner App component to access Auth Context
const AppContent: React.FC = () => {
  const { user, loading: authLoading, login, register } = useAuth();
  
  // Auth screen states
  const [isRegister, setIsRegister] = useState(false);
  const [authRole, setAuthRole] = useState<'patient' | 'doctor'>('patient');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [dob, setDob] = useState('');
  const [gender, setGender] = useState('Male');
  const [authError, setAuthError] = useState('');
  const [authSubmitting, setAuthSubmitting] = useState(false);

  // Dashboard state
  const [activeTab, setActiveTab] = useState('wizard');
  const [assessments, setAssessments] = useState<any[]>([]);
  const [selectedAssessment, setSelectedAssessment] = useState<any | null>(null);
  const [patientTrends, setPatientTrends] = useState<any[]>([]);
  const [isSubmittingAssessment, setIsSubmittingAssessment] = useState(false);
  
  // Doctor specific states
  const [patients, setPatients] = useState<any[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<any | null>(null);
  const [doctorAnalytics, setDoctorAnalytics] = useState<any | null>(null);
  const [patientSearch, setPatientSearch] = useState('');
  const [showDoctorUpload, setShowDoctorUpload] = useState(false);

  // Set default tabs based on role on login
  useEffect(() => {
    if (user) {
      if (user.role === 'doctor') {
        setActiveTab('registry');
        fetchDoctorPatients();
        fetchDoctorAnalytics();
      } else {
        setActiveTab('wizard');
        fetchPatientAssessments();
        fetchPatientTrends();
      }
    } else {
      setSelectedAssessment(null);
      setSelectedPatient(null);
    }
  }, [user]);

  // Fetch functions
  const fetchPatientAssessments = async () => {
    try {
      const data = await apiRequest('/assessments/my-assessments');
      setAssessments(data);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchPatientTrends = async () => {
    try {
      const data = await apiRequest('/patients/progression');
      setPatientTrends(data);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchDoctorPatients = async () => {
    try {
      const data = await apiRequest('/doctors/patients');
      setPatients(data);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchDoctorAnalytics = async () => {
    try {
      const data = await apiRequest('/doctors/analytics');
      setDoctorAnalytics(data);
    } catch (e) {
      console.error(e);
    }
  };

  // Handlers
  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    setAuthSubmitting(true);
    try {
      if (isRegister) {
        await register({
          email,
          password,
          first_name: firstName,
          last_name: lastName,
          role: authRole,
          dob: authRole === 'patient' ? dob : undefined,
          gender: authRole === 'patient' ? gender : undefined
        });
      } else {
        await login({ email, password });
      }
    } catch (err: any) {
      setAuthError(err.message || 'Authentication failed. Please check inputs.');
    } finally {
      setAuthSubmitting(false);
    }
  };

  const handleAssessmentSubmit = async (formData: FormData) => {
    setIsSubmittingAssessment(true);
    try {
      const data = await apiRequest('/assessments/submit', {
        method: 'POST',
        body: formData,
        useMultipart: true
      });
      
      // Update local states
      setSelectedAssessment(data);
      if (user?.role === 'doctor') {
        fetchDoctorPatients();
        fetchDoctorAnalytics();
        if (selectedPatient) {
          // reload current patient history
          const updatedHistory = await apiRequest(`/doctors/patient/${selectedPatient.id}/assessments`);
          setAssessments(updatedHistory);
        }
        setShowDoctorUpload(false);
      } else {
        fetchPatientAssessments();
        fetchPatientTrends();
      }
    } catch (e: any) {
      throw e;
    } finally {
      setIsSubmittingAssessment(false);
    }
  };

  const handleUpdateRecommendations = async (newRec: string) => {
    if (!selectedAssessment) return;
    try {
      const data = await apiRequest(`/assessments/${selectedAssessment.id}`, {
        method: 'PUT',
        body: JSON.stringify({ recommendations: newRec }),
      });
      setSelectedAssessment(data);
      // Update assessment list
      setAssessments(assessments.map(a => a.id === data.id ? data : a));
    } catch (e) {
      console.error(e);
      throw e;
    }
  };

  const selectPatientForReview = async (pat: any) => {
    setSelectedPatient(pat);
    try {
      const data = await apiRequest(`/doctors/patient/${pat.id}/assessments`);
      setAssessments(data);
      setSelectedAssessment(null);
    } catch (e) {
      console.error(e);
    }
  };

  // Helper mock login for quick grading
  const handleQuickLogin = (role: 'patient' | 'doctor') => {
    setEmail(role === 'doctor' ? 'doctor@oainsight.com' : 'patient@oainsight.com');
    setPassword('Password123!');
    setAuthRole(role);
    setIsRegister(false);
  };

  // Render Loader
  if (authLoading) {
    return (
      <div className="min-h-screen bg-slate-900 text-white flex items-center justify-center">
        <div className="text-center">
          <Activity className="h-10 w-10 text-primary animate-spin mx-auto mb-4" />
          <p className="text-sm font-semibold tracking-wide uppercase">Initializing OA Insight Portal...</p>
        </div>
      </div>
    );
  }

  // Render AUTHENTICATION Screens
  if (!user) {
    return (
      <div
        className="min-h-screen flex items-center justify-center p-4 relative"
        style={{
          backgroundImage: `url('/knee-mri-bg.png')`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
        }}
      >
        {/* Dark overlay for readability */}
        <div className="absolute inset-0 bg-gradient-to-br from-slate-950/80 via-indigo-950/70 to-slate-900/85 backdrop-blur-[2px]" />
        <div className="w-full max-w-md relative z-10">
          {/* Header Branding */}
          <div className="text-center mb-8">
            <div className="inline-flex bg-primary/10 text-primary p-3 rounded-2xl mb-3 items-center justify-center">
              <Activity className="h-8 w-8" />
            </div>
            <h1 className="text-2xl font-black font-display text-white">OA Insight</h1>
            <p className="text-xs text-slate-300 mt-1 max-w-xs mx-auto">
              Low-Cost Knee Acoustic Joint Emission (KAE) Osteoarthritis Assessment Platform
            </p>
          </div>

          {/* Form Card */}
          <div className="glass-panel p-6 rounded-3xl shadow-2xl relative overflow-hidden">
            {/* Quick Access Switch */}
            <div className="flex bg-slate-100 dark:bg-slate-800/80 p-1 rounded-xl mb-6">
              <button
                type="button"
                onClick={() => setAuthRole('patient')}
                className={`flex-1 py-2 rounded-lg text-xs font-bold transition ${
                  authRole === 'patient' 
                    ? 'bg-white text-slate-800 shadow dark:bg-slate-700 dark:text-white' 
                    : 'text-slate-500 hover:text-slate-800 dark:text-slate-400'
                }`}
              >
                Patient Portal
              </button>
              <button
                type="button"
                onClick={() => setAuthRole('doctor')}
                className={`flex-1 py-2 rounded-lg text-xs font-bold transition ${
                  authRole === 'doctor' 
                    ? 'bg-white text-slate-800 shadow dark:bg-slate-700 dark:text-white' 
                    : 'text-slate-500 hover:text-slate-800 dark:text-slate-400'
                }`}
              >
                Clinician Portal
              </button>
            </div>

            {authError && (
              <div className="mb-4 bg-red-50 dark:bg-red-950/20 text-red-600 dark:text-red-400 p-3 rounded-xl border border-red-200 dark:border-red-900/50 text-xs flex items-center gap-2">
                <AlertCircle className="h-4.5 w-4.5 flex-shrink-0" />
                <span>{authError}</span>
              </div>
            )}

            <form onSubmit={handleAuthSubmit} className="space-y-4">
              {isRegister && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">First Name</label>
                    <input
                      type="text"
                      required
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      placeholder="Jane"
                      className="w-full px-3 py-2 border rounded-xl text-xs glass-input focus:ring-2 focus:ring-primary focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">Last Name</label>
                    <input
                      type="text"
                      required
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      placeholder="Doe"
                      className="w-full px-3 py-2 border rounded-xl text-xs glass-input focus:ring-2 focus:ring-primary focus:outline-none"
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">Email Address</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@oainsight.com"
                  className="w-full px-3 py-2 border rounded-xl text-xs glass-input focus:ring-2 focus:ring-primary focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">Security Password</label>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-3 py-2 border rounded-xl text-xs glass-input focus:ring-2 focus:ring-primary focus:outline-none"
                />
              </div>

              {isRegister && authRole === 'patient' && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">DOB</label>
                    <input
                      type="date"
                      required
                      value={dob}
                      onChange={(e) => setDob(e.target.value)}
                      className="w-full px-3 py-2 border rounded-xl text-xs glass-input focus:ring-2 focus:ring-primary focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">Gender</label>
                    <select
                      value={gender}
                      onChange={(e) => setGender(e.target.value)}
                      className="w-full px-3 py-2 border rounded-xl text-xs glass-input focus:ring-2 focus:ring-primary focus:outline-none"
                    >
                      <option>Male</option>
                      <option>Female</option>
                      <option>Other</option>
                    </select>
                  </div>
                </div>
              )}

              <button
                type="submit"
                disabled={authSubmitting}
                className="w-full py-2.5 bg-primary hover:bg-primary-dark text-white rounded-xl text-xs font-bold shadow-lg flex items-center justify-center gap-2 transition disabled:opacity-50"
              >
                {authSubmitting ? 'Authenticating...' : isRegister ? 'Register Account' : 'Secure Sign In'}
              </button>
            </form>

            {/* Switch view toggle */}
            <div className="text-center mt-5 text-xs text-slate-500">
              <button
                type="button"
                onClick={() => setIsRegister(!isRegister)}
                className="hover:underline text-primary font-semibold"
              >
                {isRegister ? 'Already have an account? Sign In' : "Don't have an account? Register"}
              </button>
            </div>

            {/* Quick Demo Credentials Panel */}
            <div className="mt-6 pt-5 border-t border-slate-200 dark:border-slate-800">
              <span className="block text-[10px] text-center text-slate-400 uppercase font-extrabold tracking-wider mb-2.5">
                Quick Access Demo Accounts
              </span>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => handleQuickLogin('patient')}
                  className="flex-1 py-1.5 bg-emerald-50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-300 rounded-lg text-[10px] font-bold border border-emerald-100 dark:border-emerald-900/40 hover:scale-102 transition"
                >
                  Robert Miller (Patient)
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickLogin('doctor')}
                  className="flex-1 py-1.5 bg-primary/5 text-primary rounded-lg text-[10px] font-bold border border-primary/10 hover:scale-102 transition"
                >
                  Dr. Sarah (Clinician)
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // --- PORTAL LAYOUTS ---
  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />
      
      <DashboardLayout activeTab={activeTab} setActiveTab={setActiveTab}>
        {/* ================= PATIENT DASHBOARD ================= */}
        {user.role === 'patient' && (
          <>
            {/* Tab 1: Assessment Wizard */}
            {activeTab === 'wizard' && (
              <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 items-start">
                <div className="xl:col-span-1 space-y-6">
                  <QuestionnaireForm 
                    onSubmit={handleAssessmentSubmit} 
                    isSubmitting={isSubmittingAssessment} 
                  />
                  
                  {/* Dynamic helper card */}
                  {selectedAssessment && (
                    <button
                      onClick={() => setSelectedAssessment(null)}
                      className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold border border-slate-200 dark:border-slate-700 flex items-center justify-center gap-1.5 transition"
                    >
                      <Plus className="h-4 w-4" />
                      Start New Assessment
                    </button>
                  )}
                </div>

                <div className="xl:col-span-2 space-y-6">
                  {selectedAssessment ? (
                    <>
                      <AssessmentReport assessment={selectedAssessment} />
                      <SignalVisualizer 
                        signalsPlotUrl={selectedAssessment.signal_file_path?.replace('signals', 'reports').replace('.wav', '_signals.png').replace('.csv', '_signals.png')}
                        spectrogramPlotUrl={selectedAssessment.signal_file_path?.replace('signals', 'reports').replace('.wav', '_spectrogram.png').replace('.csv', '_spectrogram.png')}
                        isProcessing={isSubmittingAssessment}
                      />
                    </>
                  ) : (
                    <div className="flex flex-col items-center justify-center p-20 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl text-center">
                      <Activity className="h-14 w-14 text-slate-300 dark:text-slate-700 stroke-1 mb-4" />
                      <h3 className="text-base font-bold text-slate-800 dark:text-slate-100">Ready for Assessment</h3>
                      <p className="text-xs text-slate-400 mt-2 max-w-sm">
                        Please upload your knee acoustic wave file (.wav/.csv) and fill out the WOMAC clinical questionnaires on the left to activate the CNN diagnostic pipeline.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Tab 2: Health History Progression */}
            {activeTab === 'history' && (
              <div className="space-y-6">
                <AnalyticsCharts type="patient" trendData={patientTrends} />
                
                {/* Historical records list */}
                <div className="glass-panel p-5 rounded-2xl shadow-lg">
                  <h3 className="text-sm font-bold uppercase tracking-wider text-slate-800 dark:text-slate-100 mb-4 flex items-center gap-2">
                    <FileText className="h-4.5 w-4.5 text-primary" />
                    Previous Assessment Logs
                  </h3>
                  
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-400 font-extrabold uppercase tracking-wider">
                          <th className="py-3 px-2">Date</th>
                          <th className="py-3 px-2">Severity Classification</th>
                          <th className="py-3 px-2">Risk Score</th>
                          <th className="py-3 px-2">WOMAC</th>
                          <th className="py-3 px-2">KOOS</th>
                          <th className="py-3 px-2">Source File</th>
                          <th className="py-3 px-2 text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {assessments.map((ass) => (
                          <tr 
                            key={ass.id} 
                            onClick={() => setSelectedAssessment(ass)}
                            className={`border-b border-slate-100 dark:border-slate-800/80 hover:bg-slate-500/5 cursor-pointer transition ${
                              selectedAssessment?.id === ass.id ? 'bg-primary/5 font-bold' : ''
                            }`}
                          >
                            <td className="py-3.5 px-2">{new Date(ass.assessment_date).toLocaleDateString()}</td>
                            <td className="py-3.5 px-2">
                              <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase ${
                                ass.severity === 'Normal' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-400' :
                                ass.severity === 'Mild OA' ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/30 dark:text-amber-400' :
                                'bg-red-100 text-red-800 dark:bg-red-950/30 dark:text-red-400'
                              }`}>
                                {ass.severity}
                              </span>
                            </td>
                            <td className="py-3.5 px-2 font-mono">{ass.risk_score}%</td>
                            <td className="py-3.5 px-2 font-mono">{ass.womac_score}/96</td>
                            <td className="py-3.5 px-2 font-mono">{ass.koos_score}%</td>
                            <td className="py-3.5 px-2 text-slate-400 truncate max-w-xs">{ass.signal_file_name}</td>
                            <td className="py-3.5 px-2 text-right">
                              <button 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedAssessment(ass);
                                }}
                                className="text-primary hover:underline font-bold"
                              >
                                View Results
                              </button>
                            </td>
                          </tr>
                        ))}
                        {assessments.length === 0 && (
                          <tr>
                            <td colSpan={7} className="text-center py-10 text-slate-400">
                              No assessment records found. Complete your first assessment in the wizard!
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Display detail overlay for selected history record */}
                {selectedAssessment && (
                  <div className="border-t border-slate-200 dark:border-slate-800 pt-6 space-y-6">
                    <div className="flex items-center gap-2">
                      <button 
                        onClick={() => setSelectedAssessment(null)}
                        className="p-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-lg text-slate-500 transition"
                      >
                        <ArrowLeft className="h-4 w-4" />
                      </button>
                      <h4 className="text-sm font-bold uppercase tracking-wider">Historical Record Review</h4>
                    </div>
                    <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 items-start">
                      <div className="xl:col-span-2">
                        <AssessmentReport assessment={selectedAssessment} />
                      </div>
                      <div className="xl:col-span-1">
                        <SignalVisualizer 
                          signalsPlotUrl={selectedAssessment.signal_file_path?.replace('signals', 'reports').replace('.wav', '_signals.png').replace('.csv', '_signals.png')}
                          spectrogramPlotUrl={selectedAssessment.signal_file_path?.replace('signals', 'reports').replace('.wav', '_spectrogram.png').replace('.csv', '_spectrogram.png')}
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </>
        )}

        {/* ================= CLINICIAN DASHBOARD ================= */}
        {user.role === 'doctor' && (
          <>
            {/* Tab 1: Patient Cohort Registry */}
            {activeTab === 'registry' && (
              <div className="space-y-6">
                {!selectedPatient ? (
                  // Cohort overview
                  <div className="glass-panel p-5 rounded-2xl shadow-lg">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                      <div>
                        <h3 className="text-sm font-bold uppercase tracking-wider text-slate-800 dark:text-slate-100 flex items-center gap-2">
                          <Users className="h-5 w-5 text-primary" />
                          Patient Registry
                        </h3>
                        <p className="text-xs text-slate-400 mt-0.5">Manage and audit Knee Osteoarthritis patient progression</p>
                      </div>

                      {/* Search and upload */}
                      <div className="flex gap-2.5 w-full sm:w-auto">
                        <div className="relative flex-1 sm:flex-none">
                          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                          <input
                            type="text"
                            placeholder="Search patients..."
                            value={patientSearch}
                            onChange={(e) => setPatientSearch(e.target.value)}
                            className="pl-9 pr-4 py-2 text-xs border rounded-xl glass-input focus:ring-2 focus:ring-primary focus:outline-none w-full sm:w-60"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead>
                          <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-400 font-extrabold uppercase tracking-wider">
                            <th className="py-3 px-2">Patient Profile</th>
                            <th className="py-3 px-2">Email</th>
                            <th className="py-3 px-2">DOB / Gender</th>
                            <th className="py-3 px-2">Latest Assessment</th>
                            <th className="py-3 px-2">Severity Level</th>
                            <th className="py-3 px-2">Risk</th>
                            <th className="py-3 px-2">Assessments</th>
                            <th className="py-3 px-2 text-right">Action</th>
                          </tr>
                        </thead>
                        <tbody>
                          {patients
                            .filter(p => `${p.first_name} ${p.last_name} ${p.email}`.toLowerCase().includes(patientSearch.toLowerCase()))
                            .map((pat) => (
                              <tr 
                                key={pat.id}
                                onClick={() => selectPatientForReview(pat)}
                                className="border-b border-slate-100 dark:border-slate-800/80 hover:bg-slate-500/5 cursor-pointer transition"
                              >
                                <td className="py-3.5 px-2 font-bold text-slate-800 dark:text-slate-200">
                                  {pat.first_name} {pat.last_name}
                                </td>
                                <td className="py-3.5 px-2 text-slate-500">{pat.email}</td>
                                <td className="py-3.5 px-2">{pat.dob} ({pat.gender})</td>
                                <td className="py-3.5 px-2">{pat.latest_assessment_date || 'N/A'}</td>
                                <td className="py-3.5 px-2">
                                  <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase ${
                                    pat.latest_severity === 'Normal' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-400' :
                                    pat.latest_severity === 'Mild OA' ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/30 dark:text-amber-400' :
                                    pat.latest_severity === 'No Assessments' ? 'bg-slate-100 text-slate-500 dark:bg-slate-800' :
                                    'bg-red-100 text-red-800 dark:bg-red-950/30 dark:text-red-400'
                                  }`}>
                                    {pat.latest_severity}
                                  </span>
                                </td>
                                <td className="py-3.5 px-2 font-mono font-bold text-slate-700 dark:text-slate-300">
                                  {pat.latest_risk_score !== null ? `${pat.latest_risk_score}%` : 'N/A'}
                                </td>
                                <td className="py-3.5 px-2 font-mono">{pat.assessment_count}</td>
                                <td className="py-3.5 px-2 text-right">
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      selectPatientForReview(pat);
                                    }}
                                    className="text-primary hover:underline font-bold"
                                  >
                                    Review Files
                                  </button>
                                </td>
                              </tr>
                            ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ) : (
                  // Review specific patient
                  <div className="space-y-6">
                    <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => {
                            setSelectedPatient(null);
                            setSelectedAssessment(null);
                          }}
                          className="p-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-lg text-slate-500 transition"
                        >
                          <ArrowLeft className="h-4 w-4" />
                        </button>
                        <div>
                          <h3 className="text-base font-bold text-slate-800 dark:text-slate-100">
                            Patient Record: {selectedPatient.first_name} {selectedPatient.last_name}
                          </h3>
                          <p className="text-[10px] text-slate-500 uppercase tracking-widest font-mono">ID: {selectedPatient.id}</p>
                        </div>
                      </div>

                      <button
                        onClick={() => setShowDoctorUpload(!showDoctorUpload)}
                        className="py-2 px-4 bg-primary hover:bg-primary-dark text-white rounded-xl text-xs font-bold shadow-lg flex items-center gap-1.5 transition"
                      >
                        <Plus className="h-4 w-4" />
                        New Diagnostic Assessment
                      </button>
                    </div>

                    {showDoctorUpload && (
                      <div className="max-w-xl mx-auto p-2 border border-slate-200 dark:border-slate-800 rounded-2xl bg-white dark:bg-slate-900 shadow-xl">
                        <div className="flex justify-between items-center p-3 border-b border-slate-100 dark:border-slate-800">
                          <span className="text-xs font-bold text-slate-600">Diagnostics Upload Wizard</span>
                          <button onClick={() => setShowDoctorUpload(false)} className="text-slate-400 text-xs font-bold hover:text-slate-600">Cancel</button>
                        </div>
                        <QuestionnaireForm onSubmit={handleAssessmentSubmit} isSubmitting={isSubmittingAssessment} />
                      </div>
                    )}

                    {/* Historical entries for clinician */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                      <div className="lg:col-span-1 glass-panel p-4 rounded-2xl shadow-md space-y-3">
                        <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-400">Available Assessments</h4>
                        <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
                          {assessments.map((ass) => (
                            <div
                              key={ass.id}
                              onClick={() => setSelectedAssessment(ass)}
                              className={`p-3 rounded-xl border cursor-pointer transition text-left ${
                                selectedAssessment?.id === ass.id
                                  ? 'bg-primary/5 border-primary shadow-sm'
                                  : 'bg-white dark:bg-slate-900/60 border-slate-100 dark:border-slate-800/80 hover:bg-slate-50'
                              }`}
                            >
                              <div className="flex justify-between items-center mb-1.5">
                                <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                                  {new Date(ass.assessment_date).toLocaleDateString()}
                                </span>
                                <span className={`text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded-full ${
                                  ass.severity === 'Normal' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/20 dark:text-emerald-400' :
                                  ass.severity === 'Mild OA' ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/20 dark:text-emerald-400' :
                                  'bg-red-100 text-red-800 dark:bg-red-950/20 dark:text-red-400'
                                }`}>
                                  {ass.severity}
                                </span>
                              </div>
                              <div className="flex justify-between text-[10px] text-slate-400">
                                <span>WOMAC: <b>{ass.womac_score}/96</b></span>
                                <span>KOOS: <b>{ass.koos_score}%</b></span>
                                <span>Risk: <b>{ass.risk_score}%</b></span>
                              </div>
                            </div>
                          ))}
                          {assessments.length === 0 && (
                            <p className="text-xs text-slate-400 text-center py-6">No historical records found.</p>
                          )}
                        </div>
                      </div>

                      <div className="lg:col-span-2 space-y-6">
                        {selectedAssessment ? (
                          <>
                            <AssessmentReport 
                              assessment={selectedAssessment} 
                              onUpdateRecommendations={handleUpdateRecommendations} 
                            />
                            <SignalVisualizer 
                              signalsPlotUrl={selectedAssessment.signal_file_path?.replace('signals', 'reports').replace('.wav', '_signals.png').replace('.csv', '_signals.png')}
                              spectrogramPlotUrl={selectedAssessment.signal_file_path?.replace('signals', 'reports').replace('.wav', '_spectrogram.png').replace('.csv', '_spectrogram.png')}
                            />
                          </>
                        ) : (
                          <div className="flex flex-col items-center justify-center p-20 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl text-center">
                            <Activity className="h-10 w-10 text-slate-300 dark:text-slate-700 stroke-1 mb-3 animate-pulse" />
                            <h4 className="text-sm font-bold text-slate-800 dark:text-slate-100">Review Patient File</h4>
                            <p className="text-xs text-slate-400 mt-1 max-w-xs">
                              Select a clinical assessment from the list on the left to inspect joint waveforms, check XAI parameters, and modify recommendations.
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Tab 2: Clinician Analytics dashboard */}
            {activeTab === 'analytics' && (
              <div className="space-y-6">
                {doctorAnalytics && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Patients total count */}
                    <div className="glass-panel p-4 rounded-xl flex items-center justify-between shadow-sm">
                      <div>
                        <span className="block text-[10px] text-slate-400 uppercase font-extrabold tracking-wider">Active Patient Registry</span>
                        <span className="text-2xl font-black text-slate-800 dark:text-slate-100 font-mono mt-1 block">
                          {doctorAnalytics.total_patients} Patients
                        </span>
                      </div>
                      <div className="p-3 bg-primary/10 rounded-full text-primary">
                        <Users className="h-6 w-6" />
                      </div>
                    </div>

                    {/* Assessments count */}
                    <div className="glass-panel p-4 rounded-xl flex items-center justify-between shadow-sm">
                      <div>
                        <span className="block text-[10px] text-slate-400 uppercase font-extrabold tracking-wider">Total Diagnostic Runs</span>
                        <span className="text-2xl font-black text-slate-800 dark:text-slate-100 font-mono mt-1 block">
                          {doctorAnalytics.total_assessments} Runs
                        </span>
                      </div>
                      <div className="p-3 bg-secondary/10 rounded-full text-secondary">
                        <Activity className="h-6 w-6" />
                      </div>
                    </div>
                  </div>
                )}

                {doctorAnalytics && (
                  <AnalyticsCharts
                    type="doctor"
                    trendData={doctorAnalytics.recent_trends}
                    distributionData={doctorAnalytics.severity_distribution}
                  />
                )}
              </div>
            )}
          </>
        )}
      </DashboardLayout>
    </div>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
