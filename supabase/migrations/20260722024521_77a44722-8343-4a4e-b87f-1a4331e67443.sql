-- =============================================================
-- MARGIN Training Systems — Fase 1 schema
-- =============================================================

-- Roles enum
CREATE TYPE public.app_role AS ENUM ('admin', 'owner', 'manager', 'employee');
CREATE TYPE public.lesson_type AS ENUM ('reading', 'video', 'quiz', 'flashcards', 'ordering', 'interactive');
CREATE TYPE public.reward_category AS ENUM ('internal', 'badge', 'partner_discount', 'premium_content');
CREATE TYPE public.coin_reason AS ENUM ('lesson_completed', 'module_completed', 'quiz_passed', 'daily_streak', 'game_played', 'simulator_completed', 'reward_redeemed', 'admin_adjustment', 'signup_bonus');

-- =============================================================
-- profiles
-- =============================================================
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  full_name TEXT,
  avatar_url TEXT,
  position TEXT,
  establishment_id UUID,
  margincoins INTEGER NOT NULL DEFAULT 0,
  total_xp INTEGER NOT NULL DEFAULT 0,
  level INTEGER NOT NULL DEFAULT 1,
  streak_days INTEGER NOT NULL DEFAULT 0,
  last_activity_date DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Profiles visible to authenticated" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users update own profile" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);
CREATE POLICY "Users insert own profile" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);

-- =============================================================
-- establishments
-- =============================================================
CREATE TABLE public.establishments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  type TEXT,
  city TEXT,
  owner_id UUID REFERENCES auth.users ON DELETE SET NULL,
  logo_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.establishments TO authenticated;
GRANT ALL ON public.establishments TO service_role;
ALTER TABLE public.establishments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Establishments visible to authenticated" ON public.establishments FOR SELECT TO authenticated USING (true);
CREATE POLICY "Owners manage their establishment" ON public.establishments FOR ALL TO authenticated USING (owner_id = auth.uid()) WITH CHECK (owner_id = auth.uid());

ALTER TABLE public.profiles ADD CONSTRAINT profiles_establishment_fk FOREIGN KEY (establishment_id) REFERENCES public.establishments(id) ON DELETE SET NULL;

-- =============================================================
-- user_roles (separate table, security-critical)
-- =============================================================
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  role public.app_role NOT NULL,
  establishment_id UUID REFERENCES public.establishments(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role, establishment_id)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users see own roles" ON public.user_roles FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role);
$$;

-- =============================================================
-- training_modules & lessons
-- =============================================================
CREATE TABLE public.training_modules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  category TEXT,
  target_position TEXT,
  color TEXT DEFAULT '#9F8EDD',
  icon TEXT,
  difficulty INTEGER DEFAULT 1,
  order_index INTEGER DEFAULT 0,
  xp_reward INTEGER DEFAULT 100,
  coin_reward INTEGER DEFAULT 50,
  is_published BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.training_modules TO authenticated;
