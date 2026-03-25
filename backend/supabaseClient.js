const { createClient } = require('@supabase/supabase-js');
const { getSupabaseKey } = require('./config');

let client = null;

function getClient() {
  const supabaseKey = getSupabaseKey();

  if (!process.env.SUPABASE_URL || !supabaseKey) {
    throw new Error('Missing SUPABASE_URL or a valid Supabase key in backend/.env');
  }

  if (!client) {
    client = createClient(process.env.SUPABASE_URL, supabaseKey);
  }

  return client;
}

module.exports = new Proxy(
  {},
  {
    get(target, prop) {
      const resolved = getClient()[prop];
      return typeof resolved === 'function' ? resolved.bind(getClient()) : resolved;
    },
  }
);
