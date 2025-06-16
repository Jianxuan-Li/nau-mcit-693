-- Create GPX files table in PostgreSQL
CREATE TABLE IF NOT EXISTS gpx_files (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL,
    filename VARCHAR(255) NOT NULL,
    file_path VARCHAR(500) NOT NULL,
    file_size BIGINT NOT NULL,
    uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    description TEXT,
    CONSTRAINT fk_gpx_user_id FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_gpx_user_id ON gpx_files(user_id);
CREATE INDEX IF NOT EXISTS idx_gpx_uploaded_at ON gpx_files(uploaded_at);