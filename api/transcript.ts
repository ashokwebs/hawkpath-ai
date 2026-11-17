// Vercel serverless function: POST /api/transcript
import { vercelHandler } from '../server/vercel.js';

export const config = { api: { bodyParser: { sizeLimit: '7mb' } } };
export default vercelHandler('/api/transcript');
