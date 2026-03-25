const express = require('express');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const router = express.Router();
const supabase = require('../supabaseClient');
const { suggestCourses } = require('./courseService');

const DEFAULT_GEMINI_MODELS = [
  'gemini-2.0-flash',
  'gemini-2.0-flash-lite',
  'gemini-1.5-flash',
];

let cachedGeminiModel = process.env.GEMINI_MODEL || null;
let warnedAboutModelFallback = false;
let warnedAboutNoSupportedModel = false;

function normalizeSkillName(skill) {
  return String(skill || '')
    .trim()
    .replace(/\s+/g, ' ');
}

function toObject(value) {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return value;
  }

  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        return parsed;
      }
    } catch (_) {
      // ignore malformed JSON
    }
  }

  return {};
}

function parseJsonFromText(text, fallback) {
  try {
    const cleaned = String(text || '')
      .replace(/```json/gi, '')
      .replace(/```/g, '')
      .trim();

    const arrayMatch = cleaned.match(/\[[\s\S]*\]/);
    if (arrayMatch) {
      return JSON.parse(arrayMatch[0]);
    }

    const objectMatch = cleaned.match(/\{[\s\S]*\}/);
    if (objectMatch) {
      return JSON.parse(objectMatch[0]);
    }
  } catch (err) {
    console.error('Failed to parse AI JSON:', err.message);
  }

  return fallback;
}

function isModelNotFoundError(err) {
  const message = String(err?.message || '');
  return /404/i.test(message) && /model/i.test(message);
}

function getGeminiCandidates() {
  const configured = String(process.env.GEMINI_MODEL_CANDIDATES || '')
    .split(',')
    .map((name) => name.trim())
    .filter(Boolean);

  const merged = [
    ...(cachedGeminiModel ? [cachedGeminiModel] : []),
    ...(process.env.GEMINI_MODEL ? [process.env.GEMINI_MODEL] : []),
    ...configured,
    ...DEFAULT_GEMINI_MODELS,
  ];

  return [...new Set(merged)];
}

async function generateWithGemini(prompt) {
  if (!process.env.GEMINI_API_KEY) {
    return null;
  }

  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  const candidates = getGeminiCandidates();

  for (const modelName of candidates) {
    try {
      const model = genAI.getGenerativeModel({ model: modelName });
      const result = await model.generateContent(prompt);
      cachedGeminiModel = modelName;

      if (!warnedAboutModelFallback && process.env.GEMINI_MODEL && process.env.GEMINI_MODEL !== modelName) {
        console.warn(`Gemini model fallback in use: configured "${process.env.GEMINI_MODEL}", active "${modelName}"`);
        warnedAboutModelFallback = true;
      }

      return result.response.text();
    } catch (err) {
      if (isModelNotFoundError(err)) {
        continue;
      }

      throw err;
    }
  }

  if (!warnedAboutNoSupportedModel) {
    console.warn('No supported Gemini model found for this API key/version. Falling back to local logic.');
    warnedAboutNoSupportedModel = true;
  }

  return null;
}

function buildFallbackQuestions({ roleName, focusSkills }) {
  const skills = focusSkills.length > 0 ? focusSkills : ['communication', 'problem solving', 'teamwork'];
  const firstSkill = skills[0];
  const secondSkill = skills[1] || 'technical depth';
  const title = roleName || 'this role';

  return [
    { index: 0, question: `Tell me about your background and why you are a fit for ${title}.`, type: 'behavioural', skill_focus: 'communication', difficulty: 'easy' },
    { index: 1, question: `Describe a project where you used ${firstSkill}. What did you own and what was the outcome?`, type: 'technical', skill_focus: firstSkill, difficulty: 'easy' },
    { index: 2, question: 'How do you approach debugging when something critical is failing in production?', type: 'situational', skill_focus: 'problem solving', difficulty: 'medium' },
    { index: 3, question: `What tradeoffs do you consider when working with ${secondSkill}?`, type: 'technical', skill_focus: secondSkill, difficulty: 'medium' },
    { index: 4, question: 'Describe a time you had to learn a new skill quickly to deliver a result.', type: 'behavioural', skill_focus: 'adaptability', difficulty: 'medium' },
    { index: 5, question: 'How do you communicate technical decisions to teammates or stakeholders with less context?', type: 'behavioural', skill_focus: 'communication', difficulty: 'medium' },
    { index: 6, question: `What are the biggest risks when applying ${firstSkill} in a real project, and how would you reduce them?`, type: 'technical', skill_focus: firstSkill, difficulty: 'hard' },
    { index: 7, question: `If you joined tomorrow, what would your first 30 days in ${title} look like?`, type: 'situational', skill_focus: 'ownership', difficulty: 'hard' },
  ];
}

