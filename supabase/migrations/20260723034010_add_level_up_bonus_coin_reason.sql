-- Agrega el motivo "level_up_bonus" al enum coin_reason.
-- Necesario para registrar el bono de margincoins que se otorga al subir de nivel,
-- separado del bono normal por completar una lección ("lesson_completed").
ALTER TYPE public.coin_reason ADD VALUE IF NOT EXISTS 'level_up_bonus';
