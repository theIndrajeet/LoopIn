-- Create priority enum for tasks
CREATE TYPE public.task_priority AS ENUM ('low', 'medium', 'high', 'urgent');

-- Create tasks table
CREATE TABLE public.tasks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  priority task_priority NOT NULL DEFAULT 'medium',
  due_date DATE,
  completed BOOLEAN NOT NULL DEFAULT false,
  completed_at TIMESTAMP WITH TIME ZONE,
  order_index INTEGER,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  deleted_at TIMESTAMP WITH TIME ZONE
);

-- Create task_subtasks table
CREATE TABLE public.task_subtasks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  completed BOOLEAN NOT NULL DEFAULT false,
  order_index INTEGER,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on tasks
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

-- RLS Policies for tasks
CREATE POLICY "Users can view their own tasks"
  ON public.tasks FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own tasks"
  ON public.tasks FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own tasks"
  ON public.tasks FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own tasks"
  ON public.tasks FOR DELETE
  USING (auth.uid() = user_id);

-- Enable RLS on task_subtasks
ALTER TABLE public.task_subtasks ENABLE ROW LEVEL SECURITY;

-- RLS Policies for task_subtasks
CREATE POLICY "Users can view subtasks for their tasks"
  ON public.task_subtasks FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.tasks
    WHERE tasks.id = task_subtasks.task_id
    AND tasks.user_id = auth.uid()
  ));

CREATE POLICY "Users can create subtasks for their tasks"
  ON public.task_subtasks FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.tasks
    WHERE tasks.id = task_subtasks.task_id
    AND tasks.user_id = auth.uid()
  ));

CREATE POLICY "Users can update subtasks for their tasks"
  ON public.task_subtasks FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM public.tasks
    WHERE tasks.id = task_subtasks.task_id
    AND tasks.user_id = auth.uid()
  ));

CREATE POLICY "Users can delete subtasks for their tasks"
  ON public.task_subtasks FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM public.tasks
    WHERE tasks.id = task_subtasks.task_id
    AND tasks.user_id = auth.uid()
  ));