import React, { useEffect, useState, useRef } from 'react';
import { Brain, Upload, Mic, MicOff, ChevronRight, CheckCircle, AlertCircle, RotateCcw } from 'lucide-react';
import ManagerNavbar from '../../components/ManagerNavbar';
import { Spinner, Alert, RatingBar } from '../../components/UI';
import { interviewAPI, resumeAPI, rolesAPI, employeeAPI } from '../../api';
import { useAuth } from '../../context/AuthContext';

const STEPS = ['Setup', 'Questions', 'Evaluation'];

export default function AIInterviewPage() {
  const { user } = useAuth();
  const [step, setStep]           = useState(0);
  const [roles, setRoles]         = useState([]);
  const [employees, setEmployees] = useState([]);
  const [alert, setAlert]         = useState(null);

  // Setup
  const [selectedEmployee, setSelectedEmployee] = useState('');
  const [selectedRole, setSelectedRole]         = useState('');
  const [resumeFile, setResumeFile]             = useState(null);
  const [resumeText, setResumeText]             = useState('');
  const [pasteMode, setPasteMode]               = useState(false);
  const [setupLoading, setSetupLoading]         = useState(false);

  // Interview
  const [questions, setQuestions]   = useState([]);
  const [interviewId, setInterviewId] = useState(null);
  const [answers, setAnswers]         = useState([]);
  const [currentQ, setCurrentQ]       = useState(0);
  const [listening, setListening]     = useState(false);
  const recognitionRef                = useRef(null);
  const [submitLoading, setSubmitLoading] = useState(false);

  // Evaluation
  const [evaluation, setEvaluation] = useState(null);

  useEffect(() => {
    Promise.all([
      rolesAPI.getAll({ manager_id: user.id }),
      employeeAPI.getAll({ manager_id: user.id }),
    ]).then(([r, e]) => {
      setRoles(r.data || []);
      setEmployees(e.data || []);
    });
  }, [user.id]);

  // ── Speech to text ────────────────────────────────────────
  const toggleListening = async () => {
    if (!('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)) {
      setAlert({ type: 'warning', msg: 'Speech recognition not supported in this browser' });
      return;
    }
    if (listening) {
      recognitionRef.current?.stop();
      setListening(false);
      return;
    }

    // Request microphone permission first
    try {
      await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch (err) {
      if (err.name === 'NotAllowedError') {
        setAlert({ type: 'error', msg: 'Microphone permission denied. Please enable microphone in browser settings.' });
      } else if (err.name === 'NotFoundError') {
        setAlert({ type: 'error', msg: 'No microphone found. Please plug in a microphone or check your device.' });
      } else {
        setAlert({ type: 'error', msg: 'Could not access microphone: ' + err.message });
      }
      return;
    }

    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    const rec = new SR();
    rec.continuous = true;
    rec.interimResults = false;
    rec.lang = 'en-US';
    rec.onresult = (e) => {
      const transcript = Array.from(e.results).map(r => r[0].transcript).join(' ');
      setAnswers(prev => {
        const next = [...prev];
        next[currentQ] = (next[currentQ] || '') + ' ' + transcript;
        return next;
      });
    };
    rec.onerror = (e) => {
      let errorMsg = 'Microphone error occurred';
      let isRetryable = false;

      if (e.error === 'no-speech') {
        errorMsg = 'No speech detected. Please try again.';
        isRetryable = true;
      } else if (e.error === 'audio-capture') {
        errorMsg = 'No microphone found. Please check your device.';
      } else if (e.error === 'permission-denied') {
        errorMsg = 'Microphone permission denied.';
      } else if (e.error === 'network') {
        errorMsg = 'Speech service unavailable. Retrying...';
        isRetryable = true;
      }

      setAlert({ type: isRetryable ? 'warning' : 'error', msg: errorMsg });
      setListening(false);

      // Auto-retry on network/no-speech errors
      if (isRetryable && e.error === 'network') {
        setTimeout(() => {
          const retryRec = new (window.SpeechRecognition || window.webkitSpeechRecognition)();
          retryRec.continuous = true;
          retryRec.interimResults = false;
          retryRec.lang = 'en-US';
          retryRec.onresult = rec.onresult;
          retryRec.onerror = rec.onerror;
          retryRec.onend = rec.onend;
          retryRec.start();
          recognitionRef.current = retryRec;
          setListening(true);
        }, 800);
      }
    };
    rec.onend = () => setListening(false);
    rec.start();
    recognitionRef.current = rec;
    setListening(true);
  };

  // ── Step 1: Generate questions ────────────────────────────
  const handleGenerate = async () => {
    setSetupLoading(true);
    setAlert(null);
    try {
      let finalResumeText = resumeText;

      // If a file is uploaded, parse it first
      if (resumeFile && selectedEmployee) {
        const fd = new FormData();
        fd.append('resume', resumeFile);
        fd.append('employee_id', selectedEmployee);
        const { data: parsed } = await resumeAPI.parse(fd);
        finalResumeText = parsed.resume_text || finalResumeText;
        setAlert({ type: 'success', msg: `Parsed resume: ${parsed.skills_saved} skills extracted` });
      } else if (resumeFile) {
        const fd = new FormData();
        fd.append('resume', resumeFile);
        const { data: parsed } = await resumeAPI.parse(fd);
        finalResumeText = parsed.resume_text || finalResumeText;
      }

      const { data } = await interviewAPI.generate({
        employee_id:  selectedEmployee  || undefined,
        role_id:      selectedRole      || undefined,
        resume_text:  finalResumeText   || undefined,
        manager_id:   user.id,
      });

      setQuestions(data.questions);
      setInterviewId(data.interview_id || null);
      setAnswers(new Array(data.questions.length).fill(''));
      setCurrentQ(0);
      setStep(1);
    } catch (err) {
      setAlert({ type: 'error', msg: err.response?.data?.error || 'Failed to generate questions. Try again.' });
    } finally {
      setSetupLoading(false);
    }
  };

  // ── Step 2: Submit answers ────────────────────────────────
  const handleSubmit = async () => {
    if (answers.some(a => !a.trim())) {
      if (!confirm('Some questions are unanswered. Submit anyway?')) return;
    }
    setSubmitLoading(true);
    setAlert(null);
    try {
      const { data } = await interviewAPI.evaluate({
        interview_id: interviewId,
        employee_id:  selectedEmployee || undefined,
        role_id:      selectedRole     || undefined,
        questions,
        answers,
      });
      setEvaluation(data.evaluation);
      setStep(2);
    } catch (err) {
      setAlert({ type: 'error', msg: err.response?.data?.error || 'Evaluation failed. Try again.' });
    } finally {
      setSubmitLoading(false);
    }
  };

  const reset = () => {
    setStep(0); setQuestions([]); setAnswers([]); setEvaluation(null);
    setInterviewId(null); setCurrentQ(0); setResumeFile(null);
    setResumeText(''); setSelectedEmployee(''); setSelectedRole('');
    setAlert(null);
  };

  const typeColors = { technical: 'bg-blue-100 text-blue-700', behavioural: 'bg-purple-100 text-purple-700', situational: 'bg-orange-100 text-orange-700' };
  const diffColors = { easy: 'bg-green-100 text-green-700', medium: 'bg-yellow-100 text-yellow-700', hard: 'bg-red-100 text-red-700' };
  const recColors  = { hire: 'bg-green-100 text-green-700 border-green-300', consider: 'bg-yellow-100 text-yellow-700 border-yellow-300', reject: 'bg-red-100 text-red-700 border-red-300' };

  return (
    <div className="min-h-screen bg-gray-50">
      <ManagerNavbar />
      <div className="max-w-3xl mx-auto px-4 py-8 page-enter">
        {/* Step indicator */}
        <div className="flex items-center gap-2 mb-8">
          {STEPS.map((s, i) => (
            <React.Fragment key={s}>
              <div className={`flex items-center gap-2 text-sm font-medium ${i === step ? 'text-blue-600' : i < step ? 'text-green-600' : 'text-gray-400'}`}>
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${i === step ? 'bg-blue-600 text-white' : i < step ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-500'}`}>
                  {i < step ? '✓' : i + 1}
                </div>
                {s}
              </div>
              {i < STEPS.length - 1 && <div className="flex-1 h-px bg-gray-200" />}
            </React.Fragment>
          ))}
        </div>

        {alert && <div className="mb-4"><Alert type={alert.type} message={alert.msg} onClose={() => setAlert(null)} /></div>}

        {/* ── Step 0: Setup ── */}
        {step === 0 && (
          <div className="card space-y-5">
            <div className="flex items-center gap-2 mb-2">
              <Brain size={22} className="text-blue-600" />
              <h2 className="text-xl font-bold text-gray-900">AI Interview Setup</h2>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Select Employee (optional)</label>
                <select className="input" value={selectedEmployee} onChange={e => setSelectedEmployee(e.target.value)}>
                  <option value="">New / External Candidate</option>
                  {employees.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Select Role (optional)</label>
                <select className="input" value={selectedRole} onChange={e => setSelectedRole(e.target.value)}>
                  <option value="">No specific role</option>
                  {roles.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                </select>
              </div>
            </div>

            {/* Toggle paste vs upload */}
            <div className="flex gap-2 text-sm">
              <button onClick={() => setPasteMode(false)} className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${!pasteMode ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600'}`}>
                Upload PDF
              </button>
              <button onClick={() => setPasteMode(true)} className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${pasteMode ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600'}`}>
                Paste Text
              </button>
            </div>

            {!pasteMode ? (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Resume PDF</label>
                <label className="flex flex-col items-center justify-center border-2 border-dashed border-gray-300 rounded-xl p-6 cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition-colors">
                  <Upload size={24} className="text-gray-400 mb-2" />
                  <span className="text-sm text-gray-500">
                    {resumeFile ? resumeFile.name : 'Click to upload or drag & drop a PDF'}
                  </span>
                  <input type="file" accept=".pdf,.txt" className="hidden"
                    onChange={e => setResumeFile(e.target.files[0])} />
                </label>
              </div>
            ) : (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Paste Resume Text</label>
                <textarea className="input h-40 resize-none text-xs leading-relaxed" placeholder="Paste the candidate's resume text here…"
                  value={resumeText} onChange={e => setResumeText(e.target.value)} />
              </div>
            )}

            <button onClick={handleGenerate} disabled={setupLoading || (!resumeFile && !resumeText && !selectedEmployee)}
              className="btn-primary w-full flex items-center justify-center gap-2 py-3">
              {setupLoading ? <><Spinner size="sm" /> Generating questions…</> : <><Brain size={18} /> Generate Interview Questions</>}
            </button>
            {!resumeFile && !resumeText && !selectedEmployee && (
              <p className="text-xs text-center text-gray-400">Select an employee, upload a resume, or paste text to continue</p>
            )}
          </div>
        )}

        {/* ── Step 1: Questions ── */}
        {step === 1 && (
          <div className="space-y-5">
            {/* Progress */}
            <div className="card p-4">
              <div className="flex items-center justify-between text-sm mb-2">
                <span className="text-gray-600">Question {currentQ + 1} of {questions.length}</span>
                <span className="text-gray-400">{answers.filter(a => a.trim()).length} answered</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div className="bg-blue-600 h-2 rounded-full transition-all" style={{ width: `${((currentQ + 1) / questions.length) * 100}%` }} />
              </div>
            </div>

            {/* Question card */}
            <div className="card">
              <div className="flex items-start justify-between mb-4">
                <div className="flex flex-wrap gap-2">
                  {questions[currentQ]?.type && (
                    <span className={`text-xs font-medium px-2.5 py-0.5 rounded-full ${typeColors[questions[currentQ].type] || 'bg-gray-100 text-gray-600'}`}>
                      {questions[currentQ].type}
                    </span>
                  )}
                  {questions[currentQ]?.difficulty && (
                    <span className={`text-xs font-medium px-2.5 py-0.5 rounded-full ${diffColors[questions[currentQ].difficulty] || 'bg-gray-100 text-gray-600'}`}>
                      {questions[currentQ].difficulty}
                    </span>
                  )}
                  {questions[currentQ]?.skill_focus && (
                    <span className="text-xs bg-gray-100 text-gray-600 px-2.5 py-0.5 rounded-full">{questions[currentQ].skill_focus}</span>
                  )}
                </div>
              </div>

              <p className="text-gray-900 font-medium text-lg leading-relaxed mb-5">
                {questions[currentQ]?.question || questions[currentQ]}
              </p>

              <div className="relative">
                <textarea
                  className="input h-36 resize-none pr-12"
                  placeholder="Type your answer or use the microphone…"
                  value={answers[currentQ] || ''}
                  onChange={e => setAnswers(prev => { const n = [...prev]; n[currentQ] = e.target.value; return n; })}
                />
                <button type="button" onClick={toggleListening}
                  className={`absolute right-3 bottom-3 p-2 rounded-full transition-colors ${listening ? 'bg-red-500 text-white' : 'bg-gray-100 text-gray-500 hover:bg-blue-100 hover:text-blue-600'}`}>
                  {listening ? <MicOff size={16} /> : <Mic size={16} />}
                </button>
              </div>
              {listening && <p className="text-xs text-red-500 mt-1 flex items-center gap-1"><span className="animate-pulse">●</span> Listening…</p>}
            </div>

            {/* Nav */}
            <div className="flex items-center justify-between">
              <button onClick={() => setCurrentQ(q => Math.max(0, q - 1))} disabled={currentQ === 0}
                className="btn-secondary disabled:opacity-40">← Previous</button>

              {/* Question dots */}
              <div className="flex gap-1.5">
                {questions.map((_, i) => (
                  <button key={i} onClick={() => setCurrentQ(i)}
                    className={`w-2.5 h-2.5 rounded-full transition-colors ${i === currentQ ? 'bg-blue-600' : answers[i]?.trim() ? 'bg-green-400' : 'bg-gray-300'}`}
                  />
                ))}
              </div>

              {currentQ < questions.length - 1 ? (
                <button onClick={() => setCurrentQ(q => q + 1)} className="btn-primary flex items-center gap-1">
                  Next <ChevronRight size={16} />
                </button>
              ) : (
                <button onClick={handleSubmit} disabled={submitLoading} className="btn-primary flex items-center gap-2">
                  {submitLoading ? <><Spinner size="sm" /> Evaluating…</> : <><CheckCircle size={16} /> Submit</>}
                </button>
              )}
            </div>
          </div>
        )}

        {/* ── Step 2: Evaluation ── */}
        {step === 2 && evaluation && (
          <div className="space-y-5">
            <div className="card text-center">
              <CheckCircle size={40} className="mx-auto text-green-500 mb-3" />
              <h2 className="text-xl font-bold text-gray-900 mb-1">Interview Complete</h2>
              <p className="text-gray-500 text-sm">Here's the AI evaluation</p>
            </div>

            {/* Scores */}
            <div className="card space-y-4">
              <h3 className="font-semibold text-gray-900">Scores</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center bg-blue-50 rounded-xl p-4">
                  <div className="text-3xl font-bold text-blue-600">{evaluation.overall_score}/10</div>
                  <div className="text-xs text-gray-500 mt-1">Overall Score</div>
                </div>
                <div className="text-center bg-purple-50 rounded-xl p-4">
                  <div className="text-3xl font-bold text-purple-600">{evaluation.communication_score}/10</div>
                  <div className="text-xs text-gray-500 mt-1">Communication</div>
                </div>
              </div>

              {/* Skill scores */}
              {evaluation.skill_scores && Object.keys(evaluation.skill_scores).length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-sm font-medium text-gray-700">Skill Scores</h4>
                  {Object.entries(evaluation.skill_scores).map(([skill, score]) => (
                    <RatingBar key={skill} label={skill} value={score} color={score >= 7 ? 'green' : score >= 5 ? 'blue' : 'orange'} />
                  ))}
                </div>
              )}
            </div>

            {/* Recommendation */}
            {evaluation.recommendation && (
              <div className={`card border ${recColors[evaluation.recommendation] || 'bg-gray-100 border-gray-300'}`}>
                <div className="font-semibold capitalize">Recommendation: {evaluation.recommendation}</div>
                {evaluation.summary && <p className="text-sm mt-2 opacity-80">{evaluation.summary}</p>}
              </div>
            )}

            {/* Strengths & Weaknesses */}
            <div className="grid grid-cols-2 gap-4">
              <div className="card">
                <h4 className="font-medium text-green-700 mb-2">✅ Strengths</h4>
                <ul className="space-y-1">
                  {(evaluation.strengths || []).map((s, i) => (
                    <li key={i} className="text-sm text-gray-600 flex items-start gap-1.5"><span className="text-green-500 mt-0.5">•</span>{s}</li>
                  ))}
                </ul>
              </div>
              <div className="card">
                <h4 className="font-medium text-red-700 mb-2">⚠️ Areas to Improve</h4>
                <ul className="space-y-1">
                  {(evaluation.weaknesses || []).map((w, i) => (
                    <li key={i} className="text-sm text-gray-600 flex items-start gap-1.5"><span className="text-red-400 mt-0.5">•</span>{w}</li>
                  ))}
                </ul>
              </div>
            </div>

            <button onClick={reset} className="btn-secondary w-full flex items-center justify-center gap-2">
              <RotateCcw size={16} /> Start New Interview
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
