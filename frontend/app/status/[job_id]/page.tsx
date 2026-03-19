"use client";

import { useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import {
    Train, ChevronLeft, Clock, Search, CheckCircle2,
    XCircle, AlertCircle, MapPin, ArrowRight, User,
    CreditCard, Bell, PlayCircle, Loader2, Calendar, Trash2
} from "lucide-react";
import { useAuthStore } from "@/store/authStore";
import api from "@/lib/api";
import { format } from "date-fns";
import { ko } from "date-fns/locale";
import toast from "react-hot-toast";

export default function StatusPage() {
    const { job_id } = useParams();
    const { user } = useAuthStore();
    const [job, setJob] = useState<any>(null);
    const [attempts, setAttempts] = useState(0);
    const [status, setStatus] = useState<string>("PENDING");
    const [logs, setLogs] = useState<any[]>([]);
    const [elapsedTime, setElapsedTime] = useState(0);
    const socketRef = useRef<WebSocket | null>(null);
    const router = useRouter();

    useEffect(() => {
        if (!user) {
            router.push("/login");
            return;
        }
        fetchJobDetail();

        // Timer for elapsed time
        const timer = setInterval(() => {
            if (status.toUpperCase() === "RUNNING") {
                setElapsedTime(prev => prev + 1);
            }
        }, 1000);

        return () => {
            clearInterval(timer);
            if (socketRef.current) socketRef.current.close();
        };
    }, [job_id, user, status]);

    const fetchJobDetail = async () => {
        try {
            const res = await api.get(`/api/reservations/${job_id}`);
            setJob(res.data);
            setStatus(res.data.status);
            setAttempts(res.data.attempts || 0);

            // Connect WebSocket
            connectWebSocket();
        } catch (error) {
            toast.error("예매 정보를 불러오는데 실패했습니다.");
        }
    };

    const connectWebSocket = () => {
        const token = localStorage.getItem("access_token");
        const wsBaseUrl = process.env.NEXT_PUBLIC_WS_URL || (typeof window !== 'undefined' ? `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}` : 'ws://localhost');
        const wsUrl = `${wsBaseUrl}/api/reservations/ws/${job_id}${token ? `?token=${token}` : ""}`;

        console.log("Connecting to WebSocket:", wsUrl);
        const socket = new WebSocket(wsUrl);

        socket.onopen = () => {
            console.log("WebSocket connected");
        };

        socket.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                console.log("WebSocket message received:", data);

                // Backend sends data without 'type' field directly from Redis
                if (data.status) {
                    const normalizedStatus = data.status.toUpperCase();
                    setStatus(normalizedStatus);
                    setAttempts(data.try_count || 0);
                    setElapsedTime(data.elapsed_seconds || 0);

                    if (data.message) {
                        setLogs(prev => {
                            // 중복 로그 방지 (메시지와 시간이 동일한 경우)
                            const lastLog = prev[prev.length - 1];
                            if (lastLog && lastLog.message === data.message) return prev;

                            return [...prev, {
                                time: new Date().toISOString(),
                                message: data.message,
                                type: normalizedStatus === 'SUCCESS' ? 'success' : normalizedStatus === 'FAILED' ? 'error' : 'info'
                            }];
                        });
                    }

                    if (normalizedStatus === "SUCCESS") {
                        toast.success("예매성공! 결제를 진행해 주세요.");
                    }
                }
            } catch (err) {
                console.error("Error parsing WebSocket message:", err);
            }
        };

        socket.onerror = (error) => {
            console.error("WebSocket error:", error);
        };

        socket.onclose = (event) => {
            console.log("WebSocket closed:", event.code, event.reason);
            // 인증 에러 등으로 닫힌 경우 재연결 시도하지 않음
            if (event.code !== 4001) {
                setTimeout(() => {
                    const currentStatus = status.toUpperCase();
                    if (currentStatus === "RUNNING" || currentStatus === "PENDING") {
                        connectWebSocket();
                    }
                }, 3000);
            }
        };

        socketRef.current = socket;
    };

    const handleCancel = async () => {
        if (!confirm("정말로 이 예매 요청을 취소하시겠습니까?")) return;

        try {
            await api.delete(`/api/reservations/${job_id}`);
            setStatus("CANCELLED");
            toast.success("취소 요청을 보냈습니다.");
        } catch (error) {
            toast.error("취소에 실패했습니다.");
        }
    };

    const handleDelete = async () => {
        if (!confirm("정말로 이 예매 작업을 삭제하시겠습니까?\n모든 기록이 DB에서 영구적으로 삭제됩니다.")) return;

        try {
            await api.delete(`/api/reservations/${job_id}`);
            toast.success("예매 작업이 삭제되었습니다.");
            router.push("/dashboard");
        } catch (error) {
            toast.error("삭제에 실패했습니다.");
        }
    };

    const formatSeconds = (s: number) => {
        const mins = Math.floor(s / 60);
        const secs = s % 60;
        return `${mins}분 ${secs}초`;
    };

    if (!job) return (
        <div className="flex items-center justify-center h-screen">
            <Loader2 className="animate-spin text-blue-600" size={48} />
        </div>
    );

    const upperStatus = status.toUpperCase();

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-4 md:p-8">
            <div className="max-w-4xl mx-auto">
                <button
                    onClick={() => router.push('/dashboard')}
                    className="flex items-center gap-2 text-slate-500 hover:text-slate-800 mb-8 transition-colors"
                >
                    <ChevronLeft size={20} /> 대시보드로 돌아가기
                </button>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Left: Main Status */}
                    <div className="lg:col-span-2 space-y-8">
                        <div className="card overflow-hidden">
                            <div className={`p-1 text-center text-[10px] font-black tracking-[0.2em] text-white uppercase ${upperStatus === 'RUNNING' ? 'bg-blue-600 animate-pulse' : upperStatus === 'SUCCESS' ? 'bg-green-600' : 'bg-slate-600'}`}>
                                {upperStatus === 'RUNNING' ? 'Active Reservation in Progress' : 'Reservation Session'}
                            </div>
                            <div className="p-8">
                                <div className="flex justify-between items-center mb-10">
                                    <div className="flex items-center gap-4">
                                        <div className={`w-16 h-16 rounded-2xl flex items-center justify-center text-3xl ${job.rail_type === 'SRT' ? 'bg-red-50 text-red-600' : 'bg-blue-50 text-blue-600'}`}>
                                            <Train size={32} />
                                        </div>
                                        <div>
                                            <h2 className="text-2xl font-black">{job.rail_type} 자동 예매</h2>
                                            <p className="text-slate-500 font-medium">Job ID: {job_id?.toString().slice(0, 8)}</p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        {upperStatus === 'RUNNING' ? (
                                            <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-100 text-blue-700 font-bold animate-bounce">
                                                <PlayCircle size={16} /> 탐색 중
                                            </span>
                                        ) : upperStatus === 'SUCCESS' ? (
                                            <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-green-100 text-green-700 font-bold">
                                                <CheckCircle2 size={16} /> 성공
                                            </span>
                                        ) : (
                                            <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-slate-100 text-slate-700 font-bold">
                                                {upperStatus === 'CANCELLED' ? '취소됨' : '대기 중'}
                                            </span>
                                        )}
                                    </div>
                                </div>

                                <div className="flex items-center justify-between p-8 bg-slate-50 dark:bg-slate-900 rounded-3xl mb-8 relative">
                                    <div className="text-center z-10">
                                        <p className="text-sm text-slate-400 font-semibold mb-2">출발</p>
                                        <p className="text-3xl font-black">{job.departure_station}</p>
                                    </div>
                                    <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-1/3 flex items-center gap-2">
                                        <div className="h-[2px] flex-grow bg-slate-200 dark:bg-slate-800"></div>
                                        <ArrowRight className="text-slate-300" />
                                        <div className="h-[2px] flex-grow bg-slate-200 dark:bg-slate-800"></div>
                                    </div>
                                    <div className="text-center z-10">
                                        <p className="text-sm text-slate-400 font-semibold mb-2">도착</p>
                                        <p className="text-3xl font-black">{job.arrival_station}</p>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="p-4 rounded-2xl border border-slate-100 dark:border-slate-800 flex items-center gap-4">
                                        <Clock className="text-slate-400" size={20} />
                                        <div>
                                            <p className="text-xs text-slate-400 font-bold">경과 시간</p>
                                            <p className="font-bold">{formatSeconds(elapsedTime)}</p>
                                        </div>
                                    </div>
                                    <div className="p-4 rounded-2xl border border-slate-100 dark:border-slate-800 flex items-center gap-4">
                                        <Search className="text-slate-400" size={20} />
                                        <div>
                                            <p className="text-xs text-slate-400 font-bold">시도 횟수</p>
                                            <p className="font-bold text-blue-600">{attempts}회</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Logs */}
                        <div className="card p-8">
                            <h3 className="text-lg font-bold mb-6 flex items-center gap-2">
                                <Search size={18} /> 실시간 로그
                            </h3>
                            <div className="space-y-3 max-h-60 overflow-y-auto pr-2 font-mono text-xs">
                                {logs.length > 0 ? logs.map((log, i) => (
                                    <div key={i} className="flex gap-3 py-2 border-b border-slate-50 dark:border-slate-800">
                                        <span className="text-slate-400 shrink-0">{format(new Date(log.time), "HH:mm:ss")}</span>
                                        <span className={log.type === 'success' ? 'text-green-600 font-bold' : log.type === 'error' ? 'text-red-500' : 'text-slate-600 dark:text-slate-400'}>
                                            {log.message}
                                        </span>
                                    </div>
                                )) : (
                                    <div className="text-center py-10 text-slate-400 bg-slate-50 dark:bg-slate-900 rounded-2xl italic">
                                        실시간 로그 대기 중...
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Right: Info Panels */}
                    <div className="space-y-6">
                        <div className="card p-6">
                            <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-6">예약 세부 설정</h3>
                            <div className="space-y-6">
                                <InfoItem icon={<Calendar size={16} />} label="날짜" value={job.travel_date} />
                                <InfoItem icon={<Clock size={16} />} label="시간대" value={job.time_slots.join(', ')} />
                                <InfoItem icon={<User size={16} />} label="승객" value={`성인 ${job.passengers.adult}`} />
                                <InfoItem icon={<CreditCard size={16} />} label="자동결제" value={job.auto_pay ? "사용함" : "사용 안함"} />
                            </div>
                        </div>

                        {upperStatus === 'RUNNING' && (
                            <button
                                onClick={handleCancel}
                                className="w-full py-4 rounded-2xl bg-white border-2 border-red-50 text-red-600 font-bold hover:bg-red-50 transition-all flex items-center justify-center gap-2"
                            >
                                <XCircle size={20} /> 예매 중단하기
                            </button>
                        )}

                        <button
                            onClick={handleDelete}
                            className="w-full py-4 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/10 transition-all font-bold flex items-center justify-center gap-2"
                        >
                            <Trash2 size={20} /> 예매 내역 완전히 삭제
                        </button>

                        <div className="bg-blue-600 p-8 rounded-[2rem] text-white shadow-xl shadow-blue-500/20">
                            <Bell className="mb-4" size={24} />
                            <h3 className="text-xl font-bold mb-2">알림 설정됨</h3>
                            <p className="text-blue-100 text-sm leading-relaxed">
                                예매가 성공하면 설정하신 텔레그램/디스코드 채널로 즉시 알림을 보내드립니다.
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

function InfoItem({ icon, label, value }: { icon: React.ReactNode, label: string, value: string }) {
    return (
        <div className="flex gap-4">
            <div className="shrink-0 text-slate-300 mt-1">{icon}</div>
            <div>
                <p className="text-xs text-slate-400 font-bold">{label}</p>
                <p className="text-sm font-medium">{value}</p>
            </div>
        </div>
    );
}
