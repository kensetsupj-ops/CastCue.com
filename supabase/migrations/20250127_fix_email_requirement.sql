-- メールアドレスを必須でなくする（Twitchログイン対応）
ALTER TABLE profiles
ALTER COLUMN email DROP NOT NULL;

-- emailカラムが存在しない場合は追加（NULL許可）
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT column_name
        FROM information_schema.columns
        WHERE table_name = 'profiles'
        AND column_name = 'email'
    ) THEN
        ALTER TABLE profiles ADD COLUMN email TEXT;
    END IF;
END $$;