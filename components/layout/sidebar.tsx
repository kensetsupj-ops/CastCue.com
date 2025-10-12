"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  LayoutDashboard,
  FileText,
  Radio,
  FileEdit,
  Plug,
  Settings,
  LogOut,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import Image from "next/image";

const navigation = [
  { name: "ダッシュボード", href: "/dashboard", icon: LayoutDashboard },
  { name: "レポート", href: "/reports", icon: FileText },
  { name: "配信一覧", href: "/streams", icon: Radio },
  { name: "テンプレート", href: "/templates", icon: FileEdit },
  { name: "連携", href: "/integrations", icon: Plug },
  { name: "設定", href: "/settings", icon: Settings },
];

interface Profile {
  display_name: string;
  login: string;
  profile_image_url: string;
  email?: string;
}

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    async function loadProfile() {
      try {
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
          router.push('/login');
          return;
        }

        // プロフィール情報を取得
        const { data: profileData } = await supabase
          .from('profiles')
          .select('display_name, login, profile_image_url, email')
          .eq('user_id', user.id)
          .single();

        if (profileData) {
          setProfile(profileData);
        }
      } catch (error) {
        console.error('プロフィール取得エラー:', error);
      } finally {
        setLoading(false);
      }
    }

    loadProfile();
  }, [supabase, router]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/');
  };

  return (
    <div className="fixed left-0 top-0 h-screen w-[280px] border-r border-neutral-border bg-neutral-surface">
      <div className="flex h-full flex-col">
        {/* Logo */}
        <div className="flex h-16 items-center border-b border-neutral-border px-6">
          <h1 className="text-h2 font-bold text-neutral-ink">CastCue</h1>
        </div>


        {/* Navigation */}
        <nav className="flex-1 space-y-1 overflow-y-auto p-3">
          {navigation.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.name}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-sm px-3 py-2.5 text-sm font-medium transition-ui",
                  isActive
                    ? "bg-primary/10 text-primary"
                    : "text-neutral-sub hover:bg-neutral-bg hover:text-neutral-ink"
                )}
              >
                <item.icon className="h-5 w-5" strokeWidth={1.75} />
                {item.name}
              </Link>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="border-t border-neutral-border p-4">
          {loading ? (
            <div className="flex items-center gap-3 rounded-sm p-2">
              <div className="h-8 w-8 rounded-full bg-neutral-border animate-pulse" />
              <div className="flex-1 min-w-0 space-y-2">
                <div className="h-3 bg-neutral-border rounded animate-pulse w-24" />
                <div className="h-2 bg-neutral-border rounded animate-pulse w-32" />
              </div>
            </div>
          ) : profile ? (
            <div className="space-y-2">
              <div className="flex items-center gap-3 rounded-sm p-2 hover:bg-neutral-bg transition-ui">
                {profile.profile_image_url ? (
                  <Image
                    src={profile.profile_image_url}
                    alt={profile.display_name}
                    width={32}
                    height={32}
                    className="h-8 w-8 rounded-full"
                  />
                ) : (
                  <div className="h-8 w-8 rounded-full bg-primary flex items-center justify-center text-white text-sm font-medium">
                    {profile.display_name?.[0]?.toUpperCase() || 'U'}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-neutral-ink truncate">
                    {profile.display_name}
                  </p>
                  <p className="text-xs text-neutral-sub truncate">
                    @{profile.login}
                  </p>
                </div>
              </div>
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-2 rounded-sm px-3 py-2 text-sm font-medium text-neutral-sub hover:bg-neutral-bg hover:text-danger transition-ui"
              >
                <LogOut className="h-4 w-4" />
                ログアウト
              </button>
            </div>
          ) : (
            <div className="text-center text-sm text-neutral-sub">
              プロフィール読み込みエラー
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
