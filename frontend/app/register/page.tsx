"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Train, Mail, Lock, User, ArrowRight, Loader2 } from "lucide-react";
import api from "@/lib/api";
import toast from "react-hot-toast";

export default function RegisterPage() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [name, setName] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const router = useRouter();

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        setIsLoading(true);

        try {
            await api.post("/api/auth/register", { email, password, name });
            toast.success("회원가입 성공! 로그인해주세요.");
            router.push("/login");
        } catch (error: any) {
            toast.error(error.response?.data?.detail || "회원가입에 실패했습니다.");
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
                    <h1 className="text-3xl font-bold tracking-tight">계정 만들기</h1>
                    <p className="text-slate-500 mt-2">RailPass와 함께 편안한 예매를 시작하세요</p>
                </div>

                <div className="card p-8 shadow-xl shadow-slate-200/50 dark:shadow-none">
                    <form onSubmit={handleSubmit} className="space-y-5">
                        <div className="space-y-2">
                            <label className="text-sm font-semibold flex items-center gap-2">
                                <User size={16} className="text-slate-400" />
                                이름
                            </label>
                            <input
                                type="text"
                                required
                                className="input-field"
                                placeholder="홍길동"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                            />
                        </div>
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
                                placeholder="8자 이상 입력"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={isLoading}
                            className="btn-primary w-full py-3 flex items-center justify-center gap-2 text-lg mt-4"
                        >
                            {isLoading ? (
                                <Loader2 className="animate-spin" size={20} />
                            ) : (
                                <>
                                    가입하기
                                    <ArrowRight size={20} />
                                </>
                            )}
                        </button>
                    </form>

                    <div className="mt-8 pt-6 border-t text-center">
                        <p className="text-sm text-slate-500">
                            이미 계정이 있으신가요?{" "}
                            <Link href="/login" className="text-blue-600 font-bold hover:underline">
                                로그인
                            </Link>
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
