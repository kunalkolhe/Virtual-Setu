-- Add photo and blood group fields to profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS photo_url   TEXT,
  ADD COLUMN IF NOT EXISTS blood_group TEXT;

-- Update trigger to also copy these fields from auth metadata on new signups
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (
    user_id, full_name, phone,
    aadhaar_number, aadhaar_hash, aadhaar_address, aadhaar_dob, aadhaar_verified,
    photo_url, blood_group
  )
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', ''),
    COALESCE(NEW.raw_user_meta_data ->> 'phone', ''),
    NEW.raw_user_meta_data ->> 'aadhaar_number',
    NEW.raw_user_meta_data ->> 'aadhaar_hash',
    NEW.raw_user_meta_data ->> 'aadhaar_address',
    NEW.raw_user_meta_data ->> 'aadhaar_dob',
    COALESCE((NEW.raw_user_meta_data ->> 'aadhaar_verified')::boolean, false),
    NEW.raw_user_meta_data ->> 'photo_url',
    NEW.raw_user_meta_data ->> 'blood_group'
  )
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
