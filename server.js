require('dotenv').config();
const express = require('express');
const cors = require('cors');

const connectDB = require('./config/db');

const app = express();

// ***** FIXED CORS *****
app.use(cors({
  origin: [
    "https://keen-druid-4a6c5c.netlify.app",
    "http://localhost:5500",
    "http://localhost:3000"
  ],
  methods: ['GET','POST','PUT','DELETE'],
  allowedHeaders: ['Content-Type','Authorization']
}));

app.use(express.json());

const PORT = process.env.PORT || 5000;
connectDB(process.env.MONGO_URI);

app.get("/", (req, res) => res.send("API is running"));

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/expenses', require('./routes/expenses'));
app.use('/api/password', require('./routes/password'));

app.listen(PORT, () => console.log(`Server running on ${PORT}`));
