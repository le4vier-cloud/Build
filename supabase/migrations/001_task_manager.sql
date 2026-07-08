-- =============================================================
-- Task Manager Schema — Build Manufacturing ERP
-- =============================================================
-- Depends on: products table (already exists)
--             im_parts / os_parts tables (already exist)
-- =============================================================

-- ── 1. Machining-type enum ────────────────────────────────────
CREATE TYPE machining_type AS ENUM (
  'cnc_milling',
  'cnc_turning',
  'laser',
  'plasma',
  'waterjet',
  '3d_print',
  'welding',
  'sheet_metal',
  'drilling',
  'grinding'
);

-- ── 2. Workflows ──────────────────────────────────────────────
CREATE TABLE workflows (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id  UUID        NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  name        TEXT        NOT NULL CHECK (char_length(name) BETWEEN 1 AND 200),
  sort_order  INTEGER     NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_workflows_product_sort ON workflows (product_id, sort_order);

-- ── 3. Tasks ──────────────────────────────────────────────────
CREATE TABLE tasks (
  id                   UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id          UUID        NOT NULL REFERENCES workflows(id) ON DELETE CASCADE,
  name                 TEXT        NOT NULL CHECK (char_length(name) BETWEEN 1 AND 200),
  max_duration_minutes INTEGER     NOT NULL DEFAULT 0 CHECK (max_duration_minutes >= 0),
  option_set           TEXT        NOT NULL CHECK (option_set IN ('human', 'machine')),
  num_people_required  INTEGER     NOT NULL DEFAULT 1 CHECK (num_people_required >= 1),
  sort_order           INTEGER     NOT NULL DEFAULT 0,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_tasks_workflow_sort ON tasks (workflow_id, sort_order);

-- ── 4. SOP documents ─────────────────────────────────────────
-- Accepted: PDF, DOCX, XLSX, XLS, PNG, JPG
CREATE TABLE task_sop_files (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id         UUID        NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  file_name       TEXT        NOT NULL,
  storage_path    TEXT        NOT NULL,   -- Supabase Storage: bucket/path
  file_size_bytes BIGINT,
  sort_order      INTEGER     NOT NULL DEFAULT 0,
  uploaded_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_task_sop_files_task_sort ON task_sop_files (task_id, sort_order);

-- ── 5. Machining files ────────────────────────────────────────
-- Accepted: NC, GCODE, NGC, DXF, STEP, STP, STL, PDF
CREATE TABLE task_machining_files (
  id              UUID           PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id         UUID           NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  machining_type  machining_type NOT NULL,
  file_name       TEXT           NOT NULL,
  storage_path    TEXT           NOT NULL,   -- Supabase Storage: bucket/path
  file_size_bytes BIGINT,
  sort_order      INTEGER        NOT NULL DEFAULT 0,
  uploaded_at     TIMESTAMPTZ    NOT NULL DEFAULT now()
);

CREATE INDEX idx_task_machining_files_task_sort ON task_machining_files (task_id, sort_order);

-- ── 6. Task materials ─────────────────────────────────────────
-- part_id references either im_parts.id or os_parts.id
-- part_type discriminates which table to join
CREATE TABLE task_materials (
  id         UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id    UUID          NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  part_id    UUID          NOT NULL,
  part_type  TEXT          NOT NULL CHECK (part_type IN ('IM', 'OS')),
  quantity   NUMERIC(12,4) NOT NULL DEFAULT 1 CHECK (quantity > 0),
  created_at TIMESTAMPTZ   NOT NULL DEFAULT now(),
  UNIQUE (task_id, part_id, part_type)
);

CREATE INDEX idx_task_materials_task ON task_materials (task_id);

-- ── 7. updated_at trigger ─────────────────────────────────────
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_workflows_updated_at
  BEFORE UPDATE ON workflows
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_tasks_updated_at
  BEFORE UPDATE ON tasks
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ── 8. Row-Level Security ─────────────────────────────────────
ALTER TABLE workflows            ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks                ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_sop_files       ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_machining_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_materials       ENABLE ROW LEVEL SECURITY;

-- Workflows — authenticated users can manage workflows on products they can see
CREATE POLICY "workflows_select" ON workflows FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM products WHERE products.id = workflows.product_id));

CREATE POLICY "workflows_insert" ON workflows FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM products WHERE products.id = product_id));

CREATE POLICY "workflows_update" ON workflows FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM products WHERE products.id = product_id));

CREATE POLICY "workflows_delete" ON workflows FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM products WHERE products.id = product_id));

-- Tasks — delegate access through workflow → product
CREATE POLICY "tasks_select" ON tasks FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM workflows WHERE workflows.id = tasks.workflow_id));

CREATE POLICY "tasks_insert" ON tasks FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM workflows WHERE workflows.id = workflow_id));

CREATE POLICY "tasks_update" ON tasks FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM workflows WHERE workflows.id = workflow_id));

CREATE POLICY "tasks_delete" ON tasks FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM workflows WHERE workflows.id = workflow_id));

-- SOP files — delegate through task → workflow → product
CREATE POLICY "task_sop_files_select" ON task_sop_files FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM tasks WHERE tasks.id = task_sop_files.task_id));

CREATE POLICY "task_sop_files_insert" ON task_sop_files FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM tasks WHERE tasks.id = task_id));

CREATE POLICY "task_sop_files_delete" ON task_sop_files FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM tasks WHERE tasks.id = task_sop_files.task_id));

-- Machining files
CREATE POLICY "task_machining_files_select" ON task_machining_files FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM tasks WHERE tasks.id = task_machining_files.task_id));

CREATE POLICY "task_machining_files_insert" ON task_machining_files FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM tasks WHERE tasks.id = task_id));

CREATE POLICY "task_machining_files_delete" ON task_machining_files FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM tasks WHERE tasks.id = task_machining_files.task_id));

-- Task materials
CREATE POLICY "task_materials_select" ON task_materials FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM tasks WHERE tasks.id = task_materials.task_id));

CREATE POLICY "task_materials_insert" ON task_materials FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM tasks WHERE tasks.id = task_id));

CREATE POLICY "task_materials_update" ON task_materials FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM tasks WHERE tasks.id = task_materials.task_id));

CREATE POLICY "task_materials_delete" ON task_materials FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM tasks WHERE tasks.id = task_materials.task_id));

-- ── 9. Supabase Storage bucket ────────────────────────────────
-- Run once via Supabase dashboard or management API:
--
--   INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
--   VALUES (
--     'task-files',
--     'task-files',
--     false,
--     52428800,   -- 50 MB per file
--     ARRAY[
--       'application/pdf',
--       'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
--       'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
--       'application/vnd.ms-excel',
--       'image/png', 'image/jpeg',
--       'application/octet-stream'   -- NC, GCODE, DXF, STEP, STL
--     ]
--   );
--
-- Storage RLS (authenticated upload/read, no public access):
--
--   CREATE POLICY "task-files upload" ON storage.objects FOR INSERT TO authenticated
--     WITH CHECK (bucket_id = 'task-files');
--
--   CREATE POLICY "task-files read" ON storage.objects FOR SELECT TO authenticated
--     USING (bucket_id = 'task-files');
--
--   CREATE POLICY "task-files delete" ON storage.objects FOR DELETE TO authenticated
--     USING (bucket_id = 'task-files');