async function generateQuestionsWithAI({ resumeText, roleName, focusSkills }) {
  if (!process.env.GEMINI_API_KEY) {
    return null;
  }

  try {
    const prompt = `
You are an expert interviewer.
Generate exactly 8 interview questions as a JSON array.

Role: ${roleName || 'General candidate'}
Focus skills: ${focusSkills.join(', ') || 'General skills'}
Resume:
${String(resumeText || '').slice(0, 6000)}

Return ONLY valid JSON in this format:
[
  {
    "index": 0,
    "question": "",
    "type": "technical",
    "skill_focus": "",
    "difficulty": "easy"
  }
]

Rules:
- Use only types: technical, behavioural, situational
- Use only difficulties: easy, medium, hard
- Keep the questions role-relevant and practical
`;

    const rawText = await generateWithGemini(prompt);
    if (!rawText) {
      return null;
    }

    const parsed = parseJsonFromText(rawText, null);

    if (!Array.isArray(parsed) || parsed.length === 0) {
      return null;
    }

    return parsed.slice(0, 8).map((item, index) => ({
      index,
      question: item.question || `Question ${index + 1}`,
      type: item.type || 'technical',
      skill_focus: item.skill_focus || focusSkills[index % Math.max(focusSkills.length, 1)] || 'general',
      difficulty: item.difficulty || (index < 2 ? 'easy' : index < 6 ? 'medium' : 'hard'),
    }));
  } catch (err) {
    console.error('Question generation error:', err.message);
    return null;
  }
}

function scoreAnswer(answer) {
  const text = String(answer || '').trim();
  if (!text) {
    return 0;
  }

  const words = text.split(/\s+/).filter(Boolean);
  let score = 3;

  if (words.length >= 20) score += 2;
  if (words.length >= 50) score += 2;
  if (words.length >= 90) score += 1;
  if (/\b(because|therefore|tradeoff|impact|result|improved|designed|implemented|built|led)\b/i.test(text)) score += 1;
  if (/\b\d+[%x]?\b/.test(text)) score += 1;

  return Math.min(score, 10);
}

function buildFallbackEvaluation(questions, answers) {
  const answeredCount = answers.filter((answer) => String(answer || '').trim()).length;
  const questionScores = questions.map((question, index) => ({
    question,
    score: scoreAnswer(answers[index]),
  }));

  const overallScore = questionScores.length
    ? Number((questionScores.reduce((total, item) => total + item.score, 0) / questionScores.length).toFixed(1))
    : 0;

  const communicationScore = Number(
    (answers.reduce((total, answer) => total + Math.max(scoreAnswer(answer) - 1, 0), 0) / Math.max(answers.length, 1)).toFixed(1)
  );

  const skillScores = {};

  questionScores.forEach(({ question, score }) => {
    const skill = normalizeSkillName(question.skill_focus || 'general');
    if (!skill) return;
    if (!skillScores[skill]) skillScores[skill] = [];
    skillScores[skill].push(score);
  });

  const averagedSkillScores = Object.fromEntries(
    Object.entries(skillScores).map(([skill, scores]) => [
      skill,
      Number((scores.reduce((total, score) => total + score, 0) / scores.length).toFixed(1)),
    ])
  );

  const strengths = [];
  const weaknesses = [];

  if (answeredCount === answers.length && answers.length > 0) {
    strengths.push('Answered every interview question');
  } else if (answeredCount >= Math.ceil(answers.length / 2)) {
    strengths.push('Completed most of the interview');
  } else {
    weaknesses.push('Several questions were left unanswered');
  }

  if (overallScore >= 7) {
    strengths.push('Responses showed solid detail and context');
  } else {
    weaknesses.push('Answers would benefit from more concrete detail');
  }

  if (communicationScore >= 7) {
    strengths.push('Communication was clear and structured');
  } else {
    weaknesses.push('Communication could be more concise and structured');
  }

  const recommendation = overallScore >= 8 ? 'hire' : overallScore >= 6 ? 'consider' : 'reject';
  const summary =
    recommendation === 'hire'
      ? 'Strong interview performance with clear evidence of practical experience.'
      : recommendation === 'consider'
        ? 'Promising interview with some good signals, but there are still a few gaps to validate.'
        : 'The interview showed some potential, but the responses were not strong enough for a confident recommendation yet.';

  return {
    overall_score: overallScore,
    communication_score: communicationScore,
    skill_scores: averagedSkillScores,
    strengths,
    weaknesses,
    recommendation,
    summary,
  };
}

