const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL || 'https://sjujcjvmjaqqstpdldsj.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || 'sb_publishable_PPmQk6Lyn3H7QApDy0YhoA_zi3xB3_e';

const supabase = createClient(supabaseUrl, supabaseKey);

async function authenticateSupabaseUser(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Missing or invalid Authorization header.' });
    }

    const token = authHeader.split(' ')[1];
    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (error || !user) {
      return res.status(401).json({ error: 'Invalid or expired Supabase authentication session.' });
    }

    // Attach verified user to request object
    req.user = user;
    next();
  } catch (err) {
    console.error('[Supabase Auth Middleware Error]:', err.message);
    return res.status(401).json({ error: 'Authentication verification failed.' });
  }
}

module.exports = { authenticateSupabaseUser, supabase };
