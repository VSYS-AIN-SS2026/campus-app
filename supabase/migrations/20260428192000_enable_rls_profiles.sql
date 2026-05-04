-- Aktiviert Row Level Security für Profile
-- Ab diesem Zeitpunkt greifen Zugriffe nur noch über definierte Policies
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
