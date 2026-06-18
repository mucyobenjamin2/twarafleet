-- ============================================================================
-- TWARAFLEET DATABASE SCHEMA (v1.0)
-- Run this in the Supabase SQL editor (Project > SQL Editor > New query)
-- ============================================================================

create extension if not exists "uuid-ossp";

-- ----------------------------------------------------------------------------
-- ENUM TYPES
-- ----------------------------------------------------------------------------
create type motorcycle_status as enum ('active','garage','maintenance','sold');
create type driver_status as enum ('active','inactive');
create type versement_status as enum ('paid','unpaid','partial');
create type debt_status as enum ('active','paid','waived');
create type expense_category as enum ('fuel','repair','maintenance','insurance','tax','fine','service','parking','spare_parts','other');
create type non_working_reason as enum ('garage','accident','driver_sick','public_holiday','personal_leave','other');
create type savings_status as enum ('active','completed','cancelled');
create type reminder_type as enum ('insurance','tax','inspection','contravention','maintenance','custom');
create type reminder_status as enum ('pending','completed','overdue');
create type tax_status as enum ('paid','pending','overdue');
create type document_type as enum ('insurance','tax','inspection','registration','ownership','other');
create type notification_type as enum ('reminder','debt','collection','saving_goal','system');

-- ----------------------------------------------------------------------------
-- TABLE: users  (system owners/admins, mirrors auth.users)
-- ----------------------------------------------------------------------------
create table users (
  id uuid primary key default uuid_generate_v4(),
  auth_user_id uuid unique references auth.users(id) on delete cascade,
  full_name varchar not null,
  email varchar unique not null,
  phone_number varchar,
  profile_image text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- TABLE: motorcycles
-- ----------------------------------------------------------------------------
create table motorcycles (
  id uuid primary key default uuid_generate_v4(),
  owner_id uuid references users(id) on delete set null,
  plate_number varchar unique not null,
  brand varchar,
  model varchar,
  engine_number varchar,
  chassis_number varchar,
  motorcycle_phone varchar,
  purchase_price decimal(12,2),
  purchase_date date,
  daily_target decimal(12,2) not null default 6000,
  status motorcycle_status not null default 'active',
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- TABLE: drivers
-- ----------------------------------------------------------------------------
create table drivers (
  id uuid primary key default uuid_generate_v4(),
  full_name varchar not null,
  national_id varchar,
  phone_number varchar,
  address text,
  emergency_contact varchar,
  photo_url text,
  status driver_status not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- TABLE: driver_assignments
-- ----------------------------------------------------------------------------
create table driver_assignments (
  id uuid primary key default uuid_generate_v4(),
  motorcycle_id uuid not null references motorcycles(id) on delete cascade,
  driver_id uuid not null references drivers(id) on delete cascade,
  assigned_date date not null default current_date,
  end_date date,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- only one active assignment per motorcycle at a time
create unique index one_active_assignment_per_motorcycle
  on driver_assignments (motorcycle_id) where (is_active);

-- ----------------------------------------------------------------------------
-- TABLE: versements (daily collections)
-- ----------------------------------------------------------------------------
create table versements (
  id uuid primary key default uuid_generate_v4(),
  motorcycle_id uuid not null references motorcycles(id) on delete cascade,
  driver_id uuid references drivers(id) on delete set null,
  collection_date date not null default current_date,
  amount decimal(12,2) not null default 0,
  payment_method varchar,
  reference_number varchar,
  screenshot_url text,
  notes text,
  status versement_status not null default 'paid',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (motorcycle_id, collection_date)
);

-- ----------------------------------------------------------------------------
-- TABLE: debts (missed/short collections)
-- ----------------------------------------------------------------------------
create table debts (
  id uuid primary key default uuid_generate_v4(),
  motorcycle_id uuid not null references motorcycles(id) on delete cascade,
  driver_id uuid references drivers(id) on delete set null,
  debt_date date not null,
  original_amount decimal(12,2) not null,
  remaining_amount decimal(12,2) not null,
  status debt_status not null default 'active',
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (motorcycle_id, debt_date)
);

-- ----------------------------------------------------------------------------
-- TABLE: debt_payments
-- ----------------------------------------------------------------------------
create table debt_payments (
  id uuid primary key default uuid_generate_v4(),
  debt_id uuid not null references debts(id) on delete cascade,
  payment_date date not null default current_date,
  amount_paid decimal(12,2) not null,
  reference_number varchar,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- TABLE: expenses
-- ----------------------------------------------------------------------------
create table expenses (
  id uuid primary key default uuid_generate_v4(),
  motorcycle_id uuid not null references motorcycles(id) on delete cascade,
  category expense_category not null default 'other',
  expense_date date not null default current_date,
  amount decimal(12,2) not null,
  description text,
  receipt_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- TABLE: non_working_days
-- ----------------------------------------------------------------------------
create table non_working_days (
  id uuid primary key default uuid_generate_v4(),
  motorcycle_id uuid not null references motorcycles(id) on delete cascade,
  date date not null,
  reason non_working_reason not null default 'other',
  description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (motorcycle_id, date)
);

-- ----------------------------------------------------------------------------
-- TABLE: savings_goals (per motorcycle)
-- ----------------------------------------------------------------------------
create table savings_goals (
  id uuid primary key default uuid_generate_v4(),
  motorcycle_id uuid not null references motorcycles(id) on delete cascade,
  goal_name varchar not null,
  target_amount decimal(12,2) not null,
  current_amount decimal(12,2) not null default 0,
  start_date date not null default current_date,
  target_date date,
  status savings_status not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- TABLE: fleet_savings_goals (overall)
-- ----------------------------------------------------------------------------
create table fleet_savings_goals (
  id uuid primary key default uuid_generate_v4(),
  owner_id uuid references users(id) on delete set null,
  goal_name varchar not null,
  target_amount decimal(12,2) not null,
  current_amount decimal(12,2) not null default 0,
  start_date date not null default current_date,
  target_date date,
  status savings_status not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- TABLE: reminders
-- ----------------------------------------------------------------------------
create table reminders (
  id uuid primary key default uuid_generate_v4(),
  motorcycle_id uuid references motorcycles(id) on delete cascade,
  type reminder_type not null default 'custom',
  title varchar not null,
  description text,
  amount decimal(12,2),
  issue_date date,
  due_date date not null,
  status reminder_status not null default 'pending',
  attachment_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- TABLE: insurance_records
-- ----------------------------------------------------------------------------
create table insurance_records (
  id uuid primary key default uuid_generate_v4(),
  motorcycle_id uuid not null references motorcycles(id) on delete cascade,
  insurance_company varchar,
  policy_number varchar,
  start_date date,
  expiry_date date not null,
  document_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- TABLE: tax_records
-- ----------------------------------------------------------------------------
create table tax_records (
  id uuid primary key default uuid_generate_v4(),
  motorcycle_id uuid not null references motorcycles(id) on delete cascade,
  tax_amount decimal(12,2),
  payment_date date,
  due_date date not null,
  receipt_url text,
  status tax_status not null default 'pending',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- TABLE: inspections
-- ----------------------------------------------------------------------------
create table inspections (
  id uuid primary key default uuid_generate_v4(),
  motorcycle_id uuid not null references motorcycles(id) on delete cascade,
  inspection_date date not null default current_date,
  next_due_date date,
  certificate_url text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- TABLE: documents
-- ----------------------------------------------------------------------------
create table documents (
  id uuid primary key default uuid_generate_v4(),
  motorcycle_id uuid not null references motorcycles(id) on delete cascade,
  document_type document_type not null default 'other',
  file_name varchar not null,
  file_url text not null,
  uploaded_by uuid references users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- TABLE: notifications
-- ----------------------------------------------------------------------------
create table notifications (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references users(id) on delete cascade,
  title varchar not null,
  message text,
  type notification_type not null default 'system',
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- TABLE: activity_logs
-- ----------------------------------------------------------------------------
create table activity_logs (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references users(id) on delete set null,
  action varchar not null,
  entity_type varchar not null,
  entity_id uuid,
  details jsonb,
  created_at timestamptz not null default now()
);

-- ============================================================================
-- updated_at trigger (generic)
-- ============================================================================
create or replace function set_updated_at() returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

do $$
declare t text;
begin
  for t in select unnest(array[
    'users','motorcycles','drivers','driver_assignments','versements','debts',
    'debt_payments','expenses','non_working_days','savings_goals','fleet_savings_goals',
    'reminders','insurance_records','tax_records','inspections','documents'
  ])
  loop
    execute format('create trigger trg_%I_updated_at before update on %I for each row execute function set_updated_at();', t, t);
  end loop;
end $$;

-- ============================================================================
-- BUSINESS RULE: missed collection -> debt, Saturday excluded, debt carries forward
-- A versement marked unpaid/partial (or absent) on a working day creates/updates a debt.
-- ============================================================================
create or replace function handle_versement_debt() returns trigger as $$
declare
  shortfall decimal(12,2);
  target decimal(12,2);
  is_saturday boolean;
  is_non_working boolean;
begin
  select daily_target into target from motorcycles where id = new.motorcycle_id;
  is_saturday := extract(isodow from new.collection_date) = 6;
  select exists(
    select 1 from non_working_days
    where motorcycle_id = new.motorcycle_id and date = new.collection_date
  ) into is_non_working;

  if is_saturday or is_non_working then
    return new; -- rule 2/3: no expectation, no debt on non-working days
  end if;

  shortfall := coalesce(target,0) - coalesce(new.amount,0);

  if shortfall > 0 then
    insert into debts (motorcycle_id, driver_id, debt_date, original_amount, remaining_amount, status, notes)
    values (new.motorcycle_id, new.driver_id, new.collection_date, shortfall, shortfall, 'active', 'Auto-generated from short/missed versement')
    on conflict (motorcycle_id, debt_date) do update
      set original_amount = excluded.original_amount,
          remaining_amount = excluded.remaining_amount,
          status = case when excluded.remaining_amount <= 0 then 'paid' else 'active' end;
  else
    -- fully met or exceeded target: clear any auto debt for that date
    update debts set status = 'paid', remaining_amount = 0
      where motorcycle_id = new.motorcycle_id and debt_date = new.collection_date and status = 'active';
  end if;
  return new;
end;
$$ language plpgsql;

create trigger trg_versement_debt
  after insert or update of amount on versements
  for each row execute function handle_versement_debt();

-- debt repayments reduce remaining_amount and auto-close the debt (carry-forward until cleared)
create or replace function handle_debt_payment() returns trigger as $$
begin
  update debts
    set remaining_amount = greatest(remaining_amount - new.amount_paid, 0),
        status = case when remaining_amount - new.amount_paid <= 0 then 'paid' else 'active' end
    where id = new.debt_id;
  return new;
end;
$$ language plpgsql;

create trigger trg_debt_payment
  after insert on debt_payments
  for each row execute function handle_debt_payment();

-- ============================================================================
-- BUSINESS RULE: automatic notifications for upcoming due dates
-- Call select generate_due_notifications(); from a daily Edge Function / pg_cron job.
-- ============================================================================
create or replace function generate_due_notifications() returns void as $$
declare
  owner record;
begin
  for owner in select id from users loop
    -- insurance expiring within 14 days
    insert into notifications (user_id, title, message, type)
    select owner.id,
           'Insurance expiring: ' || m.plate_number,
           'Policy ' || coalesce(ir.policy_number,'') || ' expires on ' || ir.expiry_date,
           'reminder'
    from insurance_records ir
    join motorcycles m on m.id = ir.motorcycle_id
    where ir.expiry_date between current_date and current_date + interval '14 days'
      and not exists (
        select 1 from notifications n
        where n.user_id = owner.id and n.type = 'reminder'
          and n.title = 'Insurance expiring: ' || m.plate_number
          and n.created_at::date = current_date
      );

    -- tax due within 14 days
    insert into notifications (user_id, title, message, type)
    select owner.id,
           'Tax due: ' || m.plate_number,
           'Tax payment of ' || tr.tax_amount || ' due on ' || tr.due_date,
           'reminder'
    from tax_records tr
    join motorcycles m on m.id = tr.motorcycle_id
    where tr.status <> 'paid'
      and tr.due_date between current_date and current_date + interval '14 days'
      and not exists (
        select 1 from notifications n
        where n.user_id = owner.id and n.type = 'reminder'
          and n.title = 'Tax due: ' || m.plate_number
          and n.created_at::date = current_date
      );

    -- inspection due within 14 days
    insert into notifications (user_id, title, message, type)
    select owner.id,
           'Inspection due: ' || m.plate_number,
           'Next inspection due on ' || i.next_due_date,
           'reminder'
    from inspections i
    join motorcycles m on m.id = i.motorcycle_id
    where i.next_due_date between current_date and current_date + interval '14 days'
      and not exists (
        select 1 from notifications n
        where n.user_id = owner.id and n.type = 'reminder'
          and n.title = 'Inspection due: ' || m.plate_number
          and n.created_at::date = current_date
      );

    -- generic reminders (contravention, maintenance, custom) due within 7 days
    insert into notifications (user_id, title, message, type)
    select owner.id, r.title, coalesce(r.description,'') || ' — due ' || r.due_date, 'reminder'
    from reminders r
    where r.status = 'pending'
      and r.due_date between current_date and current_date + interval '7 days'
      and not exists (
        select 1 from notifications n
        where n.user_id = owner.id and n.type = 'reminder' and n.title = r.title
          and n.created_at::date = current_date
      );

    -- savings goal deadlines within 7 days
    insert into notifications (user_id, title, message, type)
    select owner.id, 'Savings goal deadline: ' || sg.goal_name,
           'Target ' || sg.target_amount || ' due ' || sg.target_date,
           'saving_goal'
    from savings_goals sg
    where sg.status = 'active'
      and sg.target_date between current_date and current_date + interval '7 days'
      and not exists (
        select 1 from notifications n
        where n.user_id = owner.id and n.type = 'saving_goal' and n.title = 'Savings goal deadline: ' || sg.goal_name
          and n.created_at::date = current_date
      );

    -- mark overdue reminders / tax records
    update reminders set status = 'overdue' where status = 'pending' and due_date < current_date;
    update tax_records set status = 'overdue' where status = 'pending' and due_date < current_date;
  end loop;
end;
$$ language plpgsql security definer;

-- ============================================================================
-- Row Level Security: every authenticated user can manage data for their own
-- fleet (owner_id / linked via motorcycle ownership). Simplified single-tenant
-- model: any authenticated user can read/write (suitable for one fleet owner +
-- staff). Tighten further if multiple independent fleet owners share one DB.
-- ============================================================================
do $$
declare t text;
begin
  for t in select unnest(array[
    'users','motorcycles','drivers','driver_assignments','versements','debts',
    'debt_payments','expenses','non_working_days','savings_goals','fleet_savings_goals',
    'reminders','insurance_records','tax_records','inspections','documents',
    'notifications','activity_logs'
  ])
  loop
    execute format('alter table %I enable row level security;', t);
    execute format('create policy %I on %I for all using (auth.role() = ''authenticated'') with check (auth.role() = ''authenticated'');', t || '_authenticated_all', t);
  end loop;
end $$;

-- auto-create a row in public.users whenever someone signs up via Supabase Auth
create or replace function handle_new_auth_user() returns trigger as $$
begin
  insert into public.users (auth_user_id, full_name, email)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email,'@',1)), new.email);
  return new;
end;
$$ language plpgsql security definer;

create trigger trg_new_auth_user
  after insert on auth.users
  for each row execute function handle_new_auth_user();
