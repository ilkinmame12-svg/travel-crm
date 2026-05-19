import { supabase } from './lib/supabase'

async function test() {
  const { data, error } = await supabase.from('bookings').select('*')
  console.log('data:', data)
  console.log('error:', error)
}

test()
