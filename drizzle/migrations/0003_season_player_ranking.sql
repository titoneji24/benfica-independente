CREATE OR REPLACE FUNCTION public.get_season_ranking_overview(_season integer, _demo boolean DEFAULT false)
RETURNS TABLE(player_id uuid, name text, player_position text, number integer, photo_url text, games_rated bigint, motm_awards bigint)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
 WITH season_matches AS (
  SELECT id, voting_open FROM public.matches
  WHERE kickoff >= make_timestamptz(_season,7,1,0,0,0,'Europe/Lisbon')
    AND kickoff < make_timestamptz(_season+1,7,1,0,0,0,'Europe/Lisbon')
    AND kickoff <= now() AND is_demo = _demo
 ), valid_ratings AS (
  SELECT r.match_id,r.player_id FROM public.ratings r
  JOIN season_matches m ON m.id=r.match_id
  WHERE r.score BETWEEN 1 AND 10
    AND EXISTS (SELECT 1 FROM public.match_players lp WHERE lp.match_id=r.match_id AND lp.player_id=r.player_id)
 ), rated AS (
  SELECT player_id,count(DISTINCT match_id) games FROM valid_ratings GROUP BY player_id
 ), vote_counts AS (
  SELECT v.match_id,v.player_id,count(*) votes FROM public.motm_votes v
  JOIN season_matches m ON m.id=v.match_id AND NOT m.voting_open
  JOIN public.players p ON p.id=v.player_id AND p.position <> 'TRE'
  WHERE EXISTS (SELECT 1 FROM public.match_players lp WHERE lp.match_id=v.match_id AND lp.player_id=v.player_id AND lp.role <> 'treinador')
  GROUP BY v.match_id,v.player_id
 ), winners AS (
  SELECT *,dense_rank() OVER (PARTITION BY match_id ORDER BY votes DESC) place FROM vote_counts
 ), awards AS (
  SELECT player_id,count(*) total FROM winners WHERE place=1 GROUP BY player_id
 )
 SELECT p.id,p.name,p.position::text,p.number,p.photo_url,coalesce(r.games,0),coalesce(a.total,0)
 FROM public.players p LEFT JOIN rated r ON r.player_id=p.id LEFT JOIN awards a ON a.player_id=p.id
 WHERE r.games IS NOT NULL OR a.total IS NOT NULL ORDER BY p.name,p.id;
$$;
REVOKE ALL ON FUNCTION public.get_season_ranking_overview(integer,boolean) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_season_ranking_overview(integer,boolean) TO anon, authenticated, service_role;
CREATE OR REPLACE FUNCTION public.get_season_ranking_averages(_season integer, _demo boolean DEFAULT false)
RETURNS TABLE(player_id uuid, avg_score numeric)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
 WITH per_match AS (
  SELECT r.player_id,r.match_id,avg(r.score)::numeric match_average,
    EXISTS (SELECT 1 FROM public.ratings own WHERE own.match_id=r.match_id AND own.player_id=r.player_id AND own.user_id=auth.uid() AND own.score BETWEEN 1 AND 10) assessed
  FROM public.ratings r JOIN public.matches m ON m.id=r.match_id
  WHERE m.kickoff >= make_timestamptz(_season,7,1,0,0,0,'Europe/Lisbon')
    AND m.kickoff < make_timestamptz(_season+1,7,1,0,0,0,'Europe/Lisbon')
    AND m.kickoff <= now() AND m.is_demo = _demo AND r.score BETWEEN 1 AND 10
    AND EXISTS (SELECT 1 FROM public.match_players lp WHERE lp.match_id=r.match_id AND lp.player_id=r.player_id)
  GROUP BY r.player_id,r.match_id
 )
 SELECT player_id,round(avg(match_average),1) FROM per_match
 WHERE auth.uid() IS NOT NULL GROUP BY player_id HAVING bool_and(assessed);
$$;
REVOKE ALL ON FUNCTION public.get_season_ranking_averages(integer,boolean) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_season_ranking_averages(integer,boolean) TO authenticated, service_role;
COMMENT ON FUNCTION public.get_season_ranking_averages(integer,boolean) IS 'Equal match weighting; reveals season average only after caller rated every contributing match. Never exposes unassessed match scores.';
COMMENT ON FUNCTION public.get_season_ranking_overview(integer,boolean) IS 'July-June seasons. Distinct evaluated fixtures; closed-voting MOTM winners including ties. Official and demonstration fixtures remain separate.';