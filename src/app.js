const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const dotenv = require('dotenv');

dotenv.config();

const app = express();

// Security Middlewares
app.use(helmet()); // Sets various HTTP headers for security
app.use(cors({
  origin: (process.env.CORS_ORIGIN && process.env.CORS_ORIGIN.split(',').map(o => o.trim())) || '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-admin-secret']
}));

// Rate Limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again after 15 minutes'
});
app.use('/api/', limiter);

// Log requests
app.use(morgan('dev'));

// Body Parser
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Basic Route
app.get('/', (req, res) => {
  res.status(200).json({ message: 'Vasista Man Power API is running securely.' });
});

// Routes
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/upload', require('./routes/uploadRoutes'));
app.use('/api/collection', require('./routes/dataRoutes'));
app.use('/api/candidates', require('./routes/candidateRoutes'));
app.use('/api/businesses', require('./routes/businessRoutes'));
app.use('/api/allotments', require('./routes/allotmentRoutes'));

// Basic Health Check
app.get('/', (req, res) => {
  res.status(200).json({ message: 'Vasista Man Power API - Minimal Version 2.0' });
});

// Error Handling Middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({
    error: {
      message: err.message || 'Internal Server Error',
      status: err.status || 500
    }
  });
});

module.exports = app;
