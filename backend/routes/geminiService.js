const { GoogleGenerativeAI } = require('@google/generative-ai');
require('dotenv').config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

/**
 * Generate interview questions based on resume text.
 * Uses Gemini to extract skills and create relevant questions.
 *
 * @param {string} resumeText
 * @returns {Array<{ id: number, question: string, category: string }>}
 */
async function generateInterview(resumeText) {
  const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

  const prompt = `
You are an expert technical interviewer. Analyze the following resume and generate exactly 8 interview questions.

Resume:
${resumeText.slice(0, 6000)}

Instructions:
- Extract the candidate's skills, technologies, and experience from the resume
- Generate 8 targeted interview questions covering: technical skills, project experience, problem-solving, and communication
- Mix difficulty levels: 3 easy, 3 medium, 2 hard
- Return ONLY a valid JSON array with no markdown, no code fences, no explanation

Format:
[
  { "id": 1, "question": "...", "category": "Technical", "difficulty": "Easy" },
  { "id": 2, "question": "...", "category": "Project Experience", "difficulty": "Medium" },
  ...
]
`;

  try {
    const result = await model.generateContent(prompt);
    const text = result.response.text().trim();

    // Strip markdown code fences if present
    const cleaned = text.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim();

    // Extract JSON array
    const jsonMatch = cleaned.match(/\[[\s\S]*\]/);
    if (!jsonMatch) throw new Error('Could not parse questions from AI response');

    return JSON.parse(jsonMatch[0]);
  } catch (err) {
    console.error('Gemini generateInterview error:', err.message);
    // Return fallback questions
    return [
      { id: 1, question: "Tell me about your most challenging project and how you overcame obstacles.", category: "Project Experience", difficulty: "Medium" },
      { id: 2, question: "How do you approach debugging a complex issue in production?", category: "Problem Solving", difficulty: "Medium" },
      { id: 3, question: "Describe your experience with team collaboration and version control.", category: "Soft Skills", difficulty: "Easy" },
      { id: 4, question: "What technologies are you most proficient in and why?", category: "Technical", difficulty: "Easy" },
      { id: 5, question: "How do you stay updated with new technologies in your field?", category: "Soft Skills", difficulty: "Easy" },
      { id: 6, question: "Describe a situation where you had to learn a new technology quickly.", category: "Adaptability", difficulty: "Medium" },
      { id: 7, question: "How do you prioritize tasks when working on multiple projects?", category: "Project Management", difficulty: "Medium" },
      { id: 8, question: "Walk me through your approach to system design for a scalable application.", category: "Technical", difficulty: "Hard" },
    ];
  }
}

/**
 * Evaluate candidate answers from an interview.
 * Returns structured ratings, strengths, weaknesses, and overall score.
 *
 * @param {Array} questions - Array of question objects
 * @param {Array} answers - Array of answer strings (matching order)
 * @param {string} resumeText - Original resume for context
 * @returns {{ skills: Object, communication: number, strengths: string[], weaknesses: string[], overallScore: number }}
 */
async function evaluateInterview(questions, answers, resumeText = '') {
  const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

  // Build Q&A pairs
  const qaPairs = questions.map((q, i) => ({
    question: q.question || q,
    answer: answers[i] || '(No answer provided)',
  }));

  const prompt = `
You are an expert HR evaluator. Evaluate the following interview responses and provide structured scoring.

Resume Context:
${resumeText.slice(0, 1000)}

Interview Q&A:
${JSON.stringify(qaPairs, null, 2)}

Instructions:
- Analyze each answer for technical depth, communication clarity, and problem-solving ability
- Extract skills mentioned and rate them from 1-5
- Assess communication quality (1-5)
- Identify key strengths and weaknesses
- Calculate overall score (1-5)
- Return ONLY valid JSON with no markdown

Required JSON format:
{
  "skills": {
    "SkillName": 4,
    "AnotherSkill": 3
  },
  "communication": 4,
  "strengths": ["strength1", "strength2", "strength3"],
  "weaknesses": ["weakness1", "weakness2"],
  "overallScore": 3.5,
  "summary": "Brief evaluation summary in 2 sentences."
}
`;

  try {
    const result = await model.generateContent(prompt);
    const text = result.response.text().trim();

    // Strip markdown code fences if present
    const cleaned = text.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim();

    // Extract JSON object from response
    const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('Could not parse evaluation from AI response');

    const evaluation = JSON.parse(jsonMatch[0]);

    // Ensure required fields exist
    return {
      skills: evaluation.skills || {},
      communication: evaluation.communication || 3,
      strengths: evaluation.strengths || [],
      weaknesses: evaluation.weaknesses || [],
      overallScore: evaluation.overallScore || 3.0,
      summary: evaluation.summary || '',
    };
  } catch (err) {
    console.error('Gemini evaluateInterview error:', err.message);
    // Return a default evaluation
    return {
      skills: {},
      communication: 3,
      strengths: ['Shows enthusiasm', 'Willing to learn'],
      weaknesses: ['Needs more specific examples'],
      overallScore: 3.0,
      summary: 'Candidate showed reasonable potential. Further evaluation recommended.',
    };
  }
}

module.exports = { generateInterview, evaluateInterview };
