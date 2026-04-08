-- FinLog 2.0 Database Schema
-- PostgreSQL (Supabase)

-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Brokers (Declarants)
CREATE TABLE IF NOT EXISTS brokers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Transactions (Operations)
CREATE TABLE IF NOT EXISTS transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    broker_id UUID NOT NULL REFERENCES brokers(id) ON DELETE CASCADE,
    type VARCHAR(20) NOT NULL CHECK (type IN ('accrual', 'payment', 'transfer', 'cash')),
    amount NUMERIC(15, 2) NOT NULL CHECK (amount > 0),
    datetime TIMESTAMPTZ NOT NULL,
    receipt_number VARCHAR(100),
    party_from VARCHAR(255),
    party_to VARCHAR(255),
    party_identifier VARCHAR(100),
    kbk VARCHAR(50),
    knp VARCHAR(50),
    comment TEXT,
    source VARCHAR(20) NOT NULL DEFAULT 'manual' CHECK (source IN ('manual', 'receipt')),
    raw_text TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_transactions_broker_id ON transactions(broker_id);
CREATE INDEX IF NOT EXISTS idx_transactions_type ON transactions(type);
CREATE INDEX IF NOT EXISTS idx_transactions_datetime ON transactions(datetime);
CREATE INDEX IF NOT EXISTS idx_transactions_broker_type ON transactions(broker_id, type);
