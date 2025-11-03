const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');


dotenv.config();

const app = express();

// Middleware
app.use(cors({
  origin: '*', // Allow all origins (development only!)
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Basic route
app.get('/', (req, res) => {
  res.json({ message: 'Backend API is running!' });
});

// Routes
app.use('/api/upload', require('./routes/uploadRoutes'));
app.use('/api/agents', require('./routes/agentRoutes'));
app.use('/api/companies', require('./routes/companyRoutes'));
app.use('/api/aggregate', require('./routes/aggregateRoutes'));

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});