import 'dotenv/config';
import { supabase } from './lib/supabase.js';

async function run() {
  const { data, error } = await supabase.from('roles').select('*');
  if (error) console.error(error);
  else console.log(JSON.stringify(data, null, 2));
}
run();
