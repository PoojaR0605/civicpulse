require('dotenv').config();
const express  = require('express');
const cors     = require('cors');
const helmet   = require('helmet');
const { devLogger }              = require('./utils/logger');
const routes                     = require('./routes');
const { errorHandler, notFound } = require('./middleware/errorHandler');

const app = express();

app.use(helmet({
  crossOriginEmbedderPolicy: false,
}));

app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: false,
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(devLogger);

app.use('/api/v1', routes);

app.use(notFound);
app.use(errorHandler);

module.exports = app;