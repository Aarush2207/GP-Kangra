function getSupabaseKey() {
  return process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_KEY || '';
}

function hasSupabaseConfig() {
  return Boolean(process.env.SUPABASE_URL && getSupabaseKey());
}

module.exports = {
  getSupabaseKey,
  hasSupabaseConfig,
};
