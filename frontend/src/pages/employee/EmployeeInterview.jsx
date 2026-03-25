import React, { useEffect, useState, useRef } from 'react';
import { Brain, Mic, MicOff, ChevronRight, CheckCircle, RotateCcw, AlertCircle, Camera } from 'lucide-react';
import EmployeeNavbar from '../../components/EmployeeNavbar';
import { Spinner, Alert, RatingBar } from '../../components/UI';
import { interviewAPI, rolesAPI } from '../../api';
import { useAuth } from '../../context/AuthContext';

const STEPS = ['Setup', 'Interview', 'Results'];

export default function EmployeeInterview() {
  const { user } = useAuth();
  const [step, setStep]           = useState(0);
  const [roles, setRoles]         = useState([]);
  const [selectedRole, setSelectedRole] = useState('');
  const [alert, setAlert]         = useState(null);
  const [generating, setGenerating] = useState(false);

  // Interview
  const [questions, setQuestions]   = useState([]);
  const [interviewId, setInterviewId] = useState(null);
  const [answers, setAnswers]       = useState([]);
  const [currentQ, setCurrentQ]     = useState(0);
  const [listening, setListening]   = useState(false);
  const recognitionRef              = useRef(null);
  const [submitting, setSubmitting] = useState(false);

  // Results
  const [evaluation, setEvaluation] = useState(null);

  // Camera
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const detectionFrameRef = useRef(null);
  const detectorRef = useRef(null);
  const cameraViolationEventsRef = useRef(0);
  const violationActiveRef = useRef(false);
  const cancellingForPolicyRef = useRef(false);
  const cameraSessionRef = useRef(0);
  const [cameraEnabled, setCameraEnabled] = useState(false);
  const [cameraLoading, setCameraLoading] = useState(false);
  const [cameraActive, setCameraActive] = useState(false);
  const [faceCount, setFaceCount] = useState(0);
  const [detectionError, setDetectionError] = useState(null);

  useEffect(() => {
    rolesAPI.getAll({ manager_id: user.manager_id || '' })
      .then(r => setRoles(r.data || []))
      .catch(() => {}); // roles optional
  }, [user.manager_id]);

  const stopCamera = () => {
    cameraSessionRef.current += 1;
    if (detectionFrameRef.current) {
      cancelAnimationFrame(detectionFrameRef.current);
      detectionFrameRef.current = null;
    }
    detectorRef.current = null;
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setCameraActive(false);
    setFaceCount(0);
  };

  const ensureVideoDimensions = async (sessionId) => {
    const video = videoRef.current;
    if (!video) return false;

    if (video.videoWidth > 0 && video.videoHeight > 0) {
      video.width = video.videoWidth;
      video.height = video.videoHeight;
      return true;
    }

    await new Promise((resolve) => {
      const onReady = () => {
        video.removeEventListener('loadedmetadata', onReady);
        resolve();
      };

      video.addEventListener('loadedmetadata', onReady, { once: true });

      if (video.readyState >= 1 && video.videoWidth > 0 && video.videoHeight > 0) {
        onReady();
      }
    });

    if (cameraSessionRef.current !== sessionId || !videoRef.current) {
      return false;
    }

    if (video.videoWidth > 0 && video.videoHeight > 0) {
      video.width = video.videoWidth;
      video.height = video.videoHeight;
      return true;
    }

    video.width = 320;
    video.height = 240;
    return true;
  };

  const startFaceDetection = async (sessionId) => {
    if (!window.ml5 || typeof window.ml5.faceApi !== 'function' || !videoRef.current || !streamRef.current) {
      if (cameraSessionRef.current === sessionId) {
        setDetectionError('Face detection is unavailable in this browser');
      }
      return;
    }

    try {
      // ml5@0.12.x uses the faceApi constructor + model-ready callback pattern.
      let detector;
      let detectionStarted = false;
      let modelReady = false;
      const beginDetectionLoop = () => {
        if (detectionStarted || cameraSessionRef.current !== sessionId) {
          return;
        }

        detectionStarted = true;

        const detectFaces = () => {
          if (
            cameraSessionRef.current !== sessionId ||
            !streamRef.current ||
            !videoRef.current ||
            detectorRef.current !== detector
          ) {
            return;
          }

          detector.detect((err, results) => {
            if (cameraSessionRef.current !== sessionId || detectorRef.current !== detector) {
              return;
            }

            if (!err) {
              const faces = Array.isArray(results) ? results : [];
              setFaceCount(faces.length);
              setDetectionError(null);
            } else {
              setDetectionError('Face detection failed. Please try again.');
            }

            detectionFrameRef.current = requestAnimationFrame(detectFaces);
          });
        };

        detectFaces();
      };
      const handleModelReady = () => {
        modelReady = true;
        if (detector) {
          beginDetectionLoop();
        }
      };

      detector = await window.ml5.faceApi(
        videoRef.current,
        {
          withLandmarks: true,
          withExpressions: false,
          withDescriptors: false,
        },
        handleModelReady,
      );

      if (cameraSessionRef.current !== sessionId || !streamRef.current || !videoRef.current) {
        return;
      }

      detectorRef.current = detector;
      await ensureVideoDimensions(sessionId);
      if (modelReady) {
        beginDetectionLoop();
      }
    } catch (err) {
      if (cameraSessionRef.current === sessionId) {
        setDetectionError('Face detection could not be initialized');
      }
    }
  };

  const startCamera = async () => {
    setCameraLoading(true);
    setDetectionError(null);
    stopCamera();
    const sessionId = ++cameraSessionRef.current;

    if (!navigator.mediaDevices?.getUserMedia) {
      setDetectionError('Camera is not supported in this browser');
      setCameraLoading(false);
      return;
    }

    try {
      let stream;
      try {
        // Prefer front camera on mobile so the browser does not switch to rear camera.
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            width: { ideal: 320 },
            height: { ideal: 240 },
            facingMode: { ideal: 'user' },
          },
          audio: false,
        });
      } catch {
        stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
      }

      if (!videoRef.current) {
        stream.getTracks().forEach((track) => track.stop());
        setCameraLoading(false);
        return;
      }

      videoRef.current.srcObject = stream;
      streamRef.current = stream;
      await videoRef.current.play().catch(() => {});
      await ensureVideoDimensions(sessionId);
      setCameraActive(true);

      const initDetection = () => void startFaceDetection(sessionId);

      if (!window.ml5) {
        const scriptId = 'ml5-face-detection-script';
        let script = document.getElementById(scriptId);

        if (!script) {
          script = document.createElement('script');
          script.id = scriptId;
          script.src = 'https://unpkg.com/ml5@0.12.2/dist/ml5.min.js';
          script.async = true;
          document.head.appendChild(script);
        }

        script.addEventListener('load', initDetection, { once: true });
        script.addEventListener('error', () => setDetectionError('Failed to load face detection'), { once: true });
      } else {
        initDetection();
      }
    } catch (err) {
      setCameraActive(false);
      if (err.name === 'NotAllowedError') {
        setDetectionError('Camera permission denied');
      } else if (err.name === 'NotFoundError') {
        setDetectionError('No camera found');
      } else {
        setDetectionError('Camera unavailable');
      }
    } finally {
      setCameraLoading(false);
    }
  };

  const cancelInterviewForCameraPolicy = async (detectedFaces, violationEvents) => {
    if (cancellingForPolicyRef.current) return;
    cancellingForPolicyRef.current = true;

    recognitionRef.current?.stop();
    setListening(false);
    stopCamera();
    setCameraEnabled(false);

    const currentInterviewId = interviewId;

    try {
      if (currentInterviewId) {
        await interviewAPI.reportCameraViolation({
          interview_id: currentInterviewId,
          employee_id: user.id,
          face_count: detectedFaces,
          violation_events: violationEvents,
          reason: 'Repeated multiple-person detection in camera feed',
        });
      }
    } catch (err) {
      console.error('Camera policy report failed:', err);
    }

    setQuestions([]);
    setAnswers([]);
    setCurrentQ(0);
    setInterviewId(null);
    setStep(0);

    setAlert({
      type: 'error',
      msg: 'Interview cancelled: multiple people were detected again. This has been reported in manager interview records.',
    });

    cameraViolationEventsRef.current = 0;
    violationActiveRef.current = false;
    cancellingForPolicyRef.current = false;
  };

  // Camera detection effect
  useEffect(() => {
    if (step !== 1 || !cameraEnabled) {
      stopCamera();
      return;
    }

    startCamera();

    return () => {
      stopCamera();
    };
  }, [step, cameraEnabled]);

  useEffect(() => {
    if (step !== 1 || !cameraEnabled || !cameraActive) {
      violationActiveRef.current = false;
      return;
    }

    const violating = faceCount >= 2;
    if (!violating) {
      violationActiveRef.current = false;
      return;
    }

    if (violationActiveRef.current) {
      return;
    }

    violationActiveRef.current = true;
    cameraViolationEventsRef.current += 1;
    const violationEvents = cameraViolationEventsRef.current;

    if (violationEvents === 1) {
      setAlert({
        type: 'warning',
        msg:
          faceCount > 2
            ? 'Warning: more than 2 people detected. Keep only one person in camera.'
            : 'Warning: more than one person detected. Keep only one person in camera.',
      });
      return;
    }

    void cancelInterviewForCameraPolicy(faceCount, violationEvents);
  }, [step, cameraEnabled, cameraActive, faceCount]);

  const toggleListening = async () => {
    if (!('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)) {
      setAlert({ type: 'warning', msg: 'Speech recognition not supported. Please type your answer.' });
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
        next[currentQ] = (next[currentQ] || '') + ' ' + transcript.trim();
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

  const handleGenerate = async () => {
    setGenerating(true);
    setAlert(null);
    cameraViolationEventsRef.current = 0;
    violationActiveRef.current = false;
    cancellingForPolicyRef.current = false;
    try {
      const { data } = await interviewAPI.generate({
        employee_id: user.id,
        role_id:     selectedRole || undefined,
      });
      setQuestions(data.questions);
      setInterviewId(data.interview_id || null);
      setAnswers(new Array(data.questions.length).fill(''));
      setCurrentQ(0);
      setStep(1);
    } catch (err) {
      setAlert({ type: 'error', msg: err.response?.data?.error || 'Failed to generate questions. Make sure you have uploaded a resume.' });
    } finally {
      setGenerating(false);
    }
  };

  const handleSubmit = async () => {
    if (answers.filter(a => a.trim()).length < Math.ceil(questions.length / 2)) {
      if (!confirm('You have answered fewer than half the questions. Submit anyway?')) return;
    }
    setSubmitting(true);
    try {
      const { data } = await interviewAPI.evaluate({
        interview_id: interviewId,
        employee_id:  user.id,
        role_id:      selectedRole || undefined,
        questions,
        answers,
      });
      setEvaluation(data.evaluation);
      setStep(2);
    } catch (err) {
      setAlert({ type: 'error', msg: err.response?.data?.error || 'Failed to evaluate answers.' });
    } finally {
      setSubmitting(false);
    }
  };

  const reset = () => {
    setStep(0); setQuestions([]); setAnswers([]); setEvaluation(null);
    setInterviewId(null); setCurrentQ(0); setSelectedRole(''); setAlert(null);
    setCameraEnabled(false); setDetectionError(null);
    cameraViolationEventsRef.current = 0;
    violationActiveRef.current = false;
    cancellingForPolicyRef.current = false;
  };

  const typeColors = {
    technical:   'bg-blue-100 text-blue-700',
    behavioural: 'bg-purple-100 text-purple-700',
    situational: 'bg-orange-100 text-orange-700',
  };

  const recColors = {
    hire:     'bg-green-50 border-green-300 text-green-700',
    consider: 'bg-yellow-50 border-yellow-300 text-yellow-700',
    reject:   'bg-red-50 border-red-300 text-red-700',
  };

  const cameraReady = cameraEnabled && cameraActive;

  return (
    <div className="min-h-screen bg-gray-50">
      <EmployeeNavbar />
      <div className="max-w-2xl mx-auto px-4 py-8 page-enter">
        {/* Step bar */}
        <div className="flex items-center gap-2 mb-8">
          {STEPS.map((s, i) => (
            <React.Fragment key={s}>
              <div className={`flex items-center gap-1.5 text-sm font-medium ${i === step ? 'text-blue-600' : i < step ? 'text-green-600' : 'text-gray-400'}`}>
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${i === step ? 'bg-blue-600 text-white' : i < step ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-500'}`}>
                  {i < step ? '✓' : i + 1}
                </div>
                <span className="hidden sm:block">{s}</span>
              </div>
              {i < STEPS.length - 1 && <div className="flex-1 h-px bg-gray-200" />}
            </React.Fragment>
          ))}
        </div>

        {alert && <div className="mb-4"><Alert type={alert.type} message={alert.msg} onClose={() => setAlert(null)} /></div>}

        {/* ── Step 0: Setup ── */}
        {step === 0 && (
          <div className="card space-y-5">
            <div className="flex items-center gap-2">
              <Brain size={22} className="text-blue-600" />
              <h2 className="text-xl font-bold text-gray-900">Practice Interview</h2>
            </div>
            <p className="text-sm text-gray-500">
              The AI will generate custom questions based on your profile and skills.
              Upload your resume first if you haven't already.
            </p>

            {roles.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Interview for Role (optional)</label>
                <select className="input" value={selectedRole} onChange={e => setSelectedRole(e.target.value)}>
                  <option value="">General interview</option>
                  {roles.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                </select>
              </div>
            )}

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-700">
              <strong>Tips:</strong> Answer honestly and in detail. The AI evaluates technical depth,
              communication clarity, and problem-solving. Use the microphone for hands-free answering.
            </div>

            <button onClick={handleGenerate} disabled={generating} className="btn-primary w-full flex items-center justify-center gap-2 py-3">
              {generating ? <><Spinner size="sm" /> Preparing questions…</> : <><Brain size={18} /> Start Interview</>}
            </button>
          </div>
        )}

        {/* ── Step 1: Interview ── */}
        {step === 1 && (
          <div className="space-y-4 relative">
            <div className="card p-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-gray-900">Camera Monitoring</p>
                  <p className="text-xs text-gray-600">
                    {cameraEnabled
                      ? 'Enabled for face-count monitoring during interview'
                      : 'Disabled. Turn on only if needed.'}
                  </p>
                </div>
                <button
                  onClick={() => setCameraEnabled((prev) => !prev)}
                  disabled={cameraLoading}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    cameraEnabled
                      ? 'bg-gray-200 text-gray-800 hover:bg-gray-300'
                      : 'bg-blue-600 text-white hover:bg-blue-700'
                  } disabled:opacity-60`}
                >
                  {cameraLoading ? 'Starting...' : cameraEnabled ? 'Turn Off Camera' : 'Turn On Camera'}
                </button>
              </div>
              {detectionError && (
                <p className="mt-2 text-xs text-yellow-700 bg-yellow-50 border border-yellow-200 rounded px-2 py-1">
                  {detectionError}
                </p>
              )}
            </div>

            {/* Camera Feed - Top Right */}
            {cameraEnabled && (
              <div className={`fixed top-20 right-4 z-40 border-4 rounded-lg overflow-hidden shadow-lg transition-colors ${
                faceCount > 2 ? 'border-red-500 bg-red-50' : 'border-blue-400 bg-blue-50'
              }`}>
                <div className="relative w-56 sm:w-64 h-40 sm:h-48 bg-gray-900">
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    width={320}
                    height={240}
                    className={`w-full h-full object-cover transition-opacity ${cameraActive ? 'opacity-100' : 'opacity-0'}`}
                  />

                  {!cameraActive && (
                    <div className="absolute inset-0 flex items-center justify-center text-white/90 text-sm">
                      {cameraLoading ? 'Starting camera...' : 'Waiting for camera...'}
                    </div>
                  )}

                  {/* Face Count Badge */}
                  <div className={`absolute top-2 right-2 px-3 py-1.5 rounded-full text-white text-sm font-semibold ${
                    faceCount > 2 ? 'bg-red-500' : 'bg-blue-500'
                  }`}>
                    <Camera size={14} className="inline mr-1" />
                    {faceCount} {faceCount === 1 ? 'person' : 'people'}
                  </div>

                  {/* Warning Badge */}
                  {cameraActive && faceCount > 2 && (
                    <div className="absolute bottom-2 left-2 right-2 bg-red-500 text-white text-xs font-bold px-2 py-1 rounded flex items-center gap-1 justify-center">
                      <AlertCircle size={12} />
                      Multiple people detected!
                    </div>
                  )}
                </div>
              </div>
            )}
            {cameraReady ? (
              <>
            {/* Progress */}
            <div className="card p-4">
              <div className="flex justify-between text-sm mb-2">
                <span className="text-gray-600">Question {currentQ + 1} / {questions.length}</span>
                <span className="text-gray-400">{answers.filter(a => a.trim()).length} answered</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-1.5">
                <div className="bg-blue-600 h-1.5 rounded-full transition-all"
                  style={{ width: `${((currentQ + 1) / questions.length) * 100}%` }} />
              </div>
            </div>

            <div className="card">
              {/* Tags */}
              <div className="flex flex-wrap gap-2 mb-4">
                {questions[currentQ]?.type && (
                  <span className={`text-xs px-2.5 py-0.5 rounded-full font-medium ${typeColors[questions[currentQ].type] || 'bg-gray-100 text-gray-600'}`}>
                    {questions[currentQ].type}
                  </span>
                )}
                {questions[currentQ]?.skill_focus && (
                  <span className="text-xs bg-gray-100 text-gray-600 px-2.5 py-0.5 rounded-full">
                    {questions[currentQ].skill_focus}
                  </span>
                )}
              </div>

              <p className="text-gray-900 font-medium text-lg leading-relaxed mb-5">
                {questions[currentQ]?.question || questions[currentQ]}
              </p>

              <div className="relative">
                <textarea
                  className="input h-40 resize-none pr-12"
                  placeholder="Type your answer or click the mic to speak…"
                  value={answers[currentQ] || ''}
                  onChange={e => setAnswers(prev => { const n = [...prev]; n[currentQ] = e.target.value; return n; })}
                />
                <button type="button" onClick={toggleListening}
                  className={`absolute right-3 bottom-3 p-2 rounded-full transition-colors ${listening ? 'bg-red-500 text-white animate-pulse' : 'bg-gray-100 text-gray-500 hover:bg-blue-100 hover:text-blue-600'}`}>
                  {listening ? <MicOff size={16} /> : <Mic size={16} />}
                </button>
              </div>
              {listening && <p className="text-xs text-red-500 mt-1 flex items-center gap-1"><span className="animate-pulse">●</span> Recording…</p>}
            </div>

            <div className="flex items-center justify-between">
              <button onClick={() => setCurrentQ(q => Math.max(0, q - 1))} disabled={currentQ === 0}
                className="btn-secondary disabled:opacity-40">← Prev</button>

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
                <button onClick={handleSubmit} disabled={submitting} className="btn-primary flex items-center gap-2 bg-green-600 hover:bg-green-700">
                  {submitting ? <><Spinner size="sm" /> Evaluating…</> : <><CheckCircle size={16} /> Submit</>}
                </button>
              )}
            </div>
              </>
            ) : (
              <div className="card border border-dashed border-blue-200 bg-blue-50/70 text-blue-800">
                <h3 className="font-semibold text-lg mb-1">Turn on the camera to view questions</h3>
                <p className="text-sm">
                  The interview questions will stay hidden until camera monitoring is active.
                </p>
              </div>
            )}
          </div>
        )}

        {/* ── Step 2: Results ── */}
        {step === 2 && evaluation && (
          <div className="space-y-5">
            <div className="card text-center">
              <CheckCircle size={40} className="mx-auto text-green-500 mb-2" />
              <h2 className="text-xl font-bold">Interview Complete!</h2>
              <p className="text-sm text-gray-500 mt-1">Your results have been saved to your profile</p>
            </div>

            {/* Scores */}
            <div className="card space-y-4">
              <h3 className="font-semibold text-gray-900">Your Scores</h3>
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-blue-50 rounded-xl p-4 text-center">
                  <div className="text-3xl font-bold text-blue-600">{evaluation.overall_score}/10</div>
                  <div className="text-xs text-gray-500 mt-1">Overall</div>
                </div>
                <div className="bg-purple-50 rounded-xl p-4 text-center">
                  <div className="text-3xl font-bold text-purple-600">{evaluation.communication_score}/10</div>
                  <div className="text-xs text-gray-500 mt-1">Communication</div>
                </div>
              </div>
              {evaluation.skill_scores && Object.keys(evaluation.skill_scores).length > 0 && (
                <div className="space-y-2">
                  {Object.entries(evaluation.skill_scores).map(([skill, score]) => (
                    <RatingBar key={skill} label={skill} value={score}
                      color={score >= 7 ? 'green' : score >= 5 ? 'blue' : 'orange'} />
                  ))}
                </div>
              )}
            </div>

            {/* Recommendation + Summary */}
            {evaluation.recommendation && (
              <div className={`card border ${recColors[evaluation.recommendation] || 'bg-gray-50 border-gray-200 text-gray-700'}`}>
                <div className="font-semibold capitalize mb-1">Verdict: {evaluation.recommendation}</div>
                {evaluation.summary && <p className="text-sm opacity-90">{evaluation.summary}</p>}
              </div>
            )}

            {/* Strengths / Weaknesses */}
            <div className="grid grid-cols-2 gap-4">
              {evaluation.strengths?.length > 0 && (
                <div className="card">
                  <h4 className="font-medium text-green-700 mb-2 text-sm">✅ Strengths</h4>
                  <ul className="space-y-1">
                    {evaluation.strengths.map((s, i) => <li key={i} className="text-xs text-gray-600">• {s}</li>)}
                  </ul>
                </div>
              )}
              {evaluation.weaknesses?.length > 0 && (
                <div className="card">
                  <h4 className="font-medium text-orange-700 mb-2 text-sm">📈 Improve</h4>
                  <ul className="space-y-1">
                    {evaluation.weaknesses.map((w, i) => <li key={i} className="text-xs text-gray-600">• {w}</li>)}
                  </ul>
                </div>
              )}
            </div>

            <button onClick={reset} className="btn-secondary w-full flex items-center justify-center gap-2">
              <RotateCcw size={16} /> Take Another Interview
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
