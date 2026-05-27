-- ============================================
-- 豆音自动化视频生成平台 - 数据库建表
-- ============================================

-- 1. 抖音账号表
CREATE TABLE accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  app_id TEXT NOT NULL,
  app_secret TEXT NOT NULL,
  access_token TEXT,
  refresh_token TEXT,
  token_expires_at TIMESTAMPTZ,
  nickname TEXT,
  avatar_url TEXT,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'expired', 'revoked')),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. 视频任务表
CREATE TABLE tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  account_id UUID REFERENCES accounts(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  keywords TEXT[] NOT NULL DEFAULT '{}',
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  progress INTEGER DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
  script TEXT,
  voice_id TEXT,
  audio_url TEXT,
  video_url TEXT,
  cover_url TEXT,
  publish_status TEXT DEFAULT 'draft' CHECK (publish_status IN ('draft', 'published', 'failed')),
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ
);

-- 3. 素材缓存表
CREATE TABLE media_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  keyword TEXT NOT NULL,
  url TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('image', 'video')),
  source TEXT NOT NULL,
  duration INTEGER,
  width INTEGER,
  height INTEGER,
  used_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_media_cache_keyword ON media_cache(keyword);
CREATE INDEX idx_media_cache_type ON media_cache(type);

-- ============================================
-- RLS 安全策略
-- ============================================

-- accounts: 用户只能管理自己的账号
ALTER TABLE accounts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own accounts" ON accounts
  FOR ALL USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- tasks: 用户只能管理自己的任务
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own tasks" ON tasks
  FOR ALL USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- media_cache: 所有认证用户可读
ALTER TABLE media_cache ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can read cache" ON media_cache
  FOR SELECT USING (auth.role() = 'authenticated');

-- ============================================
-- 存储桶创建（在 Supabase 控制台手动操作）
-- ============================================
-- 1. audio   - 音频文件
-- 2. video   - 视频文件
-- 3. covers  - 封面图片