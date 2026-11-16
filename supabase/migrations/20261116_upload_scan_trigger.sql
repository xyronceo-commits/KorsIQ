-- Prevent browser clients from spoofing scan_status = 'clean' on insert.
-- New rows inserted by authenticated users always start as 'scanning'; only service_role (server)
-- can mark a file 'clean' or 'blocked'.

CREATE OR REPLACE FUNCTION public.enforce_initial_scan_status()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.role() = 'authenticated' THEN
    NEW.scan_status := 'scanning';
    NEW.scan_checked_at := NULL;
    NEW.scan_provider := NULL;
    NEW.scan_detail := NULL;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_group_materials_initial_scan ON public.group_materials;
CREATE TRIGGER trg_group_materials_initial_scan
  BEFORE INSERT ON public.group_materials
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_initial_scan_status();

DROP TRIGGER IF EXISTS trg_user_files_initial_scan ON public.user_files;
CREATE TRIGGER trg_user_files_initial_scan
  BEFORE INSERT ON public.user_files
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_initial_scan_status();