async function evaluateWithAI({ questions, answers, roleName }) {
  if (!process.env.GEMINI_API_KEY) {
    return null;
  }

  try {
    const prompt = `
You are an experienced interview evaluator.
Evaluate the following interview and return ONLY valid JSON.

Role: ${roleName || 'General candidate'}
Questions and answers:
${JSON.stringify(
  questions.map((question, index) => ({
    question: question.question || question,
    skill_focus: question.skill_focus || 'general',
    answer: answers[index] || '',
  })),
  null,
  2
)}

Return JSON in exactly this shape:
{
  "overall_score": 0,
  "communication_score": 0,
  "skill_scores": {
    "Skill": 0
  },
  "strengths": [],
  "weaknesses": [],
  "recommendation": "hire",
  "summary": ""
}

Rules:
- Scores are on a 0-10 scale
- Recommendation must be one of: hire, consider, reject
- Keep strengths and weaknesses concise
`;

    const rawText = await generateWithGemini(prompt);
    if (!rawText) {
      return null;
    }

    const parsed = parseJsonFromText(rawText, null);

    if (!parsed || typeof parsed !== 'object') {
      return null;
    }

    return {
      overall_score: Number(parsed.overall_score || 0),
      communication_score: Number(parsed.communication_score || 0),
      skill_scores: parsed.skill_scores || {},
      strengths: Array.isArray(parsed.strengths) ? parsed.strengths : [],
      weaknesses: Array.isArray(parsed.weaknesses) ? parsed.weaknesses : [],
      recommendation: ['hire', 'consider', 'reject'].includes(parsed.recommendation) ? parsed.recommendation : 'consider',
      summary: parsed.summary || '',
    };
  } catch (err) {
    console.error('Interview evaluation error:', err.message);
    return null;
  }
}

async function saveInterviewSkills(employeeId, skillScores) {
  if (!employeeId || !skillScores || Object.keys(skillScores).length === 0) {
    return;
  }

  const { data: existingSkills, error: existingError } = await supabase
    .from('employee_skills')
    .select('skill_name')
    .eq('employee_id', employeeId);

  if (existingError) {
    console.error('Existing employee skills lookup failed:', existingError.message);
    return;
  }

  const existing = new Set(
    (existingSkills || []).map((skill) => normalizeSkillName(skill.skill_name).toLowerCase())
  );

  const highScoringSkills = Object.entries(skillScores)
    .filter(([, score]) => Number(score) >= 6)
    .map(([skill, score]) => ({
      employee_id: employeeId,
      skill_name: normalizeSkillName(skill),
      proficiency: Number(score) >= 8 ? 'advanced' : 'intermediate',
      source: 'interview',
    }))
    .filter((skill) => skill.skill_name && !existing.has(skill.skill_name.toLowerCase()));

  if (highScoringSkills.length === 0) {
    return;
  }

  const { error } = await supabase.from('employee_skills').insert(highScoringSkills);
  if (error) {
    console.error('Saving interview skills failed:', error.message);
  }
}

