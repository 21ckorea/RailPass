"use client";

import { useState, useEffect, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import {
    Train, MapPin, Calendar as CalendarIcon, Clock, Users,
    Armchair, CreditCard, ArrowRight, Loader2, ChevronLeft, Search
} from "lucide-react";
import { useAuthStore } from "@/store/authStore";
import api from "@/lib/api";
import { STATIONS, TIME_SLOTS, PASSENGER_TYPES, SEAT_TYPES } from "@/lib/constants";
import toast from "react-hot-toast";
import Link from "next/link";
// router imported above

export default function ReservePage() {
    const { user } = useAuthStore();
    const router = useRouter();

    const [railType, setRailType] = useState<"SRT" | "KTX">("SRT");
    const [depStation, setDepStation] = useState(STATIONS.SRT[0]);
    const [arrStation, setArrStation] = useState(STATIONS.SRT[STATIONS.SRT.length - 1]);
    const [date, setDate] = useState(new Date().toISOString().split('T')[0].replace(/-/g, ''));
    const [selectedTimes, setSelectedTimes] = useState<string[]>([]);
    const [passengers, setPassengers] = useState<any>({ adult: 1, child: 0, senior: 0, disability1to3: 0, disability4to6: 0 });
    const [seatType, setSeatType] = useState("GENERAL_FIRST");
    const [autoPay, setAutoPay] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [searchResults, setSearchResults] = useState<any[]>([]);
    const [selectedTrainNumbers, setSelectedTrainNumbers] = useState<string[]>([]);
    const [isSearching, setIsSearching] = useState(false);

    useEffect(() => {
        if (!user) router.push("/login");
    }, [user]);

    const toggleTime = (time: string) => {
        setSelectedTimes(prev =>
            prev.includes(time) ? prev.filter(t => t !== time) : [...prev, time]
        );
    };

    const updatePassenger = (type: string, delta: number) => {
        setPassengers((prev: any) => ({
            ...prev,
            [type]: Math.max(0, prev[type] + delta)
        }));
    };

    const handleSearch = async () => {
        if (!depStation || !arrStation || !date) {
            toast.error("출발역, 도착역, 날짜를 확인해주세요.");
            return;
        }

        const searchTime = selectedTimes.length > 0 ? selectedTimes[0] : "000000";

        setIsSearching(true);
        try {
            const res = await api.post("/api/reservations/search", {
                rail_type: railType,
                departure_station: depStation,
                arrival_station: arrStation,
                travel_date: date,
                time: searchTime
            });
            setSearchResults(res.data);
            if (res.data.length === 0) {
                toast.error("조회된 열차가 없습니다.");
            } else {
                toast.success(`${res.data.length}개의 열차를 찾았습니다.`);
            }
        } catch (error: any) {
            toast.error(error.response?.data?.detail || "열차 조회에 실패했습니다.");
        } finally {
            setIsSearching(false);
        }
    };

    const toggleTrainSelection = (trainNo: string) => {
        setSelectedTrainNumbers(prev =>
            prev.includes(trainNo) ? prev.filter(t => t !== trainNo) : [...prev, trainNo]
        );
    };

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        if (selectedTimes.length === 0) {
            toast.error("최소 하나 이상의 시간대를 선택해주세요.");
            return;
        }
        if (depStation === arrStation) {
            toast.error("출발역과 도착역이 같습니다.");
            return;
        }

        setIsSubmitting(true);
        try {
            const res = await api.post("/api/reservations", {
                rail_type: railType,
                departure_station: depStation,
                arrival_station: arrStation,
                travel_date: date,
                time_slots: selectedTimes,
                train_numbers: selectedTrainNumbers.length > 0 ? selectedTrainNumbers : null,
                seat_type: seatType,
                passengers: passengers,
                auto_pay: autoPay
            });
            toast.success("예매 작업이 등록되었습니다!");
            router.push(`/status/${res.data.id}`);
        } catch (error: any) {
            toast.error(error.response?.data?.detail || "예매 등록에 실패했습니다.");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-4 md:p-8">
            <div className="max-w-4xl mx-auto">
                <header className="mb-8 flex items-center justify-between">
                    <div>
                        <Link href="/dashboard" className="inline-flex items-center text-sm text-slate-500 hover:text-blue-600 mb-2 transition-colors">
                            <ChevronLeft size={16} /> 대시보드로 돌아가기
                        </Link>
                        <h1 className="text-3xl font-bold tracking-tight">새 예매 설정</h1>
                    </div>
                </header>

                <form onSubmit={handleSubmit} className="space-y-8">
                    {/* Rail Type Selection */}
                    <section className="card p-6">
                        <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
                            <Train size={20} className="text-blue-600" /> 열차 종류
                        </h2>
                        <div className="grid grid-cols-2 gap-4">
                            <SelectionButton
                                active={railType === "SRT"}
                                onClick={() => setRailType("SRT")}
                                label="SRT"
                                color="red"
                            />
                            <SelectionButton
                                active={railType === "KTX"}
                                onClick={() => setRailType("KTX")}
                                label="KTX"
                                color="blue"
                            />
                        </div>
                    </section>

                    {/* Station Selection */}
                    <section className="card p-6">
                        <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
                            <MapPin size={20} className="text-blue-600" /> 구간 선택
                        </h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <label className="text-sm font-medium opacity-70">출발역</label>
                                <select
                                    className="input-field py-3 bg-slate-50 dark:bg-slate-800"
                                    value={depStation}
                                    onChange={(e) => setDepStation(e.target.value)}
                                >
                                    {STATIONS[railType].map(s => <option key={s} value={s}>{s}</option>)}
                                </select>
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium opacity-70">도착역</label>
                                <select
                                    className="input-field py-3 bg-slate-50 dark:bg-slate-800"
                                    value={arrStation}
                                    onChange={(e) => setArrStation(e.target.value)}
                                >
                                    {STATIONS[railType].map(s => <option key={s} value={s}>{s}</option>)}
                                </select>
                            </div>
                        </div>
                    </section>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        {/* Date & Time Selection */}
                        <section className="card p-6">
                            <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
                                <CalendarIcon size={20} className="text-blue-600" /> 일시 선택
                            </h2>
                            <div className="space-y-6">
                                <div className="space-y-2">
                                    <label className="text-sm font-medium opacity-70">출발 날짜</label>
                                    <input
                                        type="date"
                                        className="input-field py-3"
                                        defaultValue={new Date().toISOString().split('T')[0]}
                                        onChange={(e) => setDate(e.target.value.replace(/-/g, ''))}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium opacity-70">시간대 (복수 선택 가능)</label>
                                    <div className="grid grid-cols-3 gap-2">
                                        {TIME_SLOTS.map(time => (
                                            <button
                                                key={time}
                                                type="button"
                                                onClick={() => toggleTime(time)}
                                                className={`py-2 px-1 rounded-lg text-xs font-bold border transition-all ${selectedTimes.includes(time)
                                                    ? "bg-blue-600 border-blue-600 text-white"
                                                    : "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400"
                                                    }`}
                                            >
                                                {time.substring(0, 2)}:00
                                            </button>
                                        ))}
                                    </div>
                                    <button
                                        type="button"
                                        onClick={handleSearch}
                                        disabled={isSearching}
                                        className="w-full mt-4 py-3 bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 rounded-xl font-bold flex items-center justify-center gap-2 hover:opacity-90 transition-all"
                                    >
                                        {isSearching ? <Loader2 size={18} className="animate-spin" /> : <Search size={18} />}
                                        열차 시간표 조회하기
                                    </button>
                                </div>
                            </div>
                        </section>

                        {/* Passenger & Seat Selection */}
                        <section className="card p-6">
                            <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
                                <Users size={20} className="text-blue-600" /> 승객 및 좌석
                            </h2>
                            <div className="space-y-6">
                                <div className="space-y-3">
                                    {PASSENGER_TYPES.map(p => (
                                        <div key={p.id} className="flex items-center justify-between py-1">
                                            <span className="text-sm font-medium">{p.label}</span>
                                            <div className="flex items-center gap-4">
                                                <button type="button" onClick={() => updatePassenger(p.id, -1)} className="w-8 h-8 rounded-full border flex items-center justify-center hover:bg-slate-50">-</button>
                                                <span className="w-4 text-center font-bold">{passengers[p.id]}</span>
                                                <button type="button" onClick={() => updatePassenger(p.id, 1)} className="w-8 h-8 rounded-full border flex items-center justify-center hover:bg-slate-50">+</button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                                <div className="space-y-2 pt-4 border-t">
                                    <label className="text-sm font-medium opacity-70 flex items-center gap-2">
                                        <Armchair size={16} /> 좌석 종류
                                    </label>
                                    <select
                                        className="input-field py-2"
                                        value={seatType}
                                        onChange={(e) => setSeatType(e.target.value)}
                                    >
                                        {SEAT_TYPES.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
                                    </select>
                                </div>
                            </div>
                        </section>
                    </div>

                    {/* Search Results / Train Selection */}
                    {searchResults.length > 0 && (
                        <section className="card p-6 overflow-hidden">
                            <div className="flex items-center justify-between mb-6">
                                <h2 className="text-lg font-bold flex items-center gap-2">
                                    <Clock size={20} className="text-blue-600" /> 조회된 열차 목록
                                </h2>
                                <p className="text-xs text-slate-500 font-medium">예매를 원하는 열차를 선택하세요 (다중 선택 가능)</p>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm text-left">
                                    <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-500 font-bold uppercase text-[10px] tracking-wider">
                                        <tr>
                                            <th className="px-4 py-3 rounded-l-lg">선택</th>
                                            <th className="px-4 py-3">번호</th>
                                            <th className="px-4 py-3">열차종류</th>
                                            <th className="px-4 py-3">출발시간</th>
                                            <th className="px-4 py-3">도착시간</th>
                                            <th className="px-4 py-3">일반실</th>
                                            <th className="px-4 py-3 rounded-r-lg">특실</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                        {searchResults.map((train) => (
                                            <tr
                                                key={train.train_number}
                                                className={`hover:bg-blue-50/30 dark:hover:bg-blue-900/10 cursor-pointer transition-colors ${selectedTrainNumbers.includes(train.train_number) ? 'bg-blue-50/50 dark:bg-blue-900/20' : ''}`}
                                                onClick={() => toggleTrainSelection(train.train_number)}
                                            >
                                                <td className="px-4 py-4">
                                                    <div className={`w-5 h-5 rounded border flex items-center justify-center transition-all ${selectedTrainNumbers.includes(train.train_number) ? 'bg-blue-600 border-blue-600 text-white' : 'border-slate-300'}`}>
                                                        {selectedTrainNumbers.includes(train.train_number) && <ArrowRight size={12} />}
                                                    </div>
                                                </td>
                                                <td className="px-4 py-4 font-bold text-slate-900 dark:text-slate-100">{train.train_number}</td>
                                                <td className="px-4 py-4">{train.train_name}</td>
                                                <td className="px-4 py-4 text-blue-600 dark:text-blue-400 font-black">{train.departure_time.substring(0, 2)}:{train.departure_time.substring(2, 4)}</td>
                                                <td className="px-4 py-4 text-slate-500">{train.arrival_time.substring(0, 2)}:{train.arrival_time.substring(2, 4)}</td>
                                                <td className="px-4 py-4">
                                                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${train.general_seat_status === '예약가능' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'}`}>
                                                        {train.general_seat_status}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-4">
                                                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${train.special_seat_status === '예약가능' ? 'bg-purple-100 text-purple-700' : 'bg-slate-100 text-slate-500'}`}>
                                                        {train.special_seat_status}
                                                    </span>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </section>
                    )}

                    {/* Payment Toggle */}
                    <section className="card p-6 flex items-center justify-between group cursor-pointer" onClick={() => setAutoPay(!autoPay)}>
                        <div className="flex items-center gap-4">
                            <div className={`p-3 rounded-xl transition-colors ${autoPay ? 'bg-green-100 text-green-600' : 'bg-slate-100 text-slate-400'}`}>
                                <CreditCard size={24} />
                            </div>
                            <div>
                                <h3 className="font-bold">카드 자동 결제</h3>
                                <p className="text-sm text-slate-500">예매 성공 시 미리 등록된 카드로 즉시 결제합니다.</p>
                            </div>
                        </div>
                        <div className={`w-14 h-8 rounded-full flex items-center px-1 transition-colors ${autoPay ? 'bg-green-500' : 'bg-slate-300'}`}>
                            <div className={`w-6 h-6 bg-white rounded-full shadow-sm transition-transform ${autoPay ? 'translate-x-6' : 'translate-x-0'}`} />
                        </div>
                    </section>

                    {/* Submit Button */}
                    <button
                        type="submit"
                        disabled={isSubmitting}
                        className="btn-primary w-full py-5 text-xl font-black shadow-xl shadow-blue-500/30 flex items-center justify-center gap-3"
                    >
                        {isSubmitting ? <Loader2 className="animate-spin" size={24} /> : <>예매 자동 실행 시작 <ArrowRight size={24} /></>}
                    </button>
                </form>
            </div>
        </div>
    );
}

function SelectionButton({ active, onClick, label, color }: { active: boolean, onClick: () => void, label: string, color: 'red' | 'blue' }) {
    const activeClasses = color === 'red' ? 'border-red-500 bg-red-50 text-red-600' : 'border-blue-500 bg-blue-50 text-blue-600';
    return (
        <button
            type="button"
            onClick={onClick}
            className={`py-4 border-2 rounded-2xl font-black text-xl transition-all ${active ? activeClasses : 'border-slate-100 bg-white text-slate-400 grayscale'}`}
        >
            {label}
        </button>
    );
}
