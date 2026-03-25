import React from 'react';
import { Link } from 'react-router-dom';
import { Brain, Users, Briefcase, TrendingUp, ArrowRight, Star } from 'lucide-react';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
      {/* Header */}
      <header className="max-w-7xl mx-auto px-6 py-6 flex items-center justify-between">
        <div className="flex items-center gap-2 text-blue-600 font-bold text-xl">
          <Brain size={28} />
          SkillSense AI
        </div>
        <div className="flex gap-3">
          <Link to="/login/employee" className="text-sm text-gray-600 hover:text-blue-600 px-4 py-2 rounded-lg border border-gray-300 hover:border-blue-300 transition-colors">
            Employee Login
          </Link>
          <Link to="/login/manager" className="text-sm text-white bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-lg transition-colors">
            Manager Login
          </Link>
        </div>
      </header>

      {/* Hero */}
      <main className="max-w-7xl mx-auto px-6 pt-16 pb-24 text-center">
        <div className="inline-flex items-center gap-2 bg-blue-100 text-blue-700 text-sm font-medium px-4 py-1.5 rounded-full mb-6">
          <Star size={14} />
          AI-Powered Talent Intelligence
        </div>
        <h1 className="text-5xl font-extrabold text-gray-900 leading-tight mb-6">
          Hire Smarter.<br />
          <span className="text-blue-600">Grow Faster.</span>
        </h1>
        <p className="text-xl text-gray-500 max-w-2xl mx-auto mb-10">
          Parse resumes with AI, conduct intelligent interviews, track skills, identify gaps,
          and rank employees — all in one dashboard.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center mb-20">
          <Link
            to="/login/manager"
            className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold px-8 py-3.5 rounded-xl text-lg transition-colors"
          >
            Manager Portal <ArrowRight size={18} />
          </Link>
          <Link
            to="/login/employee"
            className="flex items-center justify-center gap-2 bg-white hover:bg-gray-50 text-gray-700 font-semibold px-8 py-3.5 rounded-xl text-lg border border-gray-300 transition-colors"
          >
            Employee Portal
          </Link>
        </div>

        {/* Feature cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-left">
          {[
            {
              icon: Brain,
              color: 'bg-purple-100 text-purple-600',
              title: 'AI Resume Parsing',
              desc: 'Automatically extract skills, experience, and qualifications from any resume with Gemini AI.'
            },
            {
              icon: Users,
              color: 'bg-blue-100 text-blue-600',
              title: 'Smart Interviews',
              desc: 'Generate custom interview questions based on the role and candidate profile, then get AI evaluations.'
            },
            {
              icon: TrendingUp,
              color: 'bg-green-100 text-green-600',
              title: 'Skill Gap Analysis',
              desc: 'Instantly see which skills employees are missing and get course recommendations to bridge the gaps.'
            },
          ].map(({ icon: Icon, color, title, desc }) => (
            <div key={title} className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-4 ${color}`}>
                <Icon size={20} />
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">{title}</h3>
              <p className="text-gray-500 text-sm leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