function buildCourseRecommendations({ evaluation, roleSkills = [], employeeSkillNames = [] }) {
  const employeeSkills = new Set(
    (employeeSkillNames || []).map((skill) => normalizeSkillName(skill).toLowerCase())
  );
  const gaps = new Map();

  // Required role skills missing from employee profile.
  roleSkills
    .filter((skill) => (skill.importance || 'required') === 'required')
    .forEach((skill) => {
      const normalized = normalizeSkillName(skill.skill_name);
      if (!normalized) return;
      const key = normalized.toLowerCase();
      if (employeeSkills.has(key)) return;

      gaps.set(key, {
        skill_name: normalized,
        gap_score: 3,
        reason: 'Required role skill missing from profile',
        source: 'role_gap',
      });
    });

  // Low interview scores are also treated as skill gaps.
  Object.entries(evaluation?.skill_scores || {}).forEach(([skill, rawScore]) => {
    const normalized = normalizeSkillName(skill);
    if (!normalized) return;
    const numericScore = Number(rawScore);
    if (!Number.isFinite(numericScore) || numericScore >= 7) return;

    const key = normalized.toLowerCase();
    const scoreGap = Number((7 - numericScore).toFixed(1));
    const previous = gaps.get(key);

    gaps.set(key, {
      skill_name: normalized,
      gap_score: previous ? Math.max(previous.gap_score, scoreGap) : scoreGap,
      reason: previous?.reason || 'Interview score indicates improvement needed',
      source: previous?.source || 'interview_gap',
    });
  });

  const sorted = [...gaps.values()].sort((a, b) => {
    if (a.source === b.source) return b.gap_score - a.gap_score;
    return a.source === 'role_gap' ? -1 : 1;
  });

  // If no strict gaps were detected, still suggest learning tracks from weakest interview skills.
  if (sorted.length === 0) {
    const weakestFromInterview = Object.entries(evaluation?.skill_scores || {})
      .map(([skill, score]) => ({
        skill_name: normalizeSkillName(skill),
        score: Number(score),
      }))
      .filter((item) => item.skill_name && Number.isFinite(item.score))
      .sort((a, b) => a.score - b.score)
      .slice(0, 3)
      .map((item) => ({
        skill_name: item.skill_name,
        gap_score: Number((10 - item.score).toFixed(1)),
        reason: 'Practice recommended based on latest interview',
        source: 'interview_improvement',
      }));

    weakestFromInterview.forEach((item) => {
      const key = item.skill_name.toLowerCase();
      if (!gaps.has(key)) {
        gaps.set(key, item);
      }
    });
  }

  // If still empty, use role skills; if no role, provide universal defaults.
  if (gaps.size === 0) {
    const fallbackSkills =
      roleSkills.map((skill) => normalizeSkillName(skill.skill_name)).filter(Boolean).slice(0, 3);
    const defaults = fallbackSkills.length > 0
      ? fallbackSkills
      : ['Communication', 'Problem Solving', 'Technical Fundamentals'];

    defaults.forEach((skill) => {
      const key = skill.toLowerCase();
      gaps.set(key, {
        skill_name: skill,
        gap_score: 2,
        reason: 'Recommended continuous learning',
        source: 'default_recommendation',
      });
    });
  }

  const finalSorted = [...gaps.values()].sort((a, b) => b.gap_score - a.gap_score);

  return finalSorted.slice(0, 6).map((gap) => ({
    ...gap,
    courses: suggestCourses(gap.skill_name).slice(0, 3).map((course) => ({
      title: course.title,
      url: course.url,
      platform: course.platform || 'Online',
      price:
        course.price ||
        (course.platform && String(course.platform).toLowerCase() === 'youtube' ? 'Free' : 'Free Audit'),
      rating: course.rating || null,
    })),
  }));
}

