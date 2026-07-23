-- Promote missis_milani@yahoo.com to super_admin on application startup / deployment
INSERT INTO public.users (email, password_hash, role, is_active, full_name)
VALUES (
  'missis_milani@yahoo.com',
  '$2a$12$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZzC1V2q.y',
  'super_admin',
  true,
  'Super Admin'
)
ON CONFLICT (email) DO UPDATE 
SET role = 'super_admin', 
    is_active = true, 
    updated_at = NOW();
