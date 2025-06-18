-- Migration to add R2 object key column to gpx_files table
-- This allows storing the R2 object key for each GPX file

ALTER TABLE gpx_files 
ADD COLUMN r2_object_key VARCHAR(500);

-- Create index for better performance when querying by R2 object key
CREATE INDEX idx_gpx_files_r2_object_key ON gpx_files(r2_object_key);

-- Update existing records to have empty string for r2_object_key to maintain consistency
-- In production, you might want to set this based on existing file_path values
UPDATE gpx_files SET r2_object_key = '' WHERE r2_object_key IS NULL;

-- Add comment to document the new column
COMMENT ON COLUMN gpx_files.r2_object_key IS 'Cloudflare R2 object key for the stored GPX file';