ALTER TABLE transactions ADD COLUMN user_id TEXT REFERENCES users(id);
ALTER TABLE transactions ADD COLUMN type TEXT CHECK(type IN ('income', 'expense'));

CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(user_id, created_at DESC);
