const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '.env') });
const { hasSupabaseConfig } = require('./config');

const authRoutes = require('./routes/auth');
const managerRoutes = require('./routes/manager');
const employeeRoutes = require('./routes/employees');
const roleRoutes = require('./routes/roles');
const interviewRoutes = require('./routes/interview');
const resumeRoutes = require('./routes/resume');
const messageRoutes = require('./routes/messages');

const app = express();
const port = process.env.PORT || 3001;

app.use(cors({ origin: '*' }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

app.use('/api', (req, res, next) => {
  if (req.path === '/health') {
    return next();
  }

  if (!hasSupabaseConfig()) {
    return res.status(503).json({
      error: 'Backend is missing SUPABASE_URL or a valid Supabase key in backend/.env',
    });
  }

  return next();
});

app.use('/api/auth', authRoutes);
app.use('/api/manager', managerRoutes);
app.use('/api/employees', employeeRoutes);
app.use('/api/roles', roleRoutes);
app.use('/api/interview', interviewRoutes);
app.use('/api/resume', resumeRoutes);
app.use('/api/messages', messageRoutes);

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
