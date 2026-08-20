create table if not exists public.saved_jobs (
  id uuid not null default gen_random_uuid (),
  user_id uuid not null references public.profiles (id) on delete cascade,
  job_id text not null,
  created_at timestamp with time zone not null default now(),
  constraint saved_jobs_pkey primary key (id),
  constraint saved_jobs_user_id_job_id_key unique (user_id, job_id)
);

alter table public.saved_jobs enable row level security;

DROP POLICY IF EXISTS "Users can view their own saved jobs" ON public.saved_jobs;
create policy "Users can view their own saved jobs" on public.saved_jobs
  for select using (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can save jobs" ON public.saved_jobs;
create policy "Users can save jobs" on public.saved_jobs
  for insert with check (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can remove saved jobs" ON public.saved_jobs;
create policy "Users can remove saved jobs" on public.saved_jobs
  for delete using (auth.uid() = user_id);
