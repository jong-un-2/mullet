-- Vault Historical Data Table
-- 记录 Kamino Vault 的历史 APY 和 TVL 数据

CREATE TABLE IF NOT EXISTS vault_historical_data (
  id SERIAL PRIMARY KEY,
  vault_address VARCHAR(44) NOT NULL,
  recorded_at TIMESTAMP NOT NULL DEFAULT NOW(),
  
  -- APY 数据
  lending_apy DECIMAL(10, 6) NOT NULL,
  incentives_apy DECIMAL(10, 6) NOT NULL,
  total_apy DECIMAL(10, 6) NOT NULL,
  
  -- TVL 数据
  total_supplied DECIMAL(20, 6) NOT NULL,
  total_supplied_usd DECIMAL(20, 2) NOT NULL,
  
  -- Token 信息
  token_symbol VARCHAR(10) NOT NULL,
  
  -- 额外元数据
  slot_number BIGINT,
  metadata JSONB,
  
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- 索引优化查询
CREATE INDEX IF NOT EXISTS idx_vault_historical_vault_recorded 
  ON vault_historical_data(vault_address, recorded_at DESC);

CREATE INDEX IF NOT EXISTS idx_vault_historical_recorded 
  ON vault_historical_data(recorded_at DESC);

CREATE INDEX IF NOT EXISTS idx_vault_historical_vault_token 
  ON vault_historical_data(vault_address, token_symbol, recorded_at DESC);

-- 注释
COMMENT ON TABLE vault_historical_data IS 'Kamino Vault 历史 APY 和 TVL 数据';
COMMENT ON COLUMN vault_historical_data.vault_address IS 'Vault 地址';
COMMENT ON COLUMN vault_historical_data.recorded_at IS '记录时间';
COMMENT ON COLUMN vault_historical_data.lending_apy IS '借贷 APY (小数格式, 0.085 = 8.5%)';
COMMENT ON COLUMN vault_historical_data.incentives_apy IS '激励 APY (小数格式)';
COMMENT ON COLUMN vault_historical_data.total_apy IS '总 APY (小数格式)';
COMMENT ON COLUMN vault_historical_data.total_supplied IS 'Vault 中总供应量 (token 数量)';
COMMENT ON COLUMN vault_historical_data.total_supplied_usd IS 'Vault 中总供应量 (USD 价值)';
COMMENT ON COLUMN vault_historical_data.token_symbol IS 'Token 符号 (PYUSD, USDC 等)';
