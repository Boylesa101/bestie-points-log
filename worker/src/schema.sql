CREATE TABLE IF NOT EXISTS families (
  id TEXT PRIMARY KEY,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  revision INTEGER NOT NULL DEFAULT 0,
  active INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS devices (
  id TEXT PRIMARY KEY,
  family_id TEXT NOT NULL,
  parent_name TEXT NOT NULL,
  device_name TEXT NOT NULL,
  device_token_hash TEXT NOT NULL UNIQUE,
  is_primary INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  last_seen_at TEXT,
  revoked_at TEXT,
  FOREIGN KEY (family_id) REFERENCES families(id)
);

CREATE TABLE IF NOT EXISTS pairing_codes (
  id TEXT PRIMARY KEY,
  family_id TEXT NOT NULL,
  code_hash TEXT NOT NULL UNIQUE,
  expires_at TEXT NOT NULL,
  redeemed_at TEXT,
  created_at TEXT NOT NULL,
  created_by_device_id TEXT NOT NULL,
  FOREIGN KEY (family_id) REFERENCES families(id),
  FOREIGN KEY (created_by_device_id) REFERENCES devices(id)
);

CREATE TABLE IF NOT EXISTS profiles (
  family_id TEXT PRIMARY KEY,
  child_name TEXT NOT NULL,
  photo_key TEXT,
  updated_at TEXT NOT NULL,
  updated_by_device_id TEXT,
  FOREIGN KEY (family_id) REFERENCES families(id)
);

CREATE TABLE IF NOT EXISTS presets (
  id TEXT PRIMARY KEY,
  family_id TEXT NOT NULL,
  type TEXT NOT NULL,
  label TEXT NOT NULL,
  points INTEGER NOT NULL,
  icon TEXT,
  visible_on_home INTEGER NOT NULL DEFAULT 1,
  sort_order INTEGER NOT NULL DEFAULT 0,
  source TEXT NOT NULL,
  deleted_at TEXT,
  updated_at TEXT NOT NULL,
  updated_by_device_id TEXT,
  FOREIGN KEY (family_id) REFERENCES families(id)
);

CREATE TABLE IF NOT EXISTS rewards (
  id TEXT PRIMARY KEY,
  family_id TEXT NOT NULL,
  title TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'sticker',
  icon TEXT,
  description TEXT NOT NULL,
  venue_template TEXT,
  venue_name TEXT,
  booking_url TEXT,
  discount_code TEXT,
  offer_source TEXT,
  eligibility_notes TEXT,
  last_checked_at TEXT,
  visible_before_unlock INTEGER NOT NULL DEFAULT 1,
  unlocked_at TEXT,
  cost_points INTEGER NOT NULL DEFAULT 0,
  redemption_type TEXT NOT NULL DEFAULT 'spend-points',
  redeemed_at TEXT,
  has_celebrated_unlock INTEGER NOT NULL DEFAULT 0,
  points_required INTEGER NOT NULL,
  claimed INTEGER NOT NULL DEFAULT 0,
  claimed_at TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  deleted_at TEXT,
  updated_at TEXT NOT NULL,
  updated_by_device_id TEXT,
  FOREIGN KEY (family_id) REFERENCES families(id)
);

CREATE TABLE IF NOT EXISTS point_events (
  id TEXT PRIMARY KEY,
  family_id TEXT NOT NULL,
  device_id TEXT NOT NULL,
  parent_name TEXT NOT NULL,
  delta INTEGER NOT NULL,
  label TEXT,
  reason TEXT NOT NULL,
  created_at_client TEXT NOT NULL,
  received_at_server TEXT NOT NULL,
  FOREIGN KEY (family_id) REFERENCES families(id),
  FOREIGN KEY (device_id) REFERENCES devices(id)
);

CREATE INDEX IF NOT EXISTS idx_devices_family_id ON devices(family_id);
CREATE INDEX IF NOT EXISTS idx_pairing_codes_family_id ON pairing_codes(family_id);
CREATE INDEX IF NOT EXISTS idx_presets_family_id ON presets(family_id);
CREATE INDEX IF NOT EXISTS idx_rewards_family_id ON rewards(family_id);
CREATE INDEX IF NOT EXISTS idx_point_events_family_id ON point_events(family_id);
