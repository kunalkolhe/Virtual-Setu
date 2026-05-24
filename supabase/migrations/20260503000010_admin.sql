-- is_admin flag on profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_admin BOOLEAN NOT NULL DEFAULT false;

-- Admin helper function (SECURITY DEFINER bypasses RLS)
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
  SELECT COALESCE(
    (SELECT is_admin FROM public.profiles WHERE user_id = auth.uid() LIMIT 1),
    false
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public;

-- Admin can view ALL profiles
CREATE POLICY "Admins can view all profiles"
ON public.profiles FOR SELECT TO authenticated
USING (public.is_admin());

-- Admin can update ALL profiles (plan changes etc.)
CREATE POLICY "Admins can update all profiles"
ON public.profiles FOR UPDATE TO authenticated
USING (public.is_admin());

-- Admin can view ALL documents
CREATE POLICY "Admins can view all documents"
ON public.documents FOR SELECT TO authenticated
USING (public.is_admin());

-- Admin can update ALL documents (verification)
CREATE POLICY "Admins can update all documents"
ON public.documents FOR UPDATE TO authenticated
USING (public.is_admin());

-- Admin can view ALL subscriptions
CREATE POLICY "Admins can view all subscriptions"
ON public.subscriptions FOR SELECT TO authenticated
USING (public.is_admin());

-- ── Card Orders table ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.card_orders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  address TEXT NOT NULL,
  phone TEXT,
  plan TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'processing', 'dispatched', 'delivered', 'cancelled')),
  tracking_number TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.card_orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own card orders"
ON public.card_orders FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own card orders"
ON public.card_orders FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all card orders"
ON public.card_orders FOR SELECT TO authenticated
USING (public.is_admin());

CREATE POLICY "Admins can update all card orders"
ON public.card_orders FOR UPDATE TO authenticated
USING (public.is_admin());

CREATE TRIGGER update_card_orders_updated_at
BEFORE UPDATE ON public.card_orders
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ── Notifications table ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'info'
    CHECK (type IN ('info', 'success', 'warning', 'delivery')),
  read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Citizens can read their own + broadcast (user_id IS NULL)
CREATE POLICY "Users can view their own notifications"
ON public.notifications FOR SELECT
USING (auth.uid() = user_id OR user_id IS NULL);

-- Citizens can mark their own notifications as read
CREATE POLICY "Users can update their own notifications"
ON public.notifications FOR UPDATE
USING (auth.uid() = user_id OR user_id IS NULL);

-- Only admins can create notifications
CREATE POLICY "Admins can insert notifications"
ON public.notifications FOR INSERT TO authenticated
WITH CHECK (public.is_admin());

-- Admins can view all notifications
CREATE POLICY "Admins can view all notifications"
ON public.notifications FOR SELECT TO authenticated
USING (public.is_admin());
