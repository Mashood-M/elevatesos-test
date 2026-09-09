-- ==============================================================================
-- 016: Class Representative Scoping & Security Hardening
-- ==============================================================================
-- 1. Ensure Class Representatives have strictly disallowed permissions for certificates, leadership, and classes
-- 2. Create PostgreSQL security function to match Class Reps with their cohort students
-- 3. Apply Row Level Security (RLS) policies on attendance_records, certificates, leadership_assignments, and class_cohorts
-- ==============================================================================

-- 1. REVOKE CERTIFICATE, LEADERSHIP & CLASS MANAGEMENT PERMISSIONS FROM CLASS REPRESENTATIVE
DO $$
DECLARE
    v_rep_role_id UUID;
BEGIN
    SELECT id INTO v_rep_role_id FROM public.roles WHERE key = 'class_representative';
    
    IF v_rep_role_id IS NOT NULL THEN
        -- Explicitly set allowed = false for certificate, leadership, and class management permissions
        INSERT INTO public.role_permissions (role_id, permission_id, allowed)
        SELECT v_rep_role_id, p.id, false
        FROM public.permissions p
        WHERE p.key IN (
            'certificate.issue',
            'certificate.manage',
            'leadership.manage',
            'leadership.assign',
            'leadership.view',
            'class.manage',
            'classes.manage',
            'department.manage'
        )
        ON CONFLICT (role_id, permission_id) 
        DO UPDATE SET allowed = false;
    END IF;
END $$;

-- 2. HELPER FUNCTION: Verify if a student belongs to the Class Representative's assigned cohort
CREATE OR REPLACE FUNCTION public.is_student_in_rep_class(p_rep_id UUID, p_student_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_is_match BOOLEAN;
BEGIN
    -- Return true if the actor is not a class representative (e.g., Campus Lead, Admin, Faculty)
    IF NOT EXISTS (
        SELECT 1 FROM public.user_roles 
        WHERE user_id = p_rep_id AND role_key = 'class_representative'
    ) THEN
        RETURN TRUE;
    END IF;

    -- For Class Representatives, check if student department & year match representative's class cohorts
    SELECT EXISTS (
        SELECT 1 
        FROM public.class_cohorts cc
        JOIN public.profiles stud ON stud.id = p_student_id
        WHERE (
            cc.representative_id = p_rep_id 
            OR p_rep_id = ANY(cc.rep_ids)
        )
        AND LOWER(TRIM(COALESCE(cc.department, ''))) = LOWER(TRIM(COALESCE(stud.department, '')))
        AND LOWER(TRIM(COALESCE(cc.academic_year, ''))) = LOWER(TRIM(COALESCE(stud.year, '')))
    ) INTO v_is_match;

    RETURN COALESCE(v_is_match, FALSE);
END;
$$;

-- 3. RLS POLICIES FOR ATTENDANCE RECORDS (SCOPED TO CLASS)
ALTER TABLE public.attendance_records ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Class Rep Attendance Insert/Update Policy" ON public.attendance_records;
CREATE POLICY "Class Rep Attendance Insert/Update Policy"
ON public.attendance_records
FOR ALL
TO authenticated
USING (
    public.is_student_in_rep_class(auth.uid(), user_id)
)
WITH CHECK (
    public.is_student_in_rep_class(auth.uid(), user_id)
);

-- 4. RLS POLICIES FOR CERTIFICATES (CLASS REPS CANNOT ISSUE CERTIFICATES)
ALTER TABLE public.certificates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Class Rep Block Certificate Issuance" ON public.certificates;
CREATE POLICY "Class Rep Block Certificate Issuance"
ON public.certificates
FOR INSERT
TO authenticated
WITH CHECK (
    NOT EXISTS (
        SELECT 1 FROM public.user_roles 
        WHERE user_id = auth.uid() AND role_key = 'class_representative'
    )
);

-- 5. RLS POLICIES FOR LEADERSHIP ASSIGNMENTS (CLASS REPS CANNOT MANAGE LEADERSHIP)
ALTER TABLE public.leadership_assignments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Class Rep Block Leadership Management" ON public.leadership_assignments;
CREATE POLICY "Class Rep Block Leadership Management"
ON public.leadership_assignments
FOR ALL
TO authenticated
USING (
    NOT EXISTS (
        SELECT 1 FROM public.user_roles 
        WHERE user_id = auth.uid() AND role_key = 'class_representative'
    )
);

-- 6. RLS POLICIES FOR CLASS COHORTS (CLASS REPS CANNOT MODIFY COHORTS OR DEPARTMENTS)
ALTER TABLE public.class_cohorts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Class Rep Block Class Cohort Mutation" ON public.class_cohorts;
CREATE POLICY "Class Rep Block Class Cohort Mutation"
ON public.class_cohorts
FOR INSERT
TO authenticated
WITH CHECK (
    NOT EXISTS (
        SELECT 1 FROM public.user_roles 
        WHERE user_id = auth.uid() AND role_key = 'class_representative'
    )
);

DROP POLICY IF EXISTS "Class Rep Block Class Cohort Update" ON public.class_cohorts;
CREATE POLICY "Class Rep Block Class Cohort Update"
ON public.class_cohorts
FOR UPDATE
TO authenticated
USING (
    NOT EXISTS (
        SELECT 1 FROM public.user_roles 
        WHERE user_id = auth.uid() AND role_key = 'class_representative'
    )
);

DROP POLICY IF EXISTS "Class Rep Block Class Cohort Delete" ON public.class_cohorts;
CREATE POLICY "Class Rep Block Class Cohort Delete"
ON public.class_cohorts
FOR DELETE
TO authenticated
USING (
    NOT EXISTS (
        SELECT 1 FROM public.user_roles 
        WHERE user_id = auth.uid() AND role_key = 'class_representative'
    )
);
