
-- Fix team_members: replace ALL policy with explicit per-operation policies
DROP POLICY IF EXISTS "Admins can manage team members" ON public.team_members;

CREATE POLICY "Admins can insert team members"
ON public.team_members FOR INSERT
TO authenticated
WITH CHECK (has_role(auth.uid(), 'admin'::app_role) AND account_id = get_user_account_id());

CREATE POLICY "Admins can update team members"
ON public.team_members FOR UPDATE
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role) AND account_id = get_user_account_id());

CREATE POLICY "Admins can delete team members"
ON public.team_members FOR DELETE
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role) AND account_id = get_user_account_id());

-- Add missing accounts SELECT policy for regular users
CREATE POLICY "Users can view their own account"
ON public.accounts FOR SELECT
TO authenticated
USING (id = get_user_account_id());

-- Allow public/anonymous to update forms views_count only
CREATE POLICY "Anyone can increment form views"
ON public.forms FOR UPDATE
TO anon, authenticated
USING (active = true)
WITH CHECK (active = true);
