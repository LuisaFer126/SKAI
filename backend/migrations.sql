-- Schema creation
CREATE TABLE IF NOT EXISTS "User" (
  userId SERIAL PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  name TEXT,
  password_hash TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS "ChatSession" (
  sessionId SERIAL PRIMARY KEY,
  userId INT REFERENCES "User"(userId) ON DELETE CASCADE,
  startDate TIMESTAMP DEFAULT NOW(),
  endDate TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "Message" (
  messageId SERIAL PRIMARY KEY,
  sessionId INT REFERENCES "ChatSession"(sessionId) ON DELETE CASCADE,
  author TEXT NOT NULL,
  content TEXT NOT NULL,
  createdAt TIMESTAMP DEFAULT NOW(),
  emotionType TEXT
);

CREATE TABLE IF NOT EXISTS "UserHistory" (
  historyId SERIAL PRIMARY KEY,
  userId INT REFERENCES "User"(userId) ON DELETE CASCADE,
  summary TEXT,
  updatedAt TIMESTAMP DEFAULT NOW()
);
