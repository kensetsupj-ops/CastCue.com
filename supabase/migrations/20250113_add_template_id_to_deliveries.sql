-- Add template_id column to deliveries table for A/B testing tracking
ALTER TABLE deliveries
ADD COLUMN template_id UUID REFERENCES templates ON DELETE SET NULL;

-- Create index for performance
CREATE INDEX idx_deliveries_template_id ON deliveries(template_id);

-- Comment
COMMENT ON COLUMN deliveries.template_id IS 'Template used for this delivery (for A/B testing analysis)';