GRANT ALL ON public.training_modules TO service_role;
ALTER TABLE public.training_modules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Modules public read" ON public.training_modules FOR SELECT TO authenticated USING (is_published = true);
CREATE POLICY "Admins manage modules" ON public.training_modules FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TABLE public.lessons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  module_id UUID NOT NULL REFERENCES public.training_modules(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content TEXT,
  type public.lesson_type NOT NULL DEFAULT 'reading',
  order_index INTEGER DEFAULT 0,
  xp_reward INTEGER DEFAULT 20,
  coin_reward INTEGER DEFAULT 10,
  quiz_data JSONB,
  estimated_minutes INTEGER DEFAULT 5,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.lessons TO authenticated;
GRANT ALL ON public.lessons TO service_role;
ALTER TABLE public.lessons ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Lessons public read" ON public.lessons FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins manage lessons" ON public.lessons FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- =============================================================
-- user_progress
-- =============================================================
CREATE TABLE public.user_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  lesson_id UUID NOT NULL REFERENCES public.lessons(id) ON DELETE CASCADE,
  module_id UUID NOT NULL REFERENCES public.training_modules(id) ON DELETE CASCADE,
  completed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  score INTEGER,
  UNIQUE (user_id, lesson_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_progress TO authenticated;
GRANT ALL ON public.user_progress TO service_role;
ALTER TABLE public.user_progress ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users see own progress" ON public.user_progress FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Users insert own progress" ON public.user_progress FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

-- =============================================================
-- margincoins_transactions
-- =============================================================
CREATE TABLE public.margincoins_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  amount INTEGER NOT NULL,
  reason public.coin_reason NOT NULL,
  description TEXT,
  reference_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.margincoins_transactions TO authenticated;
GRANT ALL ON public.margincoins_transactions TO service_role;
ALTER TABLE public.margincoins_transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users see own coin history" ON public.margincoins_transactions FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Users insert own coin tx" ON public.margincoins_transactions FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

-- =============================================================
-- rewards & redemptions
-- =============================================================
CREATE TABLE public.rewards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  category public.reward_category NOT NULL,
  cost_coins INTEGER NOT NULL,
  image_url TEXT,
  establishment_id UUID REFERENCES public.establishments(id) ON DELETE CASCADE,
  stock INTEGER,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.rewards TO authenticated;
GRANT ALL ON public.rewards TO service_role;
ALTER TABLE public.rewards ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Rewards visible when active" ON public.rewards FOR SELECT TO authenticated USING (is_active = true);
CREATE POLICY "Admins manage rewards" ON public.rewards FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TABLE public.reward_redemptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  reward_id UUID NOT NULL REFERENCES public.rewards(id) ON DELETE CASCADE,
  cost_coins INTEGER NOT NULL,
  status TEXT DEFAULT 'pending',
  redeemed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.reward_redemptions TO authenticated;
GRANT ALL ON public.reward_redemptions TO service_role;
ALTER TABLE public.reward_redemptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users see own redemptions" ON public.reward_redemptions FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Users insert own redemption" ON public.reward_redemptions FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

-- =============================================================
-- badges
-- =============================================================
CREATE TABLE public.badges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  description TEXT,
  icon TEXT,
  color TEXT DEFAULT '#FFD140',
  criteria JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.badges TO authenticated;
GRANT ALL ON public.badges TO service_role;
ALTER TABLE public.badges ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Badges public" ON public.badges FOR SELECT TO authenticated USING (true);

CREATE TABLE public.user_badges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  badge_id UUID NOT NULL REFERENCES public.badges(id) ON DELETE CASCADE,
  earned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, badge_id)
);
GRANT SELECT, INSERT ON public.user_badges TO authenticated;
GRANT ALL ON public.user_badges TO service_role;
ALTER TABLE public.user_badges ENABLE ROW LEVEL SECURITY;
CREATE POLICY "User badges visible" ON public.user_badges FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users insert own badges" ON public.user_badges FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

-- =============================================================
-- Auto-create profile on signup
-- =============================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, avatar_url)
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    new.raw_user_meta_data->>'avatar_url'
  );
  -- signup bonus 100 margincoins
  INSERT INTO public.margincoins_transactions (user_id, amount, reason, description)
  VALUES (new.id, 100, 'signup_bonus', 'Bono de bienvenida a MARGIN');
  UPDATE public.profiles SET margincoins = 100 WHERE id = new.id;
  RETURN new;
END;
$$;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- updated_at trigger
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =============================================================
-- Seed content (módulos, lecciones, recompensas, insignias)
-- =============================================================
INSERT INTO public.training_modules (id, title, description, category, target_position, color, icon, difficulty, order_index, xp_reward, coin_reward) VALUES
('11111111-1111-1111-1111-111111111101', 'Servicio al Cliente Excepcional', 'Aprendé a crear experiencias memorables para cada cliente que entra a tu local.', 'Servicio', 'Mozo', '#9F8EDD', 'Smile', 1, 1, 300, 150),
('11111111-1111-1111-1111-111111111102', 'Higiene y Seguridad Alimentaria', 'Fundamentos de manipulación segura de alimentos y normas HACCP.', 'Cocina', 'Cocinero', '#5EB87E', 'Shield', 2, 2, 400, 200),
('11111111-1111-1111-1111-111111111103', 'Coctelería Básica', 'Técnicas fundamentales, herramientas y las 20 recetas que todo bartender debe saber.', 'Barra', 'Bartender', '#D946EF', 'Wine', 2, 3, 500, 250),
('11111111-1111-1111-1111-111111111104', 'Manejo de Quejas y Reclamos', 'Convertí una queja en una oportunidad de fidelización.', 'Servicio', 'Mozo', '#FFD140', 'MessageSquareWarning', 2, 4, 350, 175),
('11111111-1111-1111-1111-111111111105', 'Ventas y Upselling', 'Técnicas éticas para aumentar el ticket promedio.', 'Ventas', 'Mozo', '#009EE3', 'TrendingUp', 3, 5, 400, 200);

