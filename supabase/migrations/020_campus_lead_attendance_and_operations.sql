-- ============================================================================
-- Migration: 020_campus_lead_attendance_and_operations.sql
-- Description: Grants attendance.verify and full chapter operational permissions
--              to campus_lead in public.role_permissions.
-- ============================================================================

-- Grant attendance.verify and chapter operations permissions to campus_lead
INSERT INTO public.role_permissions (role_id, permission_id, allowed)
SELECT r.id, p.id, true
FROM public.roles r
CROSS JOIN public.permissions p
WHERE r.key = 'campus_lead'
  AND p.key IN (
    'attendance.verify',
    'registration.approve',
    'registration.review',
    'event.create',
    'event.manage',
    'class.manage',
    'student.register',
    'certificate.issue',
    'report.submit',
    'report.download',
    'task.manage',
    'announcement.publish',
    'resource.upload',
    'analytics.view'
  )
ON CONFLICT (role_id, permission_id) DO UPDATE SET allowed = true;
