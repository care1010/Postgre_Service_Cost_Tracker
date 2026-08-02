const express = require('express');
const cors = require('cors');
require('dotenv').config();

const dataRoutes = require('./routes/dataRoutes');
const cronRoutes = require('./routes/cronRoutes');
const { initCron } = require('./controllers/cronController');


const app = express();

app.use(cors());
app.use(express.json());
app.use('/api/data', dataRoutes);
app.use('/api/cron', cronRoutes);

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
app.listen(PORT, async () => {
    console.log(`Server running on port ${PORT}`);
    await initCron(); // Initialize background cron!
});
