import app from './app';
import dotenv from 'dotenv';

dotenv.config();

const PORT = process.env.PORT || 3008;

app.listen(PORT, () => {
    console.log(`[Client Service] Listening on port ${PORT}`);
});
