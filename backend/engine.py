import os
import json
import google.generativeai as genai
from dotenv import load_dotenv

load_dotenv()
genai.configure(api_key=os.getenv("GEMINI_API_KEY"))

model = genai.GenerativeModel("gemini-1.5-flash")


# 1. Extract Skills
def extract_skills_from_resume(resume_text: str):
    prompt = f"""
Extract all skills from resume.

Return JSON array only.
Example: ["Python","React","Communication"]

Resume:
{resume_text}
"""
    res = model.generate_content(prompt)
    return json.loads(res.text.strip().replace("```", ""))


# 2. Generate Question
def generate_question(skill, q_num, previous_qa=[]):

    history = ""
    for qa in previous_qa:
        history += f"Q: {qa['question']}\nA: {qa['answer']}\n"

    prompt = f"""
You are an interviewer.

Skill: {skill}
Question number: {q_num}/10

Previous:
{history}

Ask ONE question only.
"""

    res = model.generate_content(prompt)
    return res.text.strip()


# 3. Evaluate + Communication + Skill Gap
def evaluate_skill(skill, qa_pairs):

    convo = ""
    for qa in qa_pairs:
        convo += f"Q: {qa['question']}\nA: {qa['answer']}\n"

    prompt = f"""
Evaluate candidate.

Skill: {skill}

{convo}

Return JSON:
{{
 "rating": 1-5,
 "technical": "...",
 "communication": "...",
 "strengths": ["",""],
 "weakness": ["",""]
}}
"""
    res = model.generate_content(prompt)
    return json.loads(res.text.replace("```", ""))


# 4. Course Recommendation 🔥
def recommend_courses(weak_skills):

    prompt = f"""
Suggest courses for:

{weak_skills}

Return JSON:
[
 {{
  "skill": "",
  "courses": ["course1","course2"]
 }}
]
"""
    res = model.generate_content(prompt)
    return json.loads(res.text.replace("```", ""))