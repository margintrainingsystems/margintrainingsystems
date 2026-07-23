
-- Recreate redeem function without user_id param (use auth.uid())
DROP FUNCTION IF EXISTS public.redeem_invitation_code(text, uuid);

CREATE OR REPLACE FUNCTION public.redeem_invitation_code(_code text)
RETURNS TABLE(out_establishment_id uuid, out_position text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _row public.invitation_codes%ROWTYPE;
  _current_count int;
  _max int;
  _uid uuid := auth.uid();
BEGIN
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'No autenticado';
  END IF;

  SELECT * INTO _row FROM public.invitation_codes WHERE code = _code FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Código de invitación inválido';
  END IF;
  IF _row.expires_at IS NOT NULL AND _row.expires_at < now() THEN
    RAISE EXCEPTION 'Código expirado';
  END IF;
  IF _row.uses >= _row.max_uses THEN
    RAISE EXCEPTION 'Código ya utilizado';
  END IF;

  SELECT max_employees INTO _max FROM public.establishments WHERE id = _row.establishment_id;
  SELECT count(*) INTO _current_count FROM public.user_roles
    WHERE establishment_id = _row.establishment_id AND role = 'employee';
  IF _current_count >= _max THEN
    RAISE EXCEPTION 'El establecimiento alcanzó el límite de empleados de su plan';
  END IF;

  UPDATE public.invitation_codes SET uses = uses + 1 WHERE id = _row.id;
  UPDATE public.profiles
     SET establishment_id = _row.establishment_id,
         position = COALESCE(_row.position_hint, public.profiles.position)
   WHERE id = _uid;
  INSERT INTO public.user_roles (user_id, role, establishment_id)
    VALUES (_uid, 'employee', _row.establishment_id)
    ON CONFLICT DO NOTHING;

  RETURN QUERY SELECT _row.establishment_id, _row.position_hint;
END;
$$;
REVOKE ALL ON FUNCTION public.redeem_invitation_code(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.redeem_invitation_code(text) TO authenticated;

-- Fix search_path warnings
CREATE OR REPLACE FUNCTION public.plan_max_employees(_plan text)
RETURNS integer LANGUAGE sql IMMUTABLE SET search_path = public AS $$
  SELECT CASE _plan
    WHEN 'basic' THEN 2
    WHEN 'pro' THEN 10
    WHEN 'business' THEN 999999
    ELSE 2
  END;
$$;
