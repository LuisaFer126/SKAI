import app from '../backend/app.js';

// Vercel Node function entrypoint
export default (req, res) => {
  return app(req, res);
};

