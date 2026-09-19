const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 4000;
const DATA_FILE = path.join(__dirname, 'data.json');

// Initial DB template
let db = {
  users: [],
  tasks: [],
  goals: []
};

// Load existing data if file exists
if (fs.existsSync(DATA_FILE)) {
  try {
    db = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
  } catch (err) {
    console.error('Error reading data.json, initializing fresh DB', err);
  }
}

function saveData() {
  fs.writeFileSync(DATA_FILE, JSON.stringify(db, null, 2));
}

// Middleware
app.use(cors({
  origin: true,
  credentials: true
}));
app.use(express.json());
app.use(cookieParser());

// Serve static frontend files
app.use(express.static(path.join(__dirname, '../frontend')));

// Helper: Extract current authenticated user
function getCurrentUser(req) {
  const userId = req.cookies.dt_user_id;
  if (!userId) return null;
  return db.users.find(u => u.id === userId) || null;
}

// Auth Middleware
function requireAuth(req, res, next) {
  const user = getCurrentUser(req);
  if (!user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  req.user = user;
  next();
}

// --- Auth Routes ---
app.post('/api/signup', (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password required' });
  }
  
  const existing = db.users.find(u => u.email.toLowerCase() === email.toLowerCase());
  if (existing) {
    return res.status(400).json({ error: 'User already exists. Please log in.' });
  }

  const newUser = {
    id: 'user_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
    email,
    password
  };

  db.users.push(newUser);
  saveData();

  res.cookie('dt_user_id', newUser.id, { httpOnly: true, sameSite: 'lax', maxAge: 30 * 24 * 60 * 60 * 1000 });
  res.json({ message: 'Signup successful', user: { id: newUser.id, email: newUser.email } });
});

app.post('/api/login', (req, res) => {
  const { email, password } = req.body;
  const user = db.users.find(u => u.email.toLowerCase() === email.toLowerCase());
  if (!user || user.password !== password) {
    return res.status(400).json({ error: 'Invalid email or password' });
  }

  res.cookie('dt_user_id', user.id, { httpOnly: true, sameSite: 'lax', maxAge: 30 * 24 * 60 * 60 * 1000 });
  res.json({ message: 'Login successful', user: { id: user.id, email: user.email } });
});

app.post('/api/logout', (req, res) => {
  res.clearCookie('dt_user_id');
  res.json({ message: 'Logged out' });
});

// --- Tasks Routes ---
app.get('/api/tasks', requireAuth, (req, res) => {
  const userTasks = db.tasks.filter(t => t.userId === req.user.id);
  res.json({ tasks: userTasks });
});

app.post('/api/tasks', requireAuth, (req, res) => {
  const { title, description, priority, category, dueDate, reminderAt, progress } = req.body;
  if (!title) {
    return res.status(400).json({ error: 'Task title is required' });
  }

  const taskProgress = Number(progress) || 0;
  const newTask = {
    _id: 'task_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
    userId: req.user.id,
    title,
    description: description || '',
    priority: priority || 'Medium',
    category: category || 'General',
    dueDate: dueDate || null,
    reminderAt: reminderAt || null,
    progress: taskProgress,
    completed: taskProgress >= 100,
    createdAt: new Date().toISOString()
  };

  db.tasks.unshift(newTask);
  saveData();

  res.json({ task: newTask });
});

app.put('/api/tasks/:id', requireAuth, (req, res) => {
  const taskId = req.params.id;
  const task = db.tasks.find(t => t._id === taskId && t.userId === req.user.id);
  if (!task) {
    return res.status(404).json({ error: 'Task not found' });
  }

  if (req.body.progress !== undefined) {
    task.progress = Number(req.body.progress);
    task.completed = task.progress >= 100;
  }
  if (req.body.title !== undefined) task.title = req.body.title;
  if (req.body.description !== undefined) task.description = req.body.description;
  if (req.body.priority !== undefined) task.priority = req.body.priority;
  if (req.body.category !== undefined) task.category = req.body.category;
  if (req.body.dueDate !== undefined) task.dueDate = req.body.dueDate;
  if (req.body.reminderAt !== undefined) task.reminderAt = req.body.reminderAt;

  saveData();
  res.json({ task });
});

app.delete('/api/tasks/:id', requireAuth, (req, res) => {
  const taskId = req.params.id;
  db.tasks = db.tasks.filter(t => !(t._id === taskId && t.userId === req.user.id));
  saveData();
  res.json({ message: 'Task deleted' });
});

// --- Goals Routes ---
app.get('/api/goals', requireAuth, (req, res) => {
  const userGoals = db.goals.filter(g => g.userId === req.user.id);
  res.json({ goals: userGoals });
});

app.post('/api/goals', requireAuth, (req, res) => {
  const { title, notes, targetDate, progress } = req.body;
  if (!title) {
    return res.status(400).json({ error: 'Goal title required' });
  }

  const newGoal = {
    _id: 'goal_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
    userId: req.user.id,
    title,
    notes: notes || '',
    targetDate: targetDate || null,
    progress: Number(progress) || 0,
    status: (Number(progress) >= 100) ? 'Completed' : 'Active',
    createdAt: new Date().toISOString()
  };

  db.goals.unshift(newGoal);
  saveData();

  res.json({ goal: newGoal });
});

app.put('/api/goals/:id', requireAuth, (req, res) => {
  const goalId = req.params.id;
  const goal = db.goals.find(g => g._id === goalId && g.userId === req.user.id);
  if (!goal) {
    return res.status(404).json({ error: 'Goal not found' });
  }

  if (req.body.progress !== undefined) goal.progress = Number(req.body.progress);
  if (req.body.status !== undefined) goal.status = req.body.status;
  if (req.body.title !== undefined) goal.title = req.body.title;
  if (req.body.notes !== undefined) goal.notes = req.body.notes;
  if (req.body.targetDate !== undefined) goal.targetDate = req.body.targetDate;

  if (goal.progress >= 100) goal.status = 'Completed';

  saveData();
  res.json({ goal });
});

app.delete('/api/goals/:id', requireAuth, (req, res) => {
  const goalId = req.params.id;
  db.goals = db.goals.filter(g => !(g._id === goalId && g.userId === req.user.id));
  saveData();
  res.json({ message: 'Goal deleted' });
});

// --- Analytics Route ---
app.get('/api/analytics', requireAuth, (req, res) => {
  const userTasks = db.tasks.filter(t => t.userId === req.user.id);
  const userGoals = db.goals.filter(g => g.userId === req.user.id);

  const totalTasks = userTasks.length;
  const completedTasks = userTasks.filter(t => t.completed).length;

  const todayStr = new Date().toISOString().split('T')[0];
  const dueToday = userTasks.filter(t => !t.completed && t.dueDate && t.dueDate.startsWith(todayStr)).length;
  
  const now = new Date();
  const overdue = userTasks.filter(t => !t.completed && t.dueDate && new Date(t.dueDate) < now && !t.dueDate.startsWith(todayStr)).length;
  
  const completedToday = userTasks.filter(t => t.completed).length; // simple metric
  const activeGoals = userGoals.filter(g => g.status !== 'Completed').length;

  const totalProgress = userTasks.reduce((acc, t) => acc + (t.progress || 0), 0);
  const avgProgress = totalTasks > 0 ? Math.round(totalProgress / totalTasks) : 0;

  res.json({
    analytics: {
      totalTasks,
      completedTasks,
      dueToday,
      overdue,
      completedToday,
      activeGoals,
      avgProgress
    }
  });
});

app.listen(PORT, () => {
  console.log(`DailyTasks server running live at http://localhost:${PORT}`);
});
