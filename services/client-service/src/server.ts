process.env.TZ = 'Asia/Kolkata';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables BEFORE importing app
dotenv.config({ path: path.resolve(__dirname, '../../../.env') }); // Root .env
dotenv.config({ path: path.resolve(__dirname, '../.env'), override: true }); // Service .env

import app from './app';

const PORT = process.env.PORT || 3008;

app.listen(PORT, () => {
    console.log(`[Client Service] Listening on port ${PORT}`);
});
