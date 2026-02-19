-- Enable RLS on strategy_performance table
ALTER TABLE strategy_performance ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "Enable read access for all users" ON strategy_performance;
DROP POLICY IF EXISTS "Enable insert for service role" ON strategy_performance;
DROP POLICY IF EXISTS "Enable update for service role" ON strategy_performance;

-- Create policy to allow public read access
CREATE POLICY "Enable read access for all users" 
ON strategy_performance 
FOR SELECT 
USING (true);

-- Create policy to allow service role to insert/update
CREATE POLICY "Enable insert for service role" 
ON strategy_performance 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Enable update for service role" 
ON strategy_performance 
FOR UPDATE 
USING (true);

-- Verify policies
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies
WHERE tablename = 'strategy_performance';
