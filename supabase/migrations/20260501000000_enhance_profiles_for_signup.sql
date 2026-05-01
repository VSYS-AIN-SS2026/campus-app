-- Enhancement: Email-Verifizierung + Admin-Policies für komplette Nutzeranmeldung

-- 1. Email-Verifizierungsstatus tracken
ALTER TABLE public.profiles ADD COLUMN email_verified BOOLEAN NOT NULL DEFAULT FALSE;

-- 2. Admin-Policy: Admins dürfen alle Profile lesen, aktualisieren und löschen
CREATE POLICY "profiles_admin_all"
ON public.profiles
FOR ALL
TO authenticated
USING (auth.jwt() ->> 'role' = 'admin');

-- Index für email_verified Abfragen (z.B. "nur verifizierte Nutzer")
CREATE INDEX profiles_email_verified_idx ON public.profiles(email_verified);
