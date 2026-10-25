update public.collector_population_listings as listing
set search_query = coalesce(
  nullif(listing.search_query, ''),
  nullif(job.search_query, ''),
  nullif(job.toyline, '')
)
from public.collector_population_jobs as job
where listing.job_id = job.id
  and (listing.search_query is null or listing.search_query = '');
