-- Add email_history column to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS email_history JSONB DEFAULT '[]'::jsonb;

-- Create index for faster querying
CREATE INDEX IF NOT EXISTS idx_profiles_email_history ON public.profiles USING gin (email_history);

-- Comment on column
COMMENT ON COLUMN public.profiles.email_history IS 'Log of automated emails sent to the user';
