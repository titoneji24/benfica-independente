CREATE OR REPLACE FUNCTION public.get_match_results(_match_id uuid)
RETURNS TABLE(player_id uuid, avg_score numeric, rating_count bigint, motm_count bigint, motm_total bigint)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
 SELECT mp.player_id, round(avg(r.score)::numeric, 1), count(r.id),
 (SELECT count(*) FROM public.motm_votes v JOIN public.match_players lp ON lp.match_id=v.match_id AND lp.player_id=v.player_id JOIN public.players p ON p.id=lp.player_id WHERE v.match_id=_match_id AND v.player_id=mp.player_id AND lp.role <> 'treinador' AND p.position <> 'TRE'),
 (SELECT count(*) FROM public.motm_votes v JOIN public.match_players lp ON lp.match_id=v.match_id AND lp.player_id=v.player_id JOIN public.players p ON p.id=lp.player_id WHERE v.match_id=_match_id AND lp.role <> 'treinador' AND p.position <> 'TRE')
 FROM public.match_players mp
 LEFT JOIN public.ratings r ON r.match_id=mp.match_id AND r.player_id=mp.player_id AND r.score BETWEEN 1 AND 10
 WHERE mp.match_id=_match_id AND EXISTS (SELECT 1 FROM public.ratings own WHERE own.match_id=mp.match_id AND own.player_id=mp.player_id AND own.user_id=auth.uid())
 GROUP BY mp.player_id;
$$;
REVOKE ALL ON FUNCTION public.get_match_results(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_match_results(uuid) TO anon, authenticated, service_role;
CREATE OR REPLACE FUNCTION public.get_match_motm_results(_match_id uuid)
RETURNS TABLE(player_id uuid, motm_count bigint, motm_total bigint)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
 WITH valid_votes AS (
 SELECT v.player_id FROM public.motm_votes v
 JOIN public.match_players lp ON lp.match_id=v.match_id AND lp.player_id=v.player_id
 JOIN public.players p ON p.id=lp.player_id
 WHERE v.match_id=_match_id AND lp.role <> 'treinador' AND p.position <> 'TRE'
 )
 SELECT v.player_id, count(*), (SELECT count(*) FROM valid_votes)
 FROM valid_votes v GROUP BY v.player_id ORDER BY count(*) DESC, v.player_id;
$$;
REVOKE ALL ON FUNCTION public.get_match_motm_results(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_match_motm_results(uuid) TO anon, authenticated, service_role;
CREATE OR REPLACE FUNCTION public.validate_vote()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE r public.lineup_role; pos public.player_position; target_match uuid;
BEGIN
 target_match := CASE WHEN TG_OP = 'DELETE' THEN OLD.match_id ELSE NEW.match_id END;
 IF NOT EXISTS (SELECT 1 FROM public.matches WHERE id=target_match AND voting_open) THEN
 RAISE EXCEPTION 'A votação deste jogo está fechada'; END IF;
 IF TG_OP='DELETE' THEN RETURN OLD; END IF;
 SELECT lp.role,p.position INTO r,pos FROM public.match_players lp JOIN public.players p ON p.id=lp.player_id WHERE lp.match_id=NEW.match_id AND lp.player_id=NEW.player_id;
 IF r IS NULL THEN RAISE EXCEPTION 'Jogador não participou neste jogo'; END IF;
 IF TG_TABLE_NAME='motm_votes' AND (r='treinador' OR pos='TRE') THEN RAISE EXCEPTION 'O treinador não pode ser Melhor em Campo'; END IF;
 NEW.updated_at := now(); RETURN NEW;
END;
$$;
CREATE TRIGGER motm_validate_delete BEFORE DELETE ON public.motm_votes FOR EACH ROW EXECUTE FUNCTION public.validate_vote();
ALTER TABLE public.matches ADD COLUMN is_demo boolean NOT NULL DEFAULT false;
UPDATE public.matches SET is_demo=true WHERE slug IN ('benfica-vs-sporting-2026-10-04','braga-vs-benfica-2026-09-27','benfica-vs-porto-2026-09-20','benfica-vs-inter-2026-09-16');