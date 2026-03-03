
-- Create storage bucket for form assets (backgrounds, logos)
INSERT INTO storage.buckets (id, name, public) VALUES ('form-assets', 'form-assets', true)
ON CONFLICT (id) DO NOTHING;

-- Allow anyone to view form assets (public bucket)
CREATE POLICY "Form assets are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'form-assets');

-- Allow authenticated users to upload form assets to their account folder
CREATE POLICY "Authenticated users can upload form assets"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'form-assets');

-- Allow authenticated users to update their form assets
CREATE POLICY "Authenticated users can update form assets"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'form-assets');

-- Allow authenticated users to delete their form assets
CREATE POLICY "Authenticated users can delete form assets"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'form-assets');
