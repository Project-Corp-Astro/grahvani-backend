process.env.TZ = 'Asia/Kolkata';
import app from './app';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../../../.env') }); // Root .env
dotenv.config({ path: path.resolve(__dirname, '../.env'), override: true }); // Service .env

const PORT = process.env.PORT || 3008;

app.listen(PORT, () => {
    console.log(`[Client Service] Listening on port ${PORT}`);
});
