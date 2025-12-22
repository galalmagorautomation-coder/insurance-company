-- Create agent_yearly_goals table
CREATE TABLE IF NOT EXISTS agent_yearly_goals (
  id BIGSERIAL PRIMARY KEY,
  agent_id BIGINT NOT NULL REFERENCES agent_data(id) ON DELETE CASCADE,
  year INTEGER NOT NULL,
  pension_goal NUMERIC DEFAULT 0,
  risk_goal NUMERIC DEFAULT 0,
  financial_goal NUMERIC DEFAULT 0,
  pension_transfer_goal NUMERIC DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(agent_id, year)
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_agent_yearly_goals_agent_id ON agent_yearly_goals(agent_id);
CREATE INDEX IF NOT EXISTS idx_agent_yearly_goals_year ON agent_yearly_goals(year);
CREATE INDEX IF NOT EXISTS idx_agent_yearly_goals_agent_year ON agent_yearly_goals(agent_id, year);

-- Add trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_agent_yearly_goals_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER agent_yearly_goals_updated_at_trigger
BEFORE UPDATE ON agent_yearly_goals
FOR EACH ROW
EXECUTE FUNCTION update_agent_yearly_goals_updated_at();

-- Add comments for documentation
COMMENT ON TABLE agent_yearly_goals IS 'Stores yearly goals for each agent across different product types';
COMMENT ON COLUMN agent_yearly_goals.agent_id IS 'Foreign key reference to agent_data table';
COMMENT ON COLUMN agent_yearly_goals.year IS 'Calendar year for the goals (e.g., 2024, 2025)';
COMMENT ON COLUMN agent_yearly_goals.pension_goal IS 'Yearly goal for pension products';
COMMENT ON COLUMN agent_yearly_goals.risk_goal IS 'Yearly goal for risk products';
COMMENT ON COLUMN agent_yearly_goals.financial_goal IS 'Yearly goal for financial products';
COMMENT ON COLUMN agent_yearly_goals.pension_transfer_goal IS 'Yearly goal for pension transfer products';
