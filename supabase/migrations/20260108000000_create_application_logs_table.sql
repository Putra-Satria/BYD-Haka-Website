create table if not exists public.application_logs (
  id uuid not null default gen_random_uuid(),
  application_id uuid not null references public.applications(id) on delete cascade,
  status public.application_status not null,
  notes text null,
  created_by uuid null references auth.users(id),
  created_at timestamp with time zone not null default now(),
  constraint application_logs_pkey primary key (id)
);

alter table public.application_logs enable row level security;

DROP POLICY IF EXISTS "Users can view logs of their own applications" ON public.application_logs;
create policy "Users can view logs of their own applications"
  on public.application_logs for select
  using (
    exists (
      select 1 from public.applications
      where applications.id = application_logs.application_id
      and applications.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Admins can view and insert logs" ON public.application_logs;
create policy "Admins can view and insert logs"
  on public.application_logs for all
  using (
    exists (
      select 1 from public.user_roles
      where user_roles.user_id = auth.uid()
      and user_roles.role = 'admin'::public.app_role
    )
  );
