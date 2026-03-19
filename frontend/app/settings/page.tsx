"use client";

import { useEffect, useState, type ReactNode } from "react";
import {
    User, Train, Bell, CreditCard, Shield, ChevronLeft,
    Eye, EyeOff, Save, Key, CheckCircle2, MessageCircle, AlertCircle
} from "lucide-react";
import api from "@/lib/api";
import toast from "react-hot-toast";
import Link from "next/link";
import { useAuthStore } from "@/store/authStore";
import { useRouter } from "next/navigation";

export default function SettingsPage() {
    const { user } = useAuthStore();
    const router = useRouter();

    const [activeTab, setActiveTab] = useState("accounts");
    const [isLoading, setIsLoading] = useState(false);

    // Form states
    const [srtAccount, setSrtAccount] = useState({ id: "", password: "" });
    const [ktxAccount, setKtxAccount] = useState({ id: "", password: "" });
    const [telegram, setTelegram] = useState({ token: "", chat_id: "" });
    const [discord, setDiscord] = useState({ webhook_url: "" });
    const [card, setCard] = useState({ number: "", password: "", birthday: "", expire: "" });

    const [showPassword, setShowPassword] = useState<Record<string, boolean>>({});

    useEffect(() => {
        if (!user) {
            router.push("/login");
            return;
        }
        fetchSettings();
    }, [user]);

    const fetchSettings = async () => {
        try {
            // 알림 설정 가져오기
            const notifRes = await api.get("/api/users/notifications");
            notifRes.data.forEach((s: any) => {
                const type = s.type?.toUpperCase();
                if (type === "TELEGRAM") {
                    setTelegram({
                        token: s.telegram_token ? "******** (저장됨)" : "",
                        chat_id: s.telegram_chat_id || ""
                    });
                } else if (type === "DISCORD") {
                    setDiscord({
                        webhook_url: s.discord_webhook_url ? "https://discord.com/api/webhooks/********" : ""
                    });
                }
            });

            // 카드 정보 존재 여부 확인
            const cardRes = await api.get("/api/users/card");
            if (cardRes.data.has_card) {
                // ... 기존 정보 표시 로직 (필요시)
            }
        } catch (error) {
            console.error("Failed to fetch settings", error);
        }
    };

    const toggleVisibility = (id: string) => {
        setShowPassword(prev => ({ ...prev, [id]: !prev[id] }));
    };

    const handleSaveAccount = async (type: "SRT" | "KTX") => {
        const data = type === "SRT" ? srtAccount : ktxAccount;
        if (!data.id || !data.password) {
            toast.error("아이디와 비밀번호를 모두 입력해주세요.");
            return;
        }

        setIsLoading(true);
        try {
            await api.put("/api/users/rail-accounts", {
                rail_type: type,
                account_id: data.id,
                account_password: data.password
            });
            toast.success(`${type} 계정 정보가 저장되었습니다.`);
            if (type === "SRT") setSrtAccount({ id: "", password: "" });
            else setKtxAccount({ id: "", password: "" });
        } catch (error) {
            toast.error("저장에 실패했습니다.");
        } finally {
            setIsLoading(false);
        }
    };

    const handleSaveTelegram = async () => {
        setIsLoading(true);
        try {
            await api.put("/api/users/notifications/telegram", telegram);
            toast.success("텔레그램 설정이 저장되었습니다.");
        } catch (error) {
            toast.error("저장에 실패했습니다.");
        } finally {
            setIsLoading(false);
        }
    };

    const handleSaveDiscord = async () => {
        if (!discord.webhook_url) {
            toast.error("웹훅 URL을 입력해주세요.");
            return;
        }
        setIsLoading(true);
        try {
            await api.put("/api/users/notifications/discord", discord);
            toast.success("디스코드 설정이 저장되었습니다.");
        } catch (error) {
            toast.error("저장에 실패했습니다.");
        } finally {
            setIsLoading(false);
        }
    };

    const handleSaveCard = async () => {
        try {
            await api.put("/api/users/card", {
                card_number: card.number,
                card_password: card.password,
                birthday: card.birthday,
                expire_date: card.expire
            });
            toast.success("카드 정보가 저장되었습니다.");
        } catch (error) {
            toast.error("저장에 실패했습니다.");
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-4 md:p-8">
            <div className="max-w-4xl mx-auto">
                <header className="mb-10">
                    <Link href="/dashboard" className="inline-flex items-center text-sm text-slate-500 hover:text-blue-600 mb-2">
                        <ChevronLeft size={16} /> 대시보드
                    </Link>
                    <h1 className="text-4xl font-black tracking-tight">설정</h1>
                </header>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
                    {/* Tabs */}
                    <aside className="space-y-2">
                        <TabLink active={activeTab === 'accounts'} onClick={() => setActiveTab('accounts')} icon={<Train size={18} />} label="기차 계정" />
                        <TabLink active={activeTab === 'notifications'} onClick={() => setActiveTab('notifications')} icon={<Bell size={18} />} label="알림 설정" />
                        <TabLink active={activeTab === 'card'} onClick={() => setActiveTab('card')} icon={<CreditCard size={18} />} label="결제 카드" />
                        <TabLink active={activeTab === 'security'} onClick={() => setActiveTab('security')} icon={<Shield size={18} />} label="보안" />
                    </aside>

                    {/* Tab Content */}
                    <main className="md:col-span-3 space-y-8">
                        {activeTab === 'accounts' && (
                            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
                                <section className="card p-8">
                                    <div className="flex items-center gap-3 mb-6">
                                        <div className="w-10 h-10 bg-red-100 text-red-600 rounded-xl flex items-center justify-center">
                                            <Train size={24} />
                                        </div>
                                        <h2 className="text-xl font-bold">SRT 계정 설정</h2>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                                        <input
                                            className="input-field" placeholder="멤버십 번호 / 이메일 / 전화번호"
                                            value={srtAccount.id} onChange={e => setSrtAccount({ ...srtAccount, id: e.target.value })}
                                        />
                                        <div className="relative">
                                            <input
                                                type={showPassword.srt ? "text" : "password"}
                                                className="input-field pr-12" placeholder="비밀번호"
                                                value={srtAccount.password} onChange={e => setSrtAccount({ ...srtAccount, password: e.target.value })}
                                            />
                                            <button onClick={() => toggleVisibility('srt')} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400">
                                                {showPassword.srt ? <EyeOff size={18} /> : <Eye size={18} />}
                                            </button>
                                        </div>
                                    </div>
                                    <button onClick={() => handleSaveAccount("SRT")} className="btn-primary w-full md:w-auto px-8 py-3 flex items-center gap-2">
                                        <Save size={18} /> SRT 정보 저장
                                    </button>
                                </section>

                                <section className="card p-8">
                                    <div className="flex items-center gap-3 mb-6">
                                        <div className="w-10 h-10 bg-blue-100 text-blue-600 rounded-xl flex items-center justify-center">
                                            <Train size={24} />
                                        </div>
                                        <h2 className="text-xl font-bold">KTX 계정 설정</h2>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                                        <input
                                            className="input-field" placeholder="멤버십 번호"
                                            value={ktxAccount.id} onChange={e => setKtxAccount({ ...ktxAccount, id: e.target.value })}
                                        />
                                        <div className="relative">
                                            <input
                                                type={showPassword.ktx ? "text" : "password"}
                                                className="input-field pr-12" placeholder="비밀번호"
                                                value={ktxAccount.password} onChange={e => setKtxAccount({ ...ktxAccount, password: e.target.value })}
                                            />
                                            <button onClick={() => toggleVisibility('ktx')} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400">
                                                {showPassword.ktx ? <EyeOff size={18} /> : <Eye size={18} />}
                                            </button>
                                        </div>
                                    </div>
                                    <button onClick={() => handleSaveAccount("KTX")} className="btn-primary w-full md:w-auto px-8 py-3 flex items-center gap-2">
                                        <Save size={18} /> KTX 정보 저장
                                    </button>
                                </section>
                            </div>
                        )}

                        {activeTab === 'notifications' && (
                            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
                                <section className="card p-8">
                                    <div className="flex items-center gap-3 mb-6">
                                        <div className="w-10 h-10 bg-sky-100 text-sky-600 rounded-xl flex items-center justify-center">
                                            <MessageCircle size={24} />
                                        </div>
                                        <h3 className="text-xl font-bold">텔레그램 (Telegram)</h3>
                                    </div>
                                    <div className="space-y-4 mb-6">
                                        <input
                                            className="input-field" placeholder="Bot Token"
                                            value={telegram.token} onChange={e => setTelegram({ ...telegram, token: e.target.value })}
                                        />
                                        <input
                                            className="input-field" placeholder="Chat ID"
                                            value={telegram.chat_id} onChange={e => setTelegram({ ...telegram, chat_id: e.target.value })}
                                        />
                                    </div>
                                    <button onClick={handleSaveTelegram} className="btn-primary w-full md:w-auto px-8 py-3">설정 저장</button>
                                </section>

                                <section className="card p-8">
                                    <div className="flex items-center gap-3 mb-6">
                                        <div className="w-10 h-10 bg-indigo-100 text-indigo-600 rounded-xl flex items-center justify-center">
                                            <Bell size={24} />
                                        </div>
                                        <h3 className="text-xl font-bold">디스코드 (Discord)</h3>
                                    </div>
                                    <input
                                        className="input-field mb-6" placeholder="Webhook URL"
                                        value={discord.webhook_url} onChange={e => setDiscord({ webhook_url: e.target.value })}
                                    />
                                    <button onClick={handleSaveDiscord} className="btn-primary w-full md:w-auto px-8 py-3">설정 저장</button>
                                </section>
                            </div>
                        )}

                        {activeTab === 'card' && (
                            <section className="card p-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
                                <div className="flex items-center gap-3 mb-6">
                                    <div className="w-10 h-10 bg-purple-100 text-purple-600 rounded-xl flex items-center justify-center">
                                        <CreditCard size={24} />
                                    </div>
                                    <h3 className="text-xl font-bold">자동 결제 카드</h3>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                                    <div className="md:col-span-2 space-y-2">
                                        <label className="text-xs font-bold text-slate-400 uppercase tracking-widest leading-none">카드 번호 (- 제외)</label>
                                        <input
                                            className="input-field py-4 text-lg font-mono tracking-widest" placeholder="0000 0000 0000 0000"
                                            value={card.number} onChange={e => setCard({ ...card, number: e.target.value })}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-xs font-bold text-slate-400 uppercase tracking-widest leading-none">비밀번호 앞 2자리</label>
                                        <input type="password" className="input-field py-4" placeholder="**" maxLength={2} value={card.password} onChange={e => setCard({ ...card, password: e.target.value })} />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-xs font-bold text-slate-400 uppercase tracking-widest leading-none">생년월일 / 사업자번호</label>
                                        <input className="input-field py-4" placeholder="YYMMDD" value={card.birthday} onChange={e => setCard({ ...card, birthday: e.target.value })} />
                                    </div>
                                    <div className="space-y-2 md:col-span-2">
                                        <label className="text-xs font-bold text-slate-400 uppercase tracking-widest leading-none">유효기간</label>
                                        <input className="input-field py-4" placeholder="YYYYMM" value={card.expire} onChange={e => setCard({ ...card, expire: e.target.value })} />
                                    </div>
                                </div>
                                <button onClick={handleSaveCard} className="btn-primary w-full py-4 text-lg font-bold">기밀 정보 저장 및 활성화</button>
                                <div className="mt-4 flex items-center gap-2 text-xs text-slate-500 justify-center">
                                    <Shield size={14} /> 모든 정보는 AES-256 비트 암호화로 안전하게 관리됩니다.
                                </div>
                            </section>
                        )}
                    </main>
                </div>
            </div>
        </div>
    );
}

function TabLink({ active, onClick, icon, label }: { active: boolean, onClick: () => void, icon: ReactNode, label: string }) {
    return (
        <button
            onClick={onClick}
            className={`flex items-center gap-3 px-5 py-3 w-full rounded-xl transition-all font-bold ${active
                ? "bg-blue-600 text-white shadow-lg shadow-blue-500/20 translate-x-1"
                : "text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
                }`}
        >
            {icon}
            <span>{label}</span>
        </button>
    );
}
