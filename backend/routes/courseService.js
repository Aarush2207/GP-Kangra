/**
 * Course suggestions database.
 * Maps skill names (lowercase) to curated online course recommendations.
 */
const courseDatabase = {
  // Frontend
  react: [
    { title: 'React Crash Course 2024', url: 'https://www.youtube.com/watch?v=LDB4uaJ87e0', platform: 'YouTube' },
    { title: 'Full React Tutorial', url: 'https://www.youtube.com/watch?v=j942wKiXFu8&list=PL4cUxeGkcC9gZD-Tvwfod2gaISzfRiP9d', platform: 'YouTube' },
    { title: 'React - The Complete Guide', url: 'https://www.udemy.com/course/react-the-complete-guide-incl-redux/', platform: 'Udemy' },
  ],
  javascript: [
    { title: 'JavaScript Full Course for Beginners', url: 'https://www.youtube.com/watch?v=PkZNo7MFNFg', platform: 'YouTube' },
    { title: 'JavaScript: The Complete Guide 2024', url: 'https://www.udemy.com/course/javascript-the-complete-guide-2020-beginner-advanced/', platform: 'Udemy' },
    { title: 'JS Algorithms and Data Structures', url: 'https://www.freecodecamp.org/learn/javascript-algorithms-and-data-structures/', platform: 'freeCodeCamp' },
  ],
  typescript: [
    { title: 'TypeScript Full Course for Beginners', url: 'https://www.youtube.com/watch?v=BwuLxPH8IDs', platform: 'YouTube' },
    { title: 'Understanding TypeScript', url: 'https://www.udemy.com/course/understanding-typescript/', platform: 'Udemy' },
  ],
  css: [
    { title: 'CSS Full Course', url: 'https://www.youtube.com/watch?v=OXGznpKZ_sA', platform: 'YouTube' },
    { title: 'CSS Grid & Flexbox', url: 'https://www.youtube.com/watch?v=t8UAudm8EF0', platform: 'YouTube' },
  ],
  html: [
    { title: 'HTML Full Course', url: 'https://www.youtube.com/watch?v=pQN-pnXPaVg', platform: 'YouTube' },
    { title: 'HTML & CSS for Beginners', url: 'https://www.freecodecamp.org/learn/2022/responsive-web-design/', platform: 'freeCodeCamp' },
  ],
  // Backend
  nodejs: [
    { title: 'Node.js Full Course', url: 'https://www.youtube.com/watch?v=f2EqECiTBL8', platform: 'YouTube' },
    { title: 'Node.js, Express, MongoDB Bootcamp', url: 'https://www.udemy.com/course/nodejs-express-mongodb-bootcamp/', platform: 'Udemy' },
  ],
  express: [
    { title: 'Express.js Crash Course', url: 'https://www.youtube.com/watch?v=L72fhGm1tfE', platform: 'YouTube' },
  ],
  python: [
    { title: 'Python Full Course for Beginners', url: 'https://www.youtube.com/watch?v=_uQrJ0TkZlc', platform: 'YouTube' },
    { title: 'Python Bootcamp', url: 'https://www.udemy.com/course/complete-python-bootcamp/', platform: 'Udemy' },
    { title: 'Python for Data Science', url: 'https://www.youtube.com/watch?v=LHBE6Q9XlzI', platform: 'YouTube' },
  ],
  django: [
    { title: 'Django for Beginners', url: 'https://www.youtube.com/watch?v=PtQiiknWUcI', platform: 'YouTube' },
  ],
  // Database
  sql: [
    { title: 'SQL Full Course', url: 'https://www.youtube.com/watch?v=HXV3zeQKqGY', platform: 'YouTube' },
    { title: 'PostgreSQL Full Course', url: 'https://www.youtube.com/watch?v=qw--VYLpxG4', platform: 'YouTube' },
  ],
  postgresql: [
    { title: 'PostgreSQL Tutorial', url: 'https://www.youtube.com/watch?v=qw--VYLpxG4', platform: 'YouTube' },
  ],
  mongodb: [
    { title: 'MongoDB Crash Course', url: 'https://www.youtube.com/watch?v=-56x56UppqQ', platform: 'YouTube' },
  ],
  // AI/ML
  'machine learning': [
    { title: 'Machine Learning Full Course', url: 'https://www.youtube.com/watch?v=NWONeJKn9Kc', platform: 'YouTube' },
    { title: 'ML by Andrew Ng', url: 'https://www.coursera.org/learn/machine-learning', platform: 'Coursera' },
  ],
  // APIs
  apis: [
    { title: 'REST API Design - Full Course', url: 'https://www.youtube.com/watch?v=0oXYLzuucwE', platform: 'YouTube' },
    { title: 'API Development with Node.js', url: 'https://www.youtube.com/watch?v=ENrzD9HAZK4', platform: 'YouTube' },
  ],
  'rest api': [
    { title: 'REST API Tutorial', url: 'https://www.youtube.com/watch?v=lsMQRaeKNDk', platform: 'YouTube' },
  ],
  // DevOps
  docker: [
    { title: 'Docker Full Course', url: 'https://www.youtube.com/watch?v=pTFZFxd5uri', platform: 'YouTube' },
  ],
  git: [
    { title: 'Git & GitHub Crash Course', url: 'https://www.youtube.com/watch?v=RGOj5yH7evk', platform: 'YouTube' },
  ],
  aws: [
    { title: 'AWS Full Course 2024', url: 'https://www.youtube.com/watch?v=k1RI5locZE4', platform: 'YouTube' },
  ],
  // Data structures
  'data structures': [
    { title: 'Data Structures & Algorithms Full Course', url: 'https://www.youtube.com/watch?v=8hly31xKli0', platform: 'YouTube' },
  ],
};

/**
 * Returns course suggestions for a given skill.
 * Falls back to a generic search link if skill not found.
 *
 * @param {string} skill
 * @returns {Array<{ title, url, platform }>}
 */
function suggestCourses(skill) {
  const key = skill.toLowerCase();

  // Direct match
  if (courseDatabase[key]) return courseDatabase[key];

  // Partial match
  const partialKey = Object.keys(courseDatabase).find(k => k.includes(key) || key.includes(k));
  if (partialKey) return courseDatabase[partialKey];

  // Fallback: YouTube and Udemy search links
  const searchQuery = encodeURIComponent(`${skill} course tutorial`);
  return [
    {
      title: `${skill} - YouTube Tutorials`,
      url: `https://www.youtube.com/results?search_query=${searchQuery}`,
      platform: 'YouTube',
    },
    {
      title: `${skill} - Udemy Courses`,
      url: `https://www.udemy.com/courses/search/?q=${searchQuery}`,
      platform: 'Udemy',
    },
  ];
}

module.exports = { suggestCourses };
