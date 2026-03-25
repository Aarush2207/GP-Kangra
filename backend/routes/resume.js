const express = require('express');
const multer = require('multer');
const pdfParse = require('pdf-parse');
const router = express.Router();
const supabase = require('../supabaseClient');

const upload = multer({ storage: multer.memoryStorage() });

const SKILL_PATTERNS = [
  ['JavaScript', /\bjavascript\b/i],
  ['TypeScript', /\btypescript\b/i],
  ['React', /\breact(\.js)?\b/i],
  ['Next.js', /\bnext\.?js\b/i],
  ['Node.js', /\bnode\.?js\b/i],
  ['Express', /\bexpress\b/i],
  ['HTML', /\bhtml5?\b/i],
  ['CSS', /\bcss3?\b/i],
  ['Tailwind CSS', /\btailwind\b/i],
  ['Redux', /\bredux\b/i],
  ['Python', /\bpython\b/i],
  ['Django', /\bdjango\b/i],
  ['Flask', /\bflask\b/i],
  ['FastAPI', /\bfastapi\b/i],
  ['Java', /\bjava\b/i],
  ['Spring Boot', /\bspring boot\b/i],
  ['C#', /\bc#\b/i],
  ['.NET', /\b\.net\b/i],
  ['SQL', /\bsql\b/i],
  ['PostgreSQL', /\bpostgres(ql)?\b/i],
  ['MySQL', /\bmysql\b/i],
  ['MongoDB', /\bmongodb\b/i],
  ['Supabase', /\bsupabase\b/i],
  ['Firebase', /\bfirebase\b/i],
  ['Git', /\bgit\b/i],
  ['Docker', /\bdocker\b/i],
  ['Kubernetes', /\bkubernetes\b/i],
  ['AWS', /\baws\b|amazon web services/i],
  ['Azure', /\bazure\b/i],
  ['GCP', /\bgoogle cloud\b|\bgcp\b/i],
  ['REST API', /\brest(ful)? api\b/i],
  ['GraphQL', /\bgraphql\b/i],
  ['Machine Learning', /\bmachine learning\b/i],
  ['TensorFlow', /\btensorflow\b/i],
  ['PyTorch', /\bpytorch\b/i],
  ['Pandas', /\bpandas\b/i],
  ['NumPy', /\bnumpy\b/i],
  ['Power BI', /\bpower bi\b/i],
  ['Tableau', /\btableau\b/i],
  ['Figma', /\bfigma\b/i],
  ['Agile', /\bagile\b/i],
  ['Scrum', /\bscrum\b/i],
  ['Jest', /\bjest\b/i],
  ['Cypress', /\bcypress\b/i],
  ['Playwright', /\bplaywright\b/i],
  ['Linux', /\blinux\b/i],
];

function extractSkillsFromText(text) {
  return [...new Set(
    SKILL_PATTERNS
      .filter(([, pattern]) => pattern.test(text))
      .map(([skill]) => skill)
  )];
}

async function getResumeText(file) {
  if (!file) {
    throw new Error('Resume file is required');
  }

  const isPdf =
    file.mimetype === 'application/pdf' ||
    String(file.originalname || '').toLowerCase().endsWith('.pdf');

  if (isPdf) {
    const parsed = await pdfParse(file.buffer);
    return String(parsed.text || '').trim();
  }

  return file.buffer.toString('utf8').trim();
}

router.post('/parse', upload.single('resume'), async (req, res) => {
  try {
    const resumeText = await getResumeText(req.file);
    const employeeId = req.body.employee_id || null;

    if (!resumeText) {
      return res.status(400).json({ error: 'Could not extract text from the uploaded file' });
    }

    const skills = extractSkillsFromText(resumeText);

    if (employeeId) {
      const { error: employeeError } = await supabase
        .from('employees')
        .update({
          resume_text: resumeText,
          resume_filename: req.file.originalname || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', employeeId);

      if (employeeError) {
        return res.status(500).json({ error: employeeError.message });
      }

      const { error: deleteError } = await supabase
        .from('employee_skills')
        .delete()
        .eq('employee_id', employeeId)
        .eq('source', 'resume');

      if (deleteError) {
        return res.status(500).json({ error: deleteError.message });
      }

      if (skills.length > 0) {
        const { error: insertError } = await supabase
          .from('employee_skills')
          .insert(
            skills.map((skill) => ({
              employee_id: employeeId,
              skill_name: skill,
              proficiency: 'intermediate',
              source: 'resume',
            }))
          );

        if (insertError) {
          return res.status(500).json({ error: insertError.message });
        }
      }
    }

    return res.json({
      resume_text: resumeText,
      skills,
      skills_saved: skills.length,
    });
  } catch (err) {
    console.error('Resume parse error:', err);
    return res.status(500).json({ error: err.message || 'Failed to parse resume' });
  }
});

module.exports = router;