router.post('/generate', async (req, res) => {
  try {
    const { employee_id, role_id, resume_text, manager_id } = req.body;

    let employee = null;
    let role = null;

    if (employee_id) {
      const { data } = await supabase
        .from('employees')
        .select(`
          *,
          employee_skills(*),
          roles(id, name, description, role_skills(*))
        `)
        .eq('id', employee_id)
        .single();
      employee = data || null;
    }

    if (role_id) {
      const { data } = await supabase
        .from('roles')
        .select('*, role_skills(*)')
        .eq('id', role_id)
        .single();
      role = data || null;
    } else if (employee?.roles) {
      role = employee.roles;
    }

    const resumeText = String(resume_text || '').trim() || String(employee?.resume_text || '').trim();
    const focusSkills = [
      ...new Set([
        ...((role?.role_skills || []).map((skill) => normalizeSkillName(skill.skill_name))),
        ...((employee?.employee_skills || []).map((skill) => normalizeSkillName(skill.skill_name))),
      ].filter(Boolean))
    ].slice(0, 6);

    if (!resumeText && !employee_id && focusSkills.length === 0) {
      return res.status(400).json({ error: 'Provide a resume, employee, or role context first' });
    }

    const questions =
      (await generateQuestionsWithAI({ resumeText, roleName: role?.name, focusSkills })) ||
      buildFallbackQuestions({ roleName: role?.name, focusSkills });

    const { data: interview, error } = await supabase
      .from('interviews')
      .insert([{
        employee_id: employee_id || null,
        manager_id: manager_id || employee?.manager_id || null,
        role_id: role_id || role?.id || employee?.role_id || null,
        status: 'in_progress',
        questions,
      }])
      .select()
      .single();

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    return res.json({ interview_id: interview.id, questions });
  } catch (err) {
    console.error('Generate interview error:', err);
    return res.status(500).json({ error: 'Failed to generate interview questions' });
  }
});

router.post('/evaluate', async (req, res) => {
  try {
    const { interview_id, employee_id, role_id, questions = [], answers = [] } = req.body;

    let employeeContext = null;
    if (employee_id) {
      const { data } = await supabase
        .from('employees')
        .select(`
          id,
          role_id,
          manager_id,
          employee_skills(skill_name),
          roles(
            id,
            name,
            role_skills(skill_name, importance)
          )
        `)
        .eq('id', employee_id)
        .single();

      employeeContext = data || null;
    }

    let role = null;
    if (role_id) {
      const { data } = await supabase
        .from('roles')
        .select('*, role_skills(skill_name, importance)')
        .eq('id', role_id)
        .single();
      role = data || null;
    } else if (employeeContext?.roles) {
      role = employeeContext.roles;
    }

    const evaluation =
      (await evaluateWithAI({ questions, answers, roleName: role?.name })) ||
      buildFallbackEvaluation(questions, answers);

    const roleSkills = role?.role_skills || [];
    const employeeSkillNames = (employeeContext?.employee_skills || []).map((skill) => skill.skill_name);
    const courseRecommendations = buildCourseRecommendations({
      evaluation,
      roleSkills,
      employeeSkillNames,
    });

    const recommendationPayload = {
      strengths: evaluation.strengths,
      weaknesses: evaluation.weaknesses,
      recommendation: evaluation.recommendation,
      summary: evaluation.summary,
      course_recommendations: courseRecommendations,
      generated_at: new Date().toISOString(),
    };

    if (interview_id) {
      const answerRows = questions.map((question, index) => ({
        interview_id,
        question_index: index,
        question: question.question || `Question ${index + 1}`,
        answer: answers[index] || '',
      }));

      await supabase.from('interview_answers').delete().eq('interview_id', interview_id);

      if (answerRows.length > 0) {
        const { error: answersError } = await supabase.from('interview_answers').insert(answerRows);
        if (answersError) {
          console.error('Interview answers save error:', answersError.message);
        }
      }

      const { error: interviewError } = await supabase
        .from('interviews')
        .update({
          status: 'completed',
          ai_evaluation: recommendationPayload,
          skill_scores: evaluation.skill_scores,
          overall_score: evaluation.overall_score,
          communication_score: evaluation.communication_score,
          completed_at: new Date().toISOString(),
        })
        .eq('id', interview_id);

      if (interviewError) {
        console.error('Interview update error:', interviewError.message);
      }
    }

    if (employee_id) {
      await supabase
        .from('employees')
        .update({
          overall_rating: evaluation.overall_score,
          communication_rating: evaluation.communication_score,
          updated_at: new Date().toISOString(),
        })
        .eq('id', employee_id);

      await saveInterviewSkills(employee_id, evaluation.skill_scores);
    }

    evaluation.course_recommendations = courseRecommendations;
    return res.json({ evaluation });
  } catch (err) {
    console.error('Evaluate interview error:', err);
    return res.status(500).json({ error: 'Failed to evaluate interview' });
  }
});

