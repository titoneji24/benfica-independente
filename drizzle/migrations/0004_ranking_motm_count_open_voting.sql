CREATE OR REPLACE FUNCTION public.get_season_ranking_overview(_season integer, _demo boolean DEFAULT false)
RETURNS TABLE(player_id uuid, name text, player_position text, number integer, photo_url text, games_rated bigint, motm_awards bigint)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
 WITH season_matches AS (
  SELECT id FROM public.matches
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
  JOIN season_matches m ON m.id=v.match_id
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
COMMENT ON FUNCTION public.get_season_ranking_overview(integer,boolean) IS 'July-June seasons. Distinct evaluated fixtures; current MOTM leaders count even while voting is open, including ties. Official and demonstration fixtures remain separate.';