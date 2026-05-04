-- Funktion: Erstellt automatisch ein Profil, sobald ein neuer Auth-User angelegt wird
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Entsprechenden Profileintrag für den neuen User anlegen
  -- full_name wird optional aus user_metadata übernommen, falls vorhanden
  INSERT INTO public.profiles (id, full_name)
  VALUES (NEW.id, NEW.raw_user_meta_data ->> 'full_name')
  ON CONFLICT (id) DO NOTHING;

  RETURN NEW;
END;
$$;

-- Trigger: Läuft nach jedem neuen Eintrag in auth.users
-- und ruft die Profil-Erstellung auf
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.handle_new_user();