INSERT INTO public.lessons (module_id, title, content, type, order_index, xp_reward, coin_reward, estimated_minutes) VALUES
('11111111-1111-1111-1111-111111111101', 'La primera impresión', 'Los primeros 30 segundos definen la experiencia del cliente. Aprendé a saludar, hacer contacto visual y proyectar hospitalidad genuina desde el saludo inicial.', 'reading', 1, 20, 10, 4),
('11111111-1111-1111-1111-111111111101', 'Lectura de mesa', 'Cómo interpretar el lenguaje corporal y las necesidades no verbalizadas de tus clientes.', 'reading', 2, 20, 10, 5),
('11111111-1111-1111-1111-111111111101', 'Quiz: Fundamentos del servicio', '', 'quiz', 3, 40, 20, 5),
('11111111-1111-1111-1111-111111111102', 'La cadena de frío', 'Rangos de temperatura seguros, zonas de peligro y buenas prácticas de refrigeración.', 'reading', 1, 20, 10, 6),
('11111111-1111-1111-1111-111111111102', 'Contaminación cruzada', 'Los 5 errores más comunes y cómo evitarlos en tu estación de trabajo.', 'reading', 2, 25, 12, 5),
('11111111-1111-1111-1111-111111111103', 'Herramientas del bartender', 'Coctelera, jigger, mixing glass, colador. Para qué sirve cada una.', 'reading', 1, 20, 10, 4),
('11111111-1111-1111-1111-111111111103', 'Los 5 clásicos', 'Negroni, Old Fashioned, Manhattan, Martini y Daiquiri. Recetas y proporciones.', 'reading', 2, 30, 15, 8),
('11111111-1111-1111-1111-111111111104', 'Escuchar antes de responder', 'La técnica LAST: Listen, Apologize, Solve, Thank.', 'reading', 1, 25, 12, 5),
('11111111-1111-1111-1111-111111111105', 'Upselling ético', 'Cómo sugerir sin ser invasivo. Diferencia entre vender más y vender mejor.', 'reading', 1, 25, 12, 5);

UPDATE public.lessons SET quiz_data = '{"questions":[
{"q":"¿Cuánto duran los primeros segundos que definen la impresión del cliente?","options":["3 segundos","30 segundos","3 minutos","10 minutos"],"correct":1},
{"q":"¿Qué actitud transmite mejor hospitalidad?","options":["Sonrisa forzada","Contacto visual y saludo genuino","Ignorar hasta que pidan","Formalidad excesiva"],"correct":1},
{"q":"¿Cuál NO es parte del servicio excepcional?","options":["Escucha activa","Anticiparse a necesidades","Discutir con el cliente","Personalizar el trato"],"correct":2}
]}'::jsonb
WHERE title = 'Quiz: Fundamentos del servicio';

INSERT INTO public.rewards (title, description, category, cost_coins, image_url) VALUES
('Día libre a elección', 'Canjeá un día libre coordinado con tu manager.', 'internal', 2000, NULL),
('Cambio de turno prioritario', 'Tenés prioridad en el próximo cambio de turno que solicites.', 'internal', 500, NULL),
('Elegir menú del staff', 'Elegís vos el menú del staff de la semana.', 'internal', 300, NULL),
('Insignia: Rookie del Mes', 'Insignia especial visible en tu perfil por 30 días.', 'badge', 400, NULL),
('20% off en Escuela Gato Dumas', 'Descuento en cursos de formación gastronómica.', 'partner_discount', 1500, NULL),
('Masterclass con chef invitado', 'Acceso a una masterclass exclusiva del mes.', 'premium_content', 1200, NULL);

INSERT INTO public.badges (code, title, description, icon, color, criteria) VALUES
('first_lesson', 'Primera Lección', 'Completaste tu primera lección en MARGIN.', 'Sparkles', '#FFD140', '{"lessons_completed":1}'::jsonb),
('week_streak', 'Racha de 7 días', 'Te capacitaste 7 días seguidos.', 'Flame', '#D946EF', '{"streak_days":7}'::jsonb),
('module_master', 'Módulo Completado', 'Terminaste tu primer módulo entero.', 'Trophy', '#5EB87E', '{"modules_completed":1}'::jsonb),
('coin_collector', 'Coleccionista', 'Acumulaste 1000 margincoins.', 'Coins', '#9F8EDD', '{"total_coins":1000}'::jsonb),
('perfect_quiz', 'Quiz Perfecto', 'Sacaste 100% en un quiz.', 'Star', '#009EE3', '{"perfect_quiz":1}'::jsonb);