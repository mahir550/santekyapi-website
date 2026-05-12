CREATE TABLE IF NOT EXISTS contact_submissions (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  ad          TEXT NOT NULL,
  soyad       TEXT DEFAULT '',
  sirket      TEXT DEFAULT '',
  eposta      TEXT NOT NULL,
  konu        TEXT DEFAULT '',
  mesaj       TEXT NOT NULL,
  created_at  TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS dealership_applications (
  id               INTEGER PRIMARY KEY AUTOINCREMENT,
  ad               TEXT NOT NULL,
  soyad            TEXT DEFAULT '',
  sirket           TEXT NOT NULL,
  eposta           TEXT NOT NULL,
  telefon          TEXT DEFAULT '',
  sehir            TEXT DEFAULT '',
  faaliyet_alani   TEXT DEFAULT '',
  mesaj            TEXT DEFAULT '',
  status           TEXT DEFAULT 'new',
  created_at       TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_contact_created_at ON contact_submissions(created_at);
CREATE INDEX IF NOT EXISTS idx_dealership_created_at ON dealership_applications(created_at);
CREATE INDEX IF NOT EXISTS idx_dealership_status ON dealership_applications(status);
