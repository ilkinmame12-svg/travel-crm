import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://mhiafbxagsuczrhbfaim.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1oaWFmYnhhZ3N1Y3pyaGJmYWltIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkxODgxNTcsImV4cCI6MjA5NDc2NDE1N30.ekccTLvVxyUG-TjeufYJ-Un_y5YwRFNf-yIpmGeE5uQ'

export const supabase = createClient(supabaseUrl, supabaseKey)
