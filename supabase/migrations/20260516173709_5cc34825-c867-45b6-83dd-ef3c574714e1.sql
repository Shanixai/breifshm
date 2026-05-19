
-- Briefs table
CREATE TABLE public.briefs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL DEFAULT '',
  deliverable TEXT NOT NULL DEFAULT 'video',
  content_md TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.briefs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own briefs" ON public.briefs
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own briefs" ON public.briefs
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own briefs" ON public.briefs
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own briefs" ON public.briefs
  FOR DELETE USING (auth.uid() = user_id);

CREATE TRIGGER trg_briefs_updated_at
  BEFORE UPDATE ON public.briefs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_briefs_user_created ON public.briefs(user_id, created_at DESC);

-- References table
CREATE TABLE public.references (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  brief_id UUID REFERENCES public.briefs(id) ON DELETE CASCADE,
  kind TEXT NOT NULL CHECK (kind IN ('pdf','docx','image','text','url')),
  name TEXT NOT NULL DEFAULT '',
  storage_path TEXT,
  url TEXT,
  extracted_text TEXT,
  vision_summary TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.references ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own references" ON public.references
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own references" ON public.references
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own references" ON public.references
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own references" ON public.references
  FOR DELETE USING (auth.uid() = user_id);

CREATE INDEX idx_references_user_brief ON public.references(user_id, brief_id);

-- Storage bucket for references
INSERT INTO storage.buckets (id, name, public) VALUES ('references', 'references', false)
  ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Users can read their own reference files"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'references' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can upload their own reference files"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'references' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can update their own reference files"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'references' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own reference files"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'references' AND auth.uid()::text = (storage.foldername(name))[1]);
