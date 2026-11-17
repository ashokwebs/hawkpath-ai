// Vercel serverless function: POST /api/transcript
import { vercelHandler } from '../server/vercel';

export const config = { api: { bodyParser: { sizeLimit: '7mb' } } };
export default vercelHandler('/api/transcript');
