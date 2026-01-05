import app from './app';
import dotenv from 'dotenv';

dotenv.config();

const PORT = process.env.PORT || 3002;

app.listen(PORT, () => {
    console.log(`[User Service] Listening on port ${PORT}`);
});
