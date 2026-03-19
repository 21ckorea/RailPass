"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Train, Mail, Lock, ArrowRight, Loader2 } from "lucide-react";
import api from "@/lib/api";
import { useAuthStore } from "@/store/authStore";
import toast from "react-hot-toast";

export default function LoginPage() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const router = useRouter();
    const setAuth = useAuthStore((state) => state.setAuth);

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        setIsLoading(true);

        try {
            const res = await api.post("/api/auth/login", { email, password });
            const { access_token, refresh_token } = res.data;

            // Get user info
            const userRes = await api.get("/api/auth/me", {
                headers: { Authorization: `Bearer ${access_token}` }
            });

            setAuth(userRes.data, access_token, refresh_token);
            toast.success("로그인 성공!");
            router.push("/dashboard");
        } catch (error: any) {
            toast.error(error.response?.data?.detail || "로그인에 실패했습니다.");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center p-4">
            <div className="max-w-md w-full">
                <div className="text-center mb-10">
                    <Link href="/" className="inline-flex items-center gap-2 mb-6">
                        <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center text-white shadow-xl shadow-blue-500/20">
                            <Train size={28} />
                        </div>
                    </Link>
                    <h1 className="text-3xl font-bold tracking-tight">환영합니다</h1>
                    <p className="text-slate-500 mt-2">RailPass 계정으로 로그인하세요</p>
                </div>

                <div className="card p-8 shadow-xl shadow-slate-200/50 dark:shadow-none">
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="space-y-2">
                            <label className="text-sm font-semibold flex items-center gap-2">
                                <Mail size={16} className="text-slate-400" />
                                이메일
                            </label>
                            <input
                                type="email"
                                required
                                className="input-field"
                                placeholder="example@email.com"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-semibold flex items-center gap-2">
                                <Lock size={16} className="text-slate-400" />
                                비밀번호
                            </label>
                            <input
                                type="password"
                                required
                                className="input-field"
                                placeholder="••••••••"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={isLoading}
                            className="btn-primary w-full py-3 flex items-center justify-center gap-2 text-lg"
                        >
                            {isLoading ? (
                                <Loader2 className="animate-spin" size={20} />
                            ) : (
                                <>
                                    로그인
                                    <ArrowRight size={20} />
                                </>
                            )}
                        </button>
                    </form>

                    <div className="mt-8 pt-6 border-t text-center">
                        <p className="text-sm text-slate-500">
                            계정이 없으신가요?{" "}
                            <Link href="/register" className="text-blue-600 font-bold hover:underline">
                                회원가입
                            </Link>
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
