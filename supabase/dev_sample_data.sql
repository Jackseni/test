-- =====================================================================
-- FinTrack - DATOS DE EJEMPLO (SOLO DESARROLLO / PRUEBAS)
-- Ejecutar en Supabase > SQL Editor. NO ejecutar en produccion real.
--
-- 1) Cambia el correo de la linea "v_email" por el de TU usuario.
-- 2) Pulsa Run.
--
-- Inserta ~40 transacciones de los ultimos 6 meses y 4 presupuestos del mes
-- actual para el usuario indicado. Todas las descripciones empiezan con
-- "(demo) " para poder borrarlas (ver el final del archivo).
-- Es seguro ejecutarlo mas de una vez: si ya hay datos demo, no hace nada.
-- =====================================================================
do $$
declare
  v_email text := 'TU_CORREO@ejemplo.com';   -- <<< CAMBIA ESTO
  v_user  uuid;
begin
  select id into v_user from auth.users where lower(email) = lower(v_email);
  if v_user is null then
    raise exception 'No existe un usuario con el correo %. Revisa v_email.', v_email;
  end if;

  if not exists (select 1 from public.categories where user_id = v_user) then
    raise exception 'Ese usuario no tiene categorias (se registro antes de aplicar las migraciones). Borralo en Authentication > Users y registrate de nuevo.';
  end if;

  if exists (select 1 from public.transactions
             where user_id = v_user and description like '(demo)%') then
    raise notice 'Ya existen datos demo para este usuario. No se inserta nada.';
    return;
  end if;

  -- s.mo = meses hacia atras (0 = mes actual); s.d = dia del mes.
  -- La fecha nunca pasa de hoy.
  insert into public.transactions (user_id, category_id, type, amount, description, transaction_date)
  select v_user, c.id, c.type, s.amount, '(demo) ' || s.descr,
         least((date_trunc('month', current_date) - make_interval(months => s.mo))::date + (s.d - 1),
               current_date)
  from (values
    -- Ingresos
    ('Salario',        'Salario mensual',          25000.00, 0, 1),
    ('Salario',        'Salario mensual',          25000.00, 1, 1),
    ('Salario',        'Salario mensual',          25000.00, 2, 1),
    ('Salario',        'Salario mensual',          25000.00, 3, 1),
    ('Salario',        'Salario mensual',          25000.00, 4, 1),
    ('Salario',        'Salario mensual',          24000.00, 5, 1),
    ('Freelance',      'Proyecto de diseno web',    4500.00, 0, 10),
    ('Freelance',      'Soporte tecnico',           3800.00, 2, 12),
    ('Freelance',      'Landing page cliente',      5200.00, 4, 8),
    ('Inversiones',    'Intereses cuenta ahorro',   1200.00, 1, 15),
    ('Inversiones',    'Dividendos',                 900.00, 3, 15),
    ('Otros ingresos', 'Venta de articulos usados', 1500.00, 2, 20),
    -- Gastos
    ('Vivienda',       'Alquiler',                  6000.00, 0, 3),
    ('Vivienda',       'Alquiler',                  6000.00, 1, 3),
    ('Vivienda',       'Alquiler',                  6000.00, 2, 3),
    ('Vivienda',       'Alquiler',                  6000.00, 3, 3),
    ('Vivienda',       'Alquiler',                  6000.00, 4, 3),
    ('Vivienda',       'Alquiler',                  6000.00, 5, 3),
    ('Alimentaci%',    'Supermercado',              1850.00, 0, 5),
    ('Alimentaci%',    'Restaurante',                620.50, 0, 12),
    ('Alimentaci%',    'Supermercado',              2100.00, 1, 6),
    ('Alimentaci%',    'Supermercado',              1950.75, 2, 6),
    ('Alimentaci%',    'Restaurante',                780.00, 3, 14),
    ('Alimentaci%',    'Supermercado',              2300.00, 4, 5),
    ('Alimentaci%',    'Supermercado',              1700.00, 5, 7),
    ('Transporte',     'Combustible',                950.00, 0, 7),
    ('Transporte',     'Taxi / aplicacion',          310.25, 0, 16),
    ('Transporte',     'Combustible',               1100.00, 1, 8),
    ('Transporte',     'Combustible',                900.00, 3, 9),
    ('Transporte',     'Mantenimiento vehiculo',    1800.00, 4, 18),
    ('Servicios',      'Electricidad',               840.00, 0, 9),
    ('Servicios',      'Internet y telefono',        699.00, 0, 11),
    ('Servicios',      'Electricidad',               910.00, 1, 9),
    ('Servicios',      'Internet y telefono',        699.00, 1, 11),
    ('Servicios',      'Electricidad',               780.00, 2, 9),
    ('Servicios',      'Agua',                       260.00, 3, 10),
    ('Salud',          'Consulta medica',            900.00, 1, 20),
    ('Salud',          'Farmacia',                   430.00, 3, 22),
    ('Educacion',      'Curso en linea',            1200.00, 2, 25),
    ('Educacion',      'Libros',                     540.00, 4, 14),
    ('Ocio',           'Cine y cena',                480.00, 0, 14),
    ('Ocio',           'Suscripciones streaming',    320.00, 0, 4),
    ('Ocio',           'Salida con amigos',          650.00, 2, 21),
    ('Ocio',           'Viaje de fin de semana',    2400.00, 3, 26),
    ('Otros gastos',   'Regalo de cumpleanos',       700.00, 1, 24)
  ) as s(cat, descr, amount, mo, d)
  join public.categories c
    on c.user_id = v_user and c.name ilike s.cat;

  -- Presupuestos del mes actual (solo categorias de gasto).
  insert into public.budgets (user_id, category_id, amount, month, year)
  select v_user, c.id, b.amt,
         extract(month from current_date)::int, extract(year from current_date)::int
  from (values
    ('Alimentaci%', 3500.00),   -- consumo moderado
    ('Transporte',  1200.00),   -- cerca/pasado del limite (aviso)
    ('Ocio',         800.00),   -- pasado del limite (excedido)
    ('Servicios',   2500.00)
  ) as b(cat, amt)
  join public.categories c
    on c.user_id = v_user and c.type = 'EXPENSE' and c.name ilike b.cat
  on conflict do nothing;

  raise notice 'Datos demo insertados para %.', v_email;
end $$;

-- ---------------------------------------------------------------------
-- BORRAR LOS DATOS DEMO (ejecutar aparte, si lo necesitas):
--   delete from public.transactions where description like '(demo)%';
-- Los 4 presupuestos del mes actual se borran desde la app (Presupuestos)
-- o con:
--   delete from public.budgets
--   where user_id = (select id from auth.users where lower(email) = lower('TU_CORREO@ejemplo.com'));
-- ---------------------------------------------------------------------
