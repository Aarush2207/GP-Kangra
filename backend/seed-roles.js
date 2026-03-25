require('dotenv').config();
const supabase = require('./supabaseClient');

const PROFESSIONAL_ROLES = [
  {
    name: 'Senior Frontend Developer',
    description: 'Lead front-end development with modern frameworks and best practices',
    skills: [
      { skill_name: 'React', importance: 'required' },
      { skill_name: 'JavaScript', importance: 'required' },
      { skill_name: 'TypeScript', importance: 'required' },
      { skill_name: 'CSS/SCSS', importance: 'required' },
      { skill_name: 'REST APIs', importance: 'required' },
      { skill_name: 'Git', importance: 'required' },
      { skill_name: 'Testing (Jest/React Testing Library)', importance: 'preferred' },
      { skill_name: 'Performance Optimization', importance: 'preferred' },
    ],
  },
  {
    name: 'Backend Developer',
    description: 'Build scalable server-side applications and APIs',
    skills: [
      { skill_name: 'Node.js', importance: 'required' },
      { skill_name: 'Express.js', importance: 'required' },
      { skill_name: 'Database Design', importance: 'required' },
      { skill_name: 'PostgreSQL/MySQL', importance: 'required' },
      { skill_name: 'API Design', importance: 'required' },
      { skill_name: 'System Design', importance: 'preferred' },
      { skill_name: 'Authentication/Security', importance: 'preferred' },
      { skill_name: 'Cloud Deployment', importance: 'preferred' },
    ],
  },
  {
    name: 'Full Stack Developer',
    description: 'Develop complete web applications from front-end to back-end',
    skills: [
      { skill_name: 'React', importance: 'required' },
      { skill_name: 'Node.js', importance: 'required' },
      { skill_name: 'JavaScript', importance: 'required' },
      { skill_name: 'Database Design', importance: 'required' },
      { skill_name: 'REST APIs', importance: 'required' },
      { skill_name: 'HTML/CSS', importance: 'required' },
      { skill_name: 'Version Control', importance: 'preferred' },
      { skill_name: 'DevOps Basics', importance: 'preferred' },
    ],
  },
  {
    name: 'Product Manager',
    description: 'Define product vision and manage development roadmap',
    skills: [
      { skill_name: 'Product Strategy', importance: 'required' },
      { skill_name: 'User Research', importance: 'required' },
      { skill_name: 'Requirements Analysis', importance: 'required' },
      { skill_name: 'Data Analysis', importance: 'required' },
      { skill_name: 'Cross-functional Leadership', importance: 'required' },
      { skill_name: 'Agile/Scrum', importance: 'preferred' },
      { skill_name: 'Wireframing/Prototyping', importance: 'preferred' },
      { skill_name: 'Market Research', importance: 'preferred' },
    ],
  },
  {
    name: 'UX/UI Designer',
    description: 'Create exceptional user experiences and interfaces',
    skills: [
      { skill_name: 'Figma', importance: 'required' },
      { skill_name: 'UI Design Principles', importance: 'required' },
      { skill_name: 'User Research', importance: 'required' },
      { skill_name: 'Prototyping', importance: 'required' },
      { skill_name: 'Design Systems', importance: 'preferred' },
      { skill_name: 'Accessibility (A11y)', importance: 'preferred' },
      { skill_name: 'Usability Testing', importance: 'preferred' },
      { skill_name: 'HTML/CSS basics', importance: 'bonus' },
    ],
  },
  {
    name: 'DevOps Engineer',
    description: 'Manage infrastructure, deployment, and system reliability',
    skills: [
      { skill_name: 'Docker', importance: 'required' },
      { skill_name: 'Kubernetes', importance: 'required' },
      { skill_name: 'CI/CD Pipelines', importance: 'required' },
      { skill_name: 'Cloud Platforms (AWS/GCP/Azure)', importance: 'required' },
      { skill_name: 'Linux', importance: 'required' },
      { skill_name: 'Infrastructure as Code', importance: 'preferred' },
      { skill_name: 'Monitoring/Logging', importance: 'preferred' },
      { skill_name: 'Networking Basics', importance: 'preferred' },
    ],
  },
  {
    name: 'Data Scientist',
    description: 'Extract insights from data and build predictive models',
    skills: [
      { skill_name: 'Python', importance: 'required' },
      { skill_name: 'Machine Learning', importance: 'required' },
      { skill_name: 'Statistical Analysis', importance: 'required' },
      { skill_name: 'SQL', importance: 'required' },
      { skill_name: 'Data Visualization', importance: 'required' },
      { skill_name: 'Pandas/NumPy', importance: 'required' },
      { skill_name: 'Deep Learning', importance: 'preferred' },
      { skill_name: 'Big Data Tools', importance: 'preferred' },
    ],
  },
  {
    name: 'QA Engineer',
    description: 'Ensure software quality through testing and validation',
    skills: [
      { skill_name: 'Test Automation', importance: 'required' },
      { skill_name: 'Manual Testing', importance: 'required' },
      { skill_name: 'Test Case Design', importance: 'required' },
      { skill_name: 'Bug Tracking', importance: 'required' },
      { skill_name: 'Selenium/WebDriver', importance: 'preferred' },
      { skill_name: 'API Testing', importance: 'preferred' },
      { skill_name: 'Performance Testing', importance: 'preferred' },
      { skill_name: 'Regression Testing', importance: 'preferred' },
    ],
  },
  {
    name: 'Solutions Architect',
    description: 'Design and oversee technical solutions for clients',
    skills: [
      { skill_name: 'System Design', importance: 'required' },
      { skill_name: 'Cloud Architecture', importance: 'required' },
      { skill_name: 'Technical Communication', importance: 'required' },
      { skill_name: 'Enterprise Systems', importance: 'required' },
      { skill_name: 'Database Architecture', importance: 'required' },
      { skill_name: 'Security Architecture', importance: 'preferred' },
      { skill_name: 'Scalability Design', importance: 'preferred' },
      { skill_name: 'Disaster Recovery', importance: 'preferred' },
    ],
  },
  {
    name: 'Mobile Developer (iOS)',
    description: 'Develop native iOS applications',
    skills: [
      { skill_name: 'Swift', importance: 'required' },
      { skill_name: 'iOS SDK', importance: 'required' },
      { skill_name: 'UIKit/SwiftUI', importance: 'required' },
      { skill_name: 'Xcode', importance: 'required' },
      { skill_name: 'Core Data', importance: 'required' },
      { skill_name: 'Networking', importance: 'preferred' },
      { skill_name: 'Performance Optimization', importance: 'preferred' },
      { skill_name: 'App Store Deployment', importance: 'preferred' },
    ],
  },
  {
    name: 'Mobile Developer (Android)',
    description: 'Develop native Android applications',
    skills: [
      { skill_name: 'Kotlin', importance: 'required' },
      { skill_name: 'Android SDK', importance: 'required' },
      { skill_name: 'Android Studio', importance: 'required' },
      { skill_name: 'Material Design', importance: 'required' },
      { skill_name: 'Java', importance: 'required' },
      { skill_name: 'SQLite', importance: 'preferred' },
      { skill_name: 'REST APIs', importance: 'preferred' },
      { skill_name: 'Google Play Deployment', importance: 'preferred' },
    ],
  },
  {
    name: 'Security Engineer',
    description: 'Implement security controls and protect against threats',
    skills: [
      { skill_name: 'Network Security', importance: 'required' },
      { skill_name: 'Cryptography', importance: 'required' },
      { skill_name: 'Vulnerability Assessment', importance: 'required' },
      { skill_name: 'OWASP Top 10', importance: 'required' },
      { skill_name: 'Penetration Testing', importance: 'preferred' },
      { skill_name: 'Secure Coding', importance: 'preferred' },
      { skill_name: 'Security Compliance', importance: 'preferred' },
      { skill_name: 'Incident Response', importance: 'preferred' },
    ],
  },
];

