-- Allow anonymous users to update form responses they created (for final data update after early save)
CREATE POLICY "Anyone can update form responses"
ON public.form_responses
FOR UPDATE
USING (true)
WITH CHECK (true);