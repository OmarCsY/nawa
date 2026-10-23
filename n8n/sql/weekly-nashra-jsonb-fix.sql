-- Already applied on Omar's project by migration fix_weekly_nashra_jsonb_cast.
-- Reviewed conversion only: noo_nashra returns json, while jsonb_array_elements requires jsonb.
do $fix$ declare source text; begin select pg_get_functiondef('nawa_engine.sweep(uuid,date,date,boolean)'::regprocedure) into source; source:=replace(source,'jsonb_array_elements(public.noo_nashra(p_identity)->''days'')','jsonb_array_elements((public.noo_nashra(p_identity)::jsonb)->''days'')'); execute source; end $fix$;
