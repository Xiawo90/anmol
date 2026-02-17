
ALTER TABLE public.user_roles DROP CONSTRAINT user_roles_role_check;
ALTER TABLE public.user_roles ADD CONSTRAINT user_roles_role_check 
  CHECK (role = ANY (ARRAY['systemadmin'::text, 'admin'::text, 'teacher'::text, 'student'::text, 'parent'::text]));