router.post('/save', async (req, res) => {
  try {
    const { interview_id, notes, status } = req.body;

    if (!interview_id) {
      return res.status(400).json({ error: 'interview_id is required' });
    }

    const payload = {};
    if (notes !== undefined) payload.notes = notes;
    if (status !== undefined) payload.status = status;

    const { data, error } = await supabase
      .from('interviews')
      .update(payload)
      .eq('id', interview_id)
      .select()
      .single();

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    return res.json(data);
  } catch (err) {
    console.error('Save interview error:', err);
    return res.status(500).json({ error: 'Failed to save interview' });
  }
});

router.post('/report-camera-violation', async (req, res) => {
  try {
    const {
      interview_id,
      employee_id,
      face_count = 0,
      violation_events = 0,
      reason,
    } = req.body;

    if (!interview_id || !employee_id) {
      return res.status(400).json({ error: 'interview_id and employee_id are required' });
    }

    const { data: interview, error: interviewError } = await supabase
      .from('interviews')
      .select('id, employee_id, manager_id, role_id, status, ai_evaluation')
      .eq('id', interview_id)
      .eq('employee_id', employee_id)
      .single();

    if (interviewError || !interview) {
      return res.status(404).json({ error: 'Interview not found for this employee' });
    }

    const existingEvaluation = toObject(interview.ai_evaluation);
    const timestamp = new Date().toISOString();
    const cameraViolationReport = {
      reported_at: timestamp,
      face_count: Number(face_count) || 0,
      violation_events: Number(violation_events) || 0,
      reason: reason || 'Repeated multiple-person detection in webcam feed',
    };

    const mergedEvaluation = {
      ...existingEvaluation,
      summary:
        existingEvaluation.summary ||
        'Interview cancelled due to repeated camera policy violations. Manager has been notified in interview records.',
      recommendation: existingEvaluation.recommendation || 'reject',
      camera_policy_violation: cameraViolationReport,
    };

    const { data: updatedInterview, error: updateError } = await supabase
      .from('interviews')
      .update({
        status: 'cancelled',
        ai_evaluation: mergedEvaluation,
        completed_at: timestamp,
      })
      .eq('id', interview_id)
      .select('id, status, manager_id')
      .single();

    if (updateError) {
      return res.status(500).json({ error: updateError.message });
    }

    return res.json({
      success: true,
      interview: updatedInterview,
      report: cameraViolationReport,
    });
  } catch (err) {
    console.error('Report camera violation error:', err);
    return res.status(500).json({ error: 'Failed to report camera violation' });
  }
});

router.get('/employee/:id', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('interviews')
      .select(`*, roles(id, name)`)
      .eq('employee_id', req.params.id)
      .order('created_at', { ascending: false });

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    return res.json(data || []);
  } catch (err) {
    console.error('Get employee interviews error:', err);
    return res.status(500).json({ error: 'Failed to load interviews' });
  }
});

router.get('/manager/:id', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('interviews')
      .select(`*, employees(id, name, email), roles(id, name)`)
      .eq('manager_id', req.params.id)
      .order('created_at', { ascending: false });

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    return res.json(data || []);
  } catch (err) {
    console.error('Get manager interviews error:', err);
    return res.status(500).json({ error: 'Failed to load interviews' });
  }
});

module.exports = router;
