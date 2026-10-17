CREATE OR REPLACE FUNCTION public.validate_vote()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE r public.lineup_role; pos public.player_position; target_match uuid;
BEGIN
 target_match := CASE WHEN TG_OP = 'DELETE' THEN OLD.match_id ELSE NEW.match_id END;
 IF TG_OP='DELETE' AND NOT EXISTS (SELECT 1 FROM public.matches WHERE id=target_match) THEN RETURN OLD; END IF;
 IF NOT EXISTS (SELECT 1 FROM public.matches WHERE id=target_match AND voting_open) THEN RAISE EXCEPTION 'A votação deste jogo está fechada'; END IF;
 IF TG_OP='DELETE' THEN RETURN OLD; END IF;
 SELECT lp.role,p.position INTO r,pos FROM public.match_players lp JOIN public.players p ON p.id=lp.player_id WHERE lp.match_id=NEW.match_id AND lp.player_id=NEW.player_id;
 IF r IS NULL THEN RAISE EXCEPTION 'Jogador não participou neste jogo'; END IF;
 IF TG_TABLE_NAME='motm_votes' AND (r='treinador' OR pos='TRE') THEN RAISE EXCEPTION 'O treinador não pode ser Melhor em Campo'; END IF;
 NEW.updated_at := now(); RETURN NEW;
END;
$$;