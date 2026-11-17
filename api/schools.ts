// Vercel serverless function: GET /api/schools (College Scorecard outcomes, cached)
import { vercelHandler } from '../server/vercel.js';

export default vercelHandler('/api/schools');
