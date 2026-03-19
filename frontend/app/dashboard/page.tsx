"use client";

import { useEffect, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
    Train, Plus, Settings, LogOut, Search, Clock, CheckCircle2,
    XCircle, PlayCircle, ChevronRight, Bell, CreditCard, LayoutDashboard, Calendar, Trash2
} from "lucide-react";
import { useAuthStore } from "@/store/authStore";
import api from "@/lib/api";
import { format } from "date-fns";
import { ko } from "date-fns/locale";
import toast from "react-hot-toast";

export default function DashboardPage() {
    const { user, logout } = useAuthStore();
    const [jobs, setJobs] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const router = useRouter();

    useEffect(() => {
        if (!user) {
            router.push("/login");
            return;
        }
        fetchJobs();
    }, [user]);

    const fetchJobs = async () => {
        try {
            const res = await api.get("/api/reservations");
            setJobs(res.data);
        } catch (error) {
            toast.error("예매 목록을 불러오는데 실패했습니다.");
        } finally {
            setIsLoading(false);
        }
    };

    const handleLogout = () => {
        logout();
        router.push("/");
    };

    const handleDelete = async (e: React.MouseEvent, jobId: string) => {
        e.preventDefault();
        e.stopPropagation();

        if (!confirm("정말로 이 예매 작업을 삭제하시겠습니까?\n진행 중인 경우 즉시 중단됩니다.")) return;

        try {
            await api.delete(`/api/reservations/${jobId}`);
            toast.success("예매 작업이 삭제되었습니다.");
            setJobs(prev => prev.filter(j => j.id !== jobId));
        } catch (error) {
            toast.error("삭제에 실패했습니다.");
        }
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case "running":
                return <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 animate-pulse">
                    <PlayCircle size={12} /> 진행 중
                </span>;
            case "success":
                return <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                    <CheckCircle2 size={12} /> 성공
                </span>;
            case "failed":
                return <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">
                    <XCircle size={12} /> 실패
                </span>;
            case "cancelled":
                return <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400">
                    취소됨
                </span>;
            default:
                return <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400">
                    대기 중
                </span>;
        }
    };

    return (
        <div className="flex h-screen bg-slate-50 dark:bg-slate-950">
            {/* Sidebar */}
            <aside className="w-64 border-r bg-white dark:bg-slate-900 hidden lg:flex flex-col">
                <div className="p-6 flex items-center gap-2 mb-8">
                    <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white">
                        <Train size={18} />
                    </div>
                    <span className="text-xl font-bold">RailPass</span>
                </div>

                <nav className="flex-grow px-4 space-y-2">
                    <SidebarLink href="/dashboard" icon={<LayoutDashboard size={20} />} label="대시보드" active />
                    <SidebarLink href="/reserve" icon={<Plus size={20} />} label="새 예매 시작" />
                    <SidebarLink href="/status" icon={<Search size={20} />} label="실시간 현황" />
                    <SidebarLink href="/history" icon={<Clock size={20} />} label="예매 이력" />
                    <SidebarLink href="/settings" icon={<Settings size={20} />} label="설정" />
                </nav>

                <div className="p-4 border-t">
                    <button
                        onClick={handleLogout}
                        className="flex items-center gap-3 px-4 py-3 w-full text-slate-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/10 rounded-xl transition-all"
                    >
                        <LogOut size={20} />
                        <span className="font-medium">로그아웃</span>
                    </button>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-grow overflow-y-auto">
                <header className="h-16 border-b bg-white/70 dark:bg-slate-900/70 backdrop-blur-md sticky top-0 z-40 px-8 flex items-center justify-between">
                    <h1 className="text-xl font-bold">대시보드</h1>
                    <div className="flex items-center gap-4">
                        <button className="p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-all">
                            <Bell size={20} />
                        </button>
                        <div className="flex items-center gap-3 pl-4 border-l">
                            <div className="text-right hidden sm:block">
                                <p className="text-sm font-bold">{user?.name}님</p>
                                <p className="text-xs text-slate-500">{user?.email}</p>
                            </div>
                            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center text-white font-bold">
                                {user?.name?.[0]}
                            </div>
                        </div>
                    </div>
                </header>

                <div className="p-8 max-w-6xl mx-auto">
                    {/* Quick Stats */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
                        <StatCard icon={<Search className="text-blue-600" />} label="현재 진행 중" value={jobs.filter(j => j.status === "running").length} />
                        <StatCard icon={<CheckCircle2 className="text-green-600" />} label="이번 달 예매 성공" value={jobs.filter(j => j.status === "success").length} />
                        <StatCard icon={<CreditCard className="text-purple-600" />} label="결제 대기" value={jobs.filter(j => j.status === "success" && !j.result?.is_paid).length} />
                    </div>

                    {/* Active Reservations */}
                    <section className="mb-10">
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-2xl font-bold">최근 예매 내역</h2>
                            <Link href="/reserve" className="btn-primary flex items-center gap-2">
                                <Plus size={18} /> 새 예매
                            </Link>
                        </div>

                        {isLoading ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {[1, 2].map(n => <div key={n} className="card h-48 animate-pulse bg-slate-100 dark:bg-slate-900" />)}
                            </div>
                        ) : jobs.length > 0 ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {jobs.slice(0, 6).map((job) => (
                                    <Link key={job.id} href={`/status/${job.id}`} className="card hover:border-blue-500/50 transition-all group">
                                        <div className="p-6">
                                            <div className="flex justify-between items-start mb-4">
                                                <div className={`px-3 py-1 rounded-full text-[10px] font-black tracking-widest uppercase ${job.rail_type === 'SRT' ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'}`}>
                                                    {job.rail_type}
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    {getStatusBadge(job.status)}
                                                    <button
                                                        onClick={(e) => handleDelete(e, job.id)}
                                                        className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all"
                                                    >
                                                        <Trash2 size={14} />
                                                    </button>
                                                </div>
                                            </div>

                                            <div className="flex items-center justify-between mb-6">
                                                <div className="text-center flex-1">
                                                    <p className="text-xs text-slate-500 mb-1">출발</p>
                                                    <p className="text-xl font-bold">{job.departure_station}</p>
                                                </div>
                                                <ChevronRight className="text-slate-300 mx-2" />
                                                <div className="text-center flex-1">
                                                    <p className="text-xs text-slate-500 mb-1">도착</p>
                                                    <p className="text-xl font-bold">{job.arrival_station}</p>
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-3 text-sm text-slate-500 border-t pt-4">
                                                <Calendar size={14} />
                                                <span>{format(new Date(job.created_at), "yyyy. MM. dd", { locale: ko })}</span>
                                            </div>
                                        </div>
                                    </Link>
                                ))}
                            </div>
                        ) : (
                            <div className="card p-12 text-center">
                                <Train size={48} className="mx-auto text-slate-200 mb-4" />
                                <p className="text-slate-500 mb-6 font-medium">진행 중인 예매가 없습니다.</p>
                                <Link href="/reserve" className="btn-secondary">첫 예매 시작하기</Link>
                            </div>
                        )}
                    </section>
                </div>
            </main>
        </div>
    );
}

function SidebarLink({ href, icon, label, active = false }: { href: string, icon: ReactNode, label: string, active?: boolean }) {
    return (
        <Link
            href={href}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-medium ${active
                ? "bg-blue-600 text-white shadow-lg shadow-blue-500/30"
                : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                }`}
        >
            {icon}
            <span>{label}</span>
        </Link>
    );
}

function StatCard({ icon, label, value }: { icon: ReactNode, label: string, value: number }) {
    return (
        <div className="card p-6 flex items-center gap-5">
            <div className="w-14 h-14 bg-slate-100 dark:bg-slate-800 rounded-2xl flex items-center justify-center text-2xl">
                {icon}
            </div>
            <div>
                <p className="text-sm font-medium text-slate-500">{label}</p>
                <p className="text-3xl font-black">{value}</p>
            </div>
        </div>
    );
}
