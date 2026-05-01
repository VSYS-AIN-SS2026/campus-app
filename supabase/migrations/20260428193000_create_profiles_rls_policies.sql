-- Policy: Authentifizierte Benutzer dürfen ihr eigenes Profil lesen
CREATE POLICY "profiles_select_own"
ON public.profiles
FOR SELECT
TO authenticated
USING (auth.uid() = id);

-- Policy: Authentifizierte Benutzer dürfen ihr eigenes Profil aktualisieren
CREATE POLICY "profiles_update_own"
ON public.profiles
FOR UPDATE
TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- Hinweis: INSERT wird über den Trigger auf auth.users gehandhabt.
-- Es gibt bewusst keine öffentliche INSERT-Policy auf public.profiles.
