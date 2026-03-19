export const STATIONS = {
    SRT: [
        "수서", "동탄", "평택지제", "경주", "곡성", "공주", "광주송정", "구례구", "김천(구미)",
        "나주", "남원", "대전", "동대구", "마산", "목포", "밀양", "부산", "서대구", "순천",
        "여수EXPO", "여천", "오송", "울산(통도사)", "익산", "전주", "정읍", "진영", "진주",
        "창원", "창원중앙", "천안아산", "포항"
    ],
    KTX: [
        "서울", "용산", "영등포", "광명", "수원", "천안아산", "오송", "대전", "서대전",
        "김천구미", "동대구", "경주", "포항", "밀양", "구포", "부산", "울산(통도사)",
        "마산", "창원중앙", "경산", "논산", "익산", "정읍", "광주송정", "목포", "전주",
        "순천", "여수EXPO", "청량리", "강릉", "행신", "정동진", "신해운대"
    ],
};

export const TIME_SLOTS = [
    "000000", "020000", "040000", "060000", "080000", "100000",
    "120000", "140000", "160000", "180000", "200000", "220000"
];

export const PASSENGER_TYPES = [
    { id: "adult", label: "어른", default: 1 },
    { id: "child", label: "어린이", default: 0 },
    { id: "senior", label: "경로우대", default: 0 },
    { id: "disability1to3", label: "장애 1~3급", default: 0 },
    { id: "disability4to6", label: "장애 4~6급", default: 0 },
];

export const SEAT_TYPES = [
    { id: "GENERAL_FIRST", label: "일반실 우선" },
    { id: "GENERAL_ONLY", label: "일반실만" },
    { id: "SPECIAL_FIRST", label: "특실 우선" },
    { id: "SPECIAL_ONLY", label: "특실만" },
];
