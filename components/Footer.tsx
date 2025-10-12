import Link from "next/link";

export default function Footer() {
  return (
    <footer className="bg-neutral-surface border-t border-neutral-border">
      <div className="container py-12">
        <div className="grid md:grid-cols-4 gap-8 mb-8">
          <div className="space-y-4">
            <Link href="/">
              <h1 className="text-h2 font-bold text-neutral-ink hover:text-primary transition-colors cursor-pointer">
                CastCue
              </h1>
            </Link>
            <p className="text-small text-neutral-sub">
              配信者のための自動化ツール
            </p>
          </div>

          <div>
            <h4 className="text-sm font-bold text-neutral-ink mb-4">プロダクト</h4>
            <ul className="space-y-2 text-sm text-neutral-sub">
              <li><Link href="/features" className="hover:text-primary transition-colors">機能</Link></li>
              <li><Link href="/pricing" className="hover:text-primary transition-colors">料金</Link></li>
              <li><Link href="/how-to-use" className="hover:text-primary transition-colors">使い方</Link></li>
              <li><Link href="/faq" className="hover:text-primary transition-colors">FAQ</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="text-sm font-bold text-neutral-ink mb-4">会社</h4>
            <ul className="space-y-2 text-sm text-neutral-sub">
              <li><Link href="/about" className="hover:text-primary transition-colors">About</Link></li>
              <li><Link href="/blog" className="hover:text-primary transition-colors">ブログ</Link></li>
              <li><Link href="/careers" className="hover:text-primary transition-colors">採用</Link></li>
              <li><Link href="/contact" className="hover:text-primary transition-colors">お問い合わせ</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="text-sm font-bold text-neutral-ink mb-4">法務</h4>
            <ul className="space-y-2 text-sm text-neutral-sub">
              <li><Link href="/terms" className="hover:text-primary transition-colors">利用規約</Link></li>
              <li><Link href="/privacy" className="hover:text-primary transition-colors">プライバシーポリシー</Link></li>
              <li><Link href="/legal" className="hover:text-primary transition-colors">特定商取引法</Link></li>
            </ul>
          </div>
        </div>

        <div className="pt-8 border-t border-neutral-border flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-small text-neutral-sub">
            &copy; 2025 CastCue. All rights reserved.
          </p>
          <div className="flex gap-6">
            <Link href="#" className="text-neutral-sub hover:text-primary transition-colors">
              <span className="sr-only">Twitter</span>
              <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
              </svg>
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
