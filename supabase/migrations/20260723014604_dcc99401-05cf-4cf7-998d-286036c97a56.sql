
ALTER TABLE public.establishments
  ADD COLUMN IF NOT EXISTS plan text NOT NULL DEFAULT 'basic' CHECK (plan IN ('basic','pro','business')),
  ADD COLUMN IF NOT EXISTS subscription_status text NOT NULL DEFAULT 'active' CHECK (subscription_status IN ('active','trialing','past_due','cancelled')),
  ADD COLUMN IF NOT EXISTS subscription_expires_at timestamptz,
  ADD COLUMN IF NOT EXISTS mp_subscription_id text,
  ADD COLUMN IF NOT EXISTS mp_preapproval_id text,
  ADD COLUMN IF NOT EXISTS max_employees integer NOT NULL DEFAULT 2;

DROP POLICY IF EXISTS "Owners insert own establishment" ON public.establishments;
CREATE POLICY "Owners insert own establishment" ON public.establishments
  FOR INSERT TO authenticated WITH CHECK (owner_id = auth.uid());

CREATE TABLE IF NOT EXISTS public.invitation_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  establishment_id uuid NOT NULL REFERENCES public.establishments(id) ON DELETE CASCADE,
  created_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  position_hint text,
  max_uses integer NOT NULL DEFAULT 1,
  uses integer NOT NULL DEFAULT 0,
  expires_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.invitation_codes TO authenticated;
GRANT ALL ON public.invitation_codes TO service_role;
ALTER TABLE public.invitation_codes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owner manages own codes" ON public.invitation_codes
  FOR ALL TO authenticated
  USING (created_by = auth.uid() OR EXISTS (
    SELECT 1 FROM public.establishments e
    WHERE e.id = invitation_codes.establishment_id AND e.owner_id = auth.uid()
  ))
  WITH CHECK (created_by = auth.uid() OR EXISTS (
    SELECT 1 FROM public.establishments e
    WHERE e.id = invitation_codes.establishment_id AND e.owner_id = auth.uid()
  ));

CREATE INDEX IF NOT EXISTS idx_invitation_codes_code ON public.invitation_codes(code);
CREATE INDEX IF NOT EXISTS idx_invitation_codes_establishment ON public.invitation_codes(establishment_id);

CREATE OR REPLACE FUNCTION public.redeem_invitation_code(_code text, _user_id uuid)
RETURNS TABLE(out_establishment_id uuid, out_position text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _row public.invitation_codes%ROWTYPE;
  _current_count int;
  _max int;
BEGIN
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
   WHERE id = _user_id;
  INSERT INTO public.user_roles (user_id, role, establishment_id)
    VALUES (_user_id, 'employee', _row.establishment_id)
    ON CONFLICT DO NOTHING;

  RETURN QUERY SELECT _row.establishment_id, _row.position_hint;
END;
$$;
REVOKE ALL ON FUNCTION public.redeem_invitation_code(text, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.redeem_invitation_code(text, uuid) TO authenticated;

DROP POLICY IF EXISTS "Owner sees establishment members" ON public.profiles;
CREATE POLICY "Owner sees establishment members" ON public.profiles
  FOR SELECT TO authenticated
  USING (
    establishment_id IN (SELECT id FROM public.establishments WHERE owner_id = auth.uid())
  );

DROP POLICY IF EXISTS "Owner sees establishment roles" ON public.user_roles;
CREATE POLICY "Owner sees establishment roles" ON public.user_roles
  FOR SELECT TO authenticated
  USING (
    establishment_id IN (SELECT id FROM public.establishments WHERE owner_id = auth.uid())
  );

DROP POLICY IF EXISTS "Owner deletes establishment roles" ON public.user_roles;
CREATE POLICY "Owner deletes establishment roles" ON public.user_roles
  FOR DELETE TO authenticated
  USING (
    establishment_id IN (SELECT id FROM public.establishments WHERE owner_id = auth.uid())
  );

CREATE TABLE IF NOT EXISTS public.payment_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  establishment_id uuid REFERENCES public.establishments(id) ON DELETE SET NULL,
  provider text NOT NULL DEFAULT 'mercadopago',
  event_type text NOT NULL,
  external_id text,
  payload jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.payment_events TO authenticated;
GRANT ALL ON public.payment_events TO service_role;
ALTER TABLE public.payment_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owner reads own payment events" ON public.payment_events
  FOR SELECT TO authenticated
  USING (
    establishment_id IN (SELECT id FROM public.establishments WHERE owner_id = auth.uid())
  );

CREATE OR REPLACE FUNCTION public.plan_max_employees(_plan text)
RETURNS integer LANGUAGE sql IMMUTABLE AS $$
  SELECT CASE _plan
    WHEN 'basic' THEN 2
    WHEN 'pro' THEN 10
    WHEN 'business' THEN 999999
    ELSE 2
  END;
$$;

CREATE OR REPLACE FUNCTION public.sync_max_employees()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  NEW.max_employees := public.plan_max_employees(NEW.plan);
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS establishments_sync_max_employees ON public.establishments;
CREATE TRIGGER establishments_sync_max_employees
  BEFORE INSERT OR UPDATE OF plan ON public.establishments
  FOR EACH ROW EXECUTE FUNCTION public.sync_max_employees();