async function seedRoles() {
  try {
    // Get the first manager from the database (demo manager)
    const { data: managers, error: managerError } = await supabase
      .from('managers')
      .select('id')
      .limit(1);

    if (managerError || !managers || managers.length === 0) {
      console.error('No manager found. Please create a manager account first.');
      process.exit(1);
    }

    const managerId = managers[0].id;
    console.log(`\n🌱 Seeding ${PROFESSIONAL_ROLES.length} roles for manager: ${managerId}\n`);

    let successCount = 0;
    let errorCount = 0;

    for (const roleData of PROFESSIONAL_ROLES) {
      try {
        // Create role
        const { data: role, error: roleErr } = await supabase
          .from('roles')
          .insert([{
            manager_id: managerId,
            name: roleData.name,
            description: roleData.description,
          }])
          .select()
          .single();

        if (roleErr) {
          console.error(`❌ Failed to create role "${roleData.name}":`, roleErr.message);
          errorCount++;
          continue;
        }

        // Add skills to role
        if (roleData.skills && roleData.skills.length > 0) {
          const skillRows = roleData.skills.map(s => ({
            role_id: role.id,
            skill_name: s.skill_name,
            importance: s.importance,
          }));

          const { error: skillErr } = await supabase
            .from('role_skills')
            .insert(skillRows);

          if (skillErr) {
            console.error(`⚠️  Created role "${roleData.name}" but failed to add skills:`, skillErr.message);
            errorCount++;
            continue;
          }
        }

        console.log(`✅ Created role: "${roleData.name}" with ${roleData.skills.length} skills`);
        successCount++;
      } catch (err) {
        console.error(`❌ Error creating role "${roleData.name}":`, err.message);
        errorCount++;
      }
    }

    console.log(`\n📊 Seeding Summary:`);
    console.log(`   ✅ Successfully created: ${successCount} roles`);
    console.log(`   ❌ Failed: ${errorCount} roles\n`);

    if (successCount > 0) {
      console.log('🎉 Roles seeded successfully! You can now view them in the Roles Management page.\n');
    }

    process.exit(errorCount > 0 ? 1 : 0);
  } catch (error) {
    console.error('💥 Fatal error during seeding:', error);
    process.exit(1);
  }
}

// Run the seed
seedRoles();
