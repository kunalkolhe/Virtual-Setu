-- Add Aadhaar fields to profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS aadhaar_number   TEXT,
  ADD COLUMN IF NOT EXISTS aadhaar_hash     TEXT,
  ADD COLUMN IF NOT EXISTS aadhaar_address  TEXT,
  ADD COLUMN IF NOT EXISTS aadhaar_dob      TEXT,
  ADD COLUMN IF NOT EXISTS aadhaar_verified BOOLEAN DEFAULT FALSE;

-- Unique constraint on hash (NULLs never violate UNIQUE in Postgres)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'profiles_aadhaar_hash_unique'
  ) THEN
    ALTER TABLE public.profiles
      ADD CONSTRAINT profiles_aadhaar_hash_unique UNIQUE (aadhaar_hash);
  END IF;
END;
$$;

-- Update trigger to also copy aadhaar fields from auth metadata
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (
    user_id, full_name, phone,
    aadhaar_number, aadhaar_hash, aadhaar_address, aadhaar_dob, aadhaar_verified
  )
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', ''),
    COALESCE(NEW.raw_user_meta_data ->> 'phone', ''),
    NEW.raw_user_meta_data ->> 'aadhaar_number',
    NEW.raw_user_meta_data ->> 'aadhaar_hash',
    NEW.raw_user_meta_data ->> 'aadhaar_address',
    NEW.raw_user_meta_data ->> 'aadhaar_dob',
    COALESCE((NEW.raw_user_meta_data ->> 'aadhaar_verified')::boolean, false)
  )
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
