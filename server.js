const express = require('express');
const cors = require('cors');
const axios = require('axios');

const app = express();
app.use(cors());

const PORT = 3001;

app.get('/api/element-summary/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const response = await axios.get(`https://fantasy.premierleague.com/api/element-summary/${id}/`);
    res.json(response.data);
  } catch (error) {
    console.error('Error fetching data:', error);
    res.status(500).json({ error: 'An error occurred while fetching data' });
  }
});

app.get('/api/bootstrap-static', async (req, res) => {
  try {
    const response = await axios.get('https://fantasy.premierleague.com/api/bootstrap-static/');
    res.json(response.data);
  } catch (error) {
    console.error('Error fetching bootstrap-static data:', error);
    res.status(500).json({ error: 'An error occurred while fetching bootstrap-static data' });
  }
});

app.listen(PORT, () => {
  console.log(`Proxy server running on http://localhost:${PORT}`);
});