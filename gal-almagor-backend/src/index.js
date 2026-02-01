const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');

dotenv.config();

const app = express();

// CORS Configuration
const allowedOrigins = process.env.ALLOWED_ORIGINS 
  ? process.env.ALLOWED_ORIGINS.split(',')
  : ['http://localhost:5173', 'http://localhost:3000'];

app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (mobile apps, Postman, etc.)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.indexOf(origin) !== -1 || process.env.NODE_ENV === 'development') {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Basic route
app.get('/', (req, res) => {
  res.json({ 
    message: 'Backend API is running!',
    environment: process.env.NODE_ENV || 'development',
    version: '1.0.0'
  });
});

// Routes
app.use('/api/upload', require('./routes/uploadRoutes'));
app.use('/api/agents', require('./routes/agentRoutes'));
app.use('/api/companies', require('./routes/companyRoutes'));
app.use('/api/aggregate', require('./routes/aggregateRoutes'));
app.use('/api/targets', require('./routes/targetRoutes'));
app.use('/api/goals', require('./routes/goalsRoutes'));
app.use('/api/unmapped', require('./routes/unmappedRoutes'));
app.use('/api/export', require('./routes/exportRoutes'));
app.use('/api/export/template', require('./routes/exportTemplateRoutes'));

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ 
    success: false,
    message: 'Something went wrong!',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

const PORT = process.env.PORT || 3001;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`Allowed origins: ${allowedOrigins.join(', ')}`);
});