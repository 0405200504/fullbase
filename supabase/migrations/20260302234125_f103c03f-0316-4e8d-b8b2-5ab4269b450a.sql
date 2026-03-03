
-- Remove overly permissive forms UPDATE policy
DROP POLICY IF EXISTS "Anyone can increment form views" ON public.forms;

-- Create a secure function to increment views
CREATE OR REPLACE FUNCTION public.increment_form_views(form_slug text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE forms SET views_count = views_count + 1 WHERE slug = form_slug AND active = true;
END;
$$;
