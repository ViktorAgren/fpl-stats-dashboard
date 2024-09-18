const express = require('express');
const axios = require('axios');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.static(path.join(__dirname, 'build')));

const API_BASE_URL = 'https://fantasy.premierleague.com/api';

app.get('/api/bootstrap-static', async (req, res) => {
  try {
    const response = await axios.get(`${API_BASE_URL}/bootstrap-static/`);
    res.json(response.data);
  } catch (error) {
    res.status(500).json({ error: 'Error fetching bootstrap-static data' });
  }
});

app.get('/api/element-summary/:id', async (req, res) => {
  try {
    const response = await axios.get(`${API_BASE_URL}/element-summary/${req.params.id}/`);
    res.json(response.data);
  } catch (error) {
    res.status(500).json({ error: 'Error fetching element-summary data' });
  }
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'build', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});