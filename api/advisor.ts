// Vercel serverless function: POST /api/advisor
// Configure GEMINI_API_KEY in Vercel → Project → Environment Variables (never in the repo).
import { vercelHandler } from '../server/vercel';

export default vercelHandler('/api/advisor');
