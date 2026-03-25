import React, { useEffect, useState } from 'react';
import { ClipboardList, ChevronDown, ChevronUp } from 'lucide-react';
import ManagerNavbar from '../../components/ManagerNavbar';
import { Spinner, EmptyState, RatingBar } from '../../components/UI';
import { interviewAPI } from '../../api';
import { useAuth } from '../../context/AuthContext';

export default function InterviewsPage() {
  const { user } = useAuth();
  const [interviews, setInterviews] = useState([]);
  const [loading, setLoading]       = useState(true);
  const [expanded, setExpanded]     = useState(null);

  useEffect(() => {
    interviewAPI.getForManager(user.id)
      .then(r => setInterviews(r.data || []))
      .finally(() => setLoading(false));
  }, [user.id]);

  const statusColors = {
    completed:   'bg-green-100 text-green-700',
    in_progress: 'bg-yellow-100 text-yellow-700',
    cancelled:   'bg-red-100 text-red-700',
    pending:     'bg-gray-100 text-gray-600',
  };

  const recColors = {
    hire:     'text-green-600',
    consider: 'text-yellow-600',
    reject:   'text-red-600',
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <ManagerNavbar />
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 page-enter">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Interview History</h1>
          <p className="text-gray-500 text-sm mt-1">{interviews.length} interview{interviews.length !== 1 ? 's' : ''} total</p>
        </div>

        {loading ? (
          <div className="flex justify-center py-20"><Spinner size="lg" /></div>
        ) : interviews.length === 0 ? (
          <div className="card"><EmptyState icon={ClipboardList} title="No interviews yet" description="Run an AI interview from the Interview tab" /></div>
        ) : (
          <div className="space-y-3">
            {interviews.map(iv => {
              const evaluation = iv.ai_evaluation || {};
              const cameraViolation = evaluation.camera_policy_violation || null;
              return (
                <div key={iv.id} className="card p-0 overflow-hidden">
                  <div
                    className="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-50"
                    onClick={() => setExpanded(expanded === iv.id ? null : iv.id)}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-sm">
                        {iv.employees?.name?.[0]?.toUpperCase() || '?'}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-gray-900">{iv.employees?.name || 'External Candidate'}</span>
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusColors[iv.status]}`}>{iv.status}</span>
                        </div>
                        <div className="flex items-center gap-3 text-xs text-gray-400 mt-0.5">
                          {iv.roles?.name && <span>{iv.roles.name}</span>}
                          <span>{new Date(iv.created_at).toLocaleDateString()}</span>
                          {iv.overall_score > 0 && <span className="text-blue-600 font-medium">Score: {iv.overall_score}/10</span>}
                          {evaluation.recommendation && (
                            <span className={`font-medium capitalize ${recColors[evaluation.recommendation]}`}>
                              → {evaluation.recommendation}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    {expanded === iv.id ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                  </div>

                  {expanded === iv.id && (
                    <div className="border-t border-gray-100 p-4 space-y-4 bg-gray-50">
                      {evaluation.summary && (
                        <p className="text-sm text-gray-600 bg-white rounded-lg p-3 border border-gray-200">{evaluation.summary}</p>
                      )}

                      {cameraViolation && (
                        <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                          <h4 className="text-xs font-semibold text-red-700 uppercase tracking-wide mb-1">
                            Camera Policy Violation Report
                          </h4>
                          <p className="text-xs text-red-700">
                            Faces detected: {cameraViolation.face_count || 0} • Violation events: {cameraViolation.violation_events || 0}
                          </p>
                          {cameraViolation.reason && (
                            <p className="text-xs text-red-700 mt-1">{cameraViolation.reason}</p>
                          )}
                        </div>
                      )}

                      {/* Scores */}
                      {(iv.overall_score > 0 || iv.communication_score > 0) && (
                        <div className="grid grid-cols-2 gap-3">
                          {iv.overall_score > 0 && (
                            <div className="bg-white rounded-lg p-3 border border-gray-200 text-center">
                              <div className="text-2xl font-bold text-blue-600">{iv.overall_score}/10</div>
                              <div className="text-xs text-gray-400">Overall</div>
                            </div>
                          )}
                          {iv.communication_score > 0 && (
                            <div className="bg-white rounded-lg p-3 border border-gray-200 text-center">
                              <div className="text-2xl font-bold text-purple-600">{iv.communication_score}/10</div>
                              <div className="text-xs text-gray-400">Communication</div>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Skill scores */}
                      {iv.skill_scores && Object.keys(iv.skill_scores).length > 0 && (
                        <div className="bg-white rounded-lg p-3 border border-gray-200 space-y-2">
                          <h4 className="text-xs font-semibold text-gray-700 uppercase tracking-wide">Skill Scores</h4>
                          {Object.entries(iv.skill_scores).map(([skill, score]) => (
                            <RatingBar key={skill} label={skill} value={score}
                              color={score >= 7 ? 'green' : score >= 5 ? 'blue' : 'orange'} />
                          ))}
                        </div>
                      )}

                      {/* Strengths / Weaknesses */}
                      {(evaluation.strengths?.length > 0 || evaluation.weaknesses?.length > 0) && (
                        <div className="grid grid-cols-2 gap-3">
                          {evaluation.strengths?.length > 0 && (
                            <div className="bg-white rounded-lg p-3 border border-green-200">
                              <h4 className="text-xs font-semibold text-green-700 mb-1">Strengths</h4>
                              <ul className="space-y-0.5">
                                {evaluation.strengths.map((s, i) => (
                                  <li key={i} className="text-xs text-gray-600">• {s}</li>
                                ))}
                              </ul>
                            </div>
                          )}
                          {evaluation.weaknesses?.length > 0 && (
                            <div className="bg-white rounded-lg p-3 border border-red-200">
                              <h4 className="text-xs font-semibold text-red-700 mb-1">Weaknesses</h4>
                              <ul className="space-y-0.5">
                                {evaluation.weaknesses.map((w, i) => (
                                  <li key={i} className="text-xs text-gray-600">• {w}</li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
