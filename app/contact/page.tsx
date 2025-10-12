"use client";

import { useState } from "react";
import PageLayout from "@/components/PageLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Mail, MessageCircle, ArrowRight } from "lucide-react";

export default function ContactPage() {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    category: "",
    message: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    // TODO: 実際のAPI呼び出しを実装
    // 現在はデモとして2秒待機
    await new Promise(resolve => setTimeout(resolve, 2000));

    setIsSubmitting(false);
    setSubmitted(true);

    // フォームをリセット
    setFormData({
      name: "",
      email: "",
      category: "",
      message: "",
    });
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  return (
    <PageLayout>
      {/* Hero Section */}
      <section className="border-b border-neutral-border bg-gradient-to-b from-primary/5 to-transparent py-20">
        <div className="container">
          <div className="max-w-3xl mx-auto text-center space-y-6">
            <h1 className="text-5xl md:text-6xl font-bold text-neutral-ink">
              お問い合わせ
            </h1>
            <p className="text-xl text-neutral-sub leading-relaxed">
              ご質問、ご要望、不具合報告など、お気軽にお問い合わせください。
            </p>
          </div>
        </div>
      </section>

      {/* Contact Form Section */}
      <section className="py-20">
        <div className="container">
          <div className="max-w-2xl mx-auto">
            <Card className="border-neutral-border shadow-xl">
              <CardContent className="p-8">
                {submitted ? (
                  <div className="text-center space-y-6 py-8">
                    <div className="flex justify-center">
                      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-success/10">
                        <svg className="h-8 w-8 text-success" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <h3 className="text-h2 font-bold text-neutral-ink">
                        送信完了
                      </h3>
                      <p className="text-body text-neutral-sub">
                        お問い合わせありがとうございます。
                        <br />
                        1〜2営業日以内に返信いたします。
                      </p>
                    </div>
                    <Button
                      onClick={() => setSubmitted(false)}
                      variant="outline"
                      className="mt-4"
                    >
                      別のお問い合わせを送信
                    </Button>
                  </div>
                ) : (
                  <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="space-y-2">
                      <label htmlFor="name" className="text-sm font-medium text-neutral-ink">
                        お名前 <span className="text-danger">*</span>
                      </label>
                      <input
                        type="text"
                        id="name"
                        name="name"
                        value={formData.name}
                        onChange={handleChange}
                        required
                        className="w-full px-4 py-3 border border-neutral-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-colors"
                        placeholder="山田 太郎"
                      />
                    </div>

                    <div className="space-y-2">
                      <label htmlFor="email" className="text-sm font-medium text-neutral-ink">
                        メールアドレス <span className="text-danger">*</span>
                      </label>
                      <input
                        type="email"
                        id="email"
                        name="email"
                        value={formData.email}
                        onChange={handleChange}
                        required
                        className="w-full px-4 py-3 border border-neutral-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-colors"
                        placeholder="example@example.com"
                      />
                    </div>

                    <div className="space-y-2">
                      <label htmlFor="category" className="text-sm font-medium text-neutral-ink">
                        お問い合わせ種別 <span className="text-danger">*</span>
                      </label>
                      <select
                        id="category"
                        name="category"
                        value={formData.category}
                        onChange={handleChange}
                        required
                        className="w-full px-4 py-3 border border-neutral-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-colors bg-white"
                      >
                        <option value="">選択してください</option>
                        <option value="general">一般的なお問い合わせ</option>
                        <option value="bug">不具合報告</option>
                        <option value="feature">機能リクエスト</option>
                        <option value="account">アカウントについて</option>
                        <option value="other">その他</option>
                      </select>
                    </div>

                    <div className="space-y-2">
                      <label htmlFor="message" className="text-sm font-medium text-neutral-ink">
                        お問い合わせ内容 <span className="text-danger">*</span>
                      </label>
                      <textarea
                        id="message"
                        name="message"
                        value={formData.message}
                        onChange={handleChange}
                        required
                        rows={6}
                        className="w-full px-4 py-3 border border-neutral-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-colors resize-none"
                        placeholder="お問い合わせ内容をご記入ください"
                      />
                    </div>

                    <div className="pt-4">
                      <Button
                        type="submit"
                        size="lg"
                        disabled={isSubmitting}
                        className="w-full hover-lift shadow-xl shadow-primary/20"
                      >
                        {isSubmitting ? "送信中..." : "送信する"}
                        {!isSubmitting && <ArrowRight className="ml-2 h-5 w-5" />}
                      </Button>
                    </div>

                    <p className="text-xs text-neutral-sub text-center">
                      送信いただいた情報は、
                      <a href="/privacy" className="text-primary hover:text-primary-hover underline underline-offset-4">
                        プライバシーポリシー
                      </a>
                      に基づいて取り扱います。
                    </p>
                  </form>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Other Contact Methods */}
      <section className="border-t border-neutral-border bg-neutral-bg py-20">
        <div className="container">
          <div className="max-w-4xl mx-auto space-y-12">
            <h2 className="text-3xl font-bold text-neutral-ink text-center">
              その他のお問い合わせ方法
            </h2>
            <div className="grid gap-8 md:grid-cols-2">
              <Card className="border-neutral-border hover:border-primary/50 hover:shadow-xl transition-all duration-300">
                <CardContent className="p-8 space-y-6">
                  <div className="flex items-center gap-4">
                    <div className="flex h-16 w-16 items-center justify-center rounded-lg bg-gradient-to-br from-primary/10 to-primary/5">
                      <Mail className="h-8 w-8 text-primary" strokeWidth={1.75} />
                    </div>
                    <h3 className="text-h2 font-bold text-neutral-ink">
                      メール
                    </h3>
                  </div>
                  <p className="text-body text-neutral-sub leading-relaxed">
                    一般的なお問い合わせは、メールでご連絡ください。
                    <br />
                    通常1〜2営業日以内に返信いたします。
                  </p>
                  <div className="pt-4">
                    <a
                      href="mailto:support@castcue.com"
                      className="text-primary hover:text-primary-hover font-medium underline underline-offset-4"
                    >
                      support@castcue.com
                    </a>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-neutral-border hover:border-primary/50 hover:shadow-xl transition-all duration-300">
                <CardContent className="p-8 space-y-6">
                  <div className="flex items-center gap-4">
                    <div className="flex h-16 w-16 items-center justify-center rounded-lg bg-gradient-to-br from-success/10 to-success/5">
                      <MessageCircle className="h-8 w-8 text-success" strokeWidth={1.75} />
                    </div>
                    <h3 className="text-h2 font-bold text-neutral-ink">
                      Discord
                    </h3>
                  </div>
                  <p className="text-body text-neutral-sub leading-relaxed">
                    ベータ版参加者向けのDiscordサーバーで、
                    <br />
                    リアルタイムでサポートを受けられます。
                  </p>
                  <div className="pt-4">
                    <p className="text-small text-neutral-sub">
                      ※招待リンクは登録後にメールでお送りします
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Link */}
      <section className="border-t border-neutral-border bg-neutral-bg py-20">
        <div className="container">
          <div className="max-w-2xl mx-auto text-center space-y-6">
            <h2 className="text-3xl font-bold text-neutral-ink">
              よくある質問もご確認ください
            </h2>
            <p className="text-body text-neutral-sub">
              お問い合わせ前に、FAQページもご確認ください。
              <br />
              多くの疑問はすぐに解決できます。
            </p>
            <a
              href="/faq"
              className="inline-block text-primary hover:text-primary-hover font-medium underline underline-offset-4"
            >
              FAQページを見る →
            </a>
          </div>
        </div>
      </section>

      {/* Response Time */}
      <section className="border-t border-neutral-border py-12">
        <div className="container">
          <div className="max-w-2xl mx-auto">
            <p className="text-small text-neutral-sub text-center">
              ※営業時間：平日 10:00 - 18:00（土日祝日を除く）
              <br />
              ※ベータ版期間中は、個人開発のため返信が遅れる場合がございます。ご了承ください。
            </p>
          </div>
        </div>
      </section>
    </PageLayout>
  );
}
