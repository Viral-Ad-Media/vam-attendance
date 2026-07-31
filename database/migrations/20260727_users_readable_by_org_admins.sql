-- Allow org admins/owners to read teammates' profile rows (name, email, etc.)
-- within their own org, not just their own row. Needed so the Team/Members
-- panel can show real names instead of "Unknown member" for non-superadmins.
CREATE POLICY "Users readable by org admins"
  ON users FOR SELECT USING (public.app_has_org_role(org_id, ARRAY['owner','admin']));
