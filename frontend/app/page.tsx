import React from "react";
import Link from "next/link";
import { Train, Calendar, User, Clock, Bell, ChevronRight, Play } from "lucide-react";

export default function HomePage() {
    return (
        <div className="flex flex-col min-h-screen">
            {/* Header */}
            <header className="border-b bg-white dark:bg-slate-900 sticky top-0 z-50">
                <div className="container mx-auto px-4 h-16 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-blue-500/20">
                            <Train size={24} />
                        </div>
                        <span className="text-xl font-bold tracking-tight">RailPass</span>
                    </div>
                    <nav className="hidden md:flex items-center gap-6">
                        <Link href="/reserve" className="text-sm font-medium hover:text-blue-600">예매하기</Link>
                        <Link href="/status" className="text-sm font-medium hover:text-blue-600">현황</Link>
                        <Link href="/settings" className="text-sm font-medium hover:text-blue-600">설정</Link>
                    </nav>
                    <div className="flex items-center gap-3">
                        <Link href="/login" className="btn-secondary text-sm">로그인</Link>
                        <Link href="/register" className="btn-primary text-sm px-5">시작하기</Link>
                    </div>
                </div>
            </header>

            {/* Hero Section */}
            <main className="flex-grow">
                <section className="py-20 px-4">
                    <div className="container mx-auto max-w-5xl text-center">
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 text-xs font-bold mb-6 border border-blue-100 dark:border-blue-800">
                            <span className="relative flex h-2 w-2">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
                            </span>
                            SMART RESERVATION SYSTEM
                        </div>
                        <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight mb-8">
                            원하는 기차표, <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">알아서 척척</span>
                        </h1>
                        <p className="text-xl text-slate-500 dark:text-slate-400 mb-10 max-w-2xl mx-auto leading-relaxed">
                            SRT, KTX 예매 경쟁에서 벗어나세요. <br />
                            시간과 인원을 선택하면 취소표가 나올 때까지 자동으로 시도하고 알림을 보내드립니다.
                        </p>
                        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                            <Link href="/reserve" className="btn-primary py-4 px-8 text-lg flex items-center gap-2 group">
                                지금 예매 시작하기
                                <ChevronRight size={20} className="group-hover:translate-x-1 transition-transform" />
                            </Link>
                            <Link href="/about" className="btn-secondary py-4 px-8 text-lg flex items-center gap-2">
                                <Play size={18} fill="currentColor" />
                                사용 방법 보기
                            </Link>
                        </div>
                    </div>
                </section>

                {/* Feature Section */}
                <section className="py-20 bg-white dark:bg-slate-900/50">
                    <div className="container mx-auto px-4">
                        <h2 className="text-3xl font-bold text-center mb-16">주요 기능</h2>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                            <FeatureCard
                                icon={<Clock className="text-blue-600" />}
                                title="무한 재시도"
                                description="특수 알고리즘을 사용하여 취소표가 나올 때까지 지능적으로 예매를 시도합니다."
                            />
                            <FeatureCard
                                icon={<Bell className="text-indigo-600" />}
                                title="즉시 알림"
                                description="예매 성공 시 텔레그램이나 디스코드로 즉시 결과를 전송해 드립니다."
                            />
                            <FeatureCard
                                icon={<User className="text-purple-600" />}
                                title="사용자 맞춤 설정"
                                description="다양한 인원 정보와 좌석 선호도를 설정하여 나만의 맞춤 예매를 실행합니다."
                            />
                        </div>
                    </div>
                </section>
            </main>

            {/* Footer */}
            <footer className="border-t py-12 bg-slate-50 dark:bg-slate-950">
                <div className="container mx-auto px-4 text-center">
                    <div className="flex items-center justify-center gap-2 mb-4 opacity-50">
                        <Train size={20} />
                        <span className="font-bold">RailPass</span>
                    </div>
                    <p className="text-sm text-slate-500">© 2026 RailPass System. All rights reserved.</p>
                </div>
            </footer>
        </div>
    );
}

function FeatureCard({ icon, title, description }: { icon: React.ReactNode, title: string, description: string }) {
    return (
        <div className="card p-8 hover:border-blue-500/30 transition-colors group">
            <div className="w-12 h-12 bg-slate-100 dark:bg-slate-800 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                {icon}
            </div>
            <h3 className="text-xl font-bold mb-3">{title}</h3>
            <p className="text-slate-500 dark:text-slate-400 leading-relaxed">{description}</p>
        </div>
    );
}
