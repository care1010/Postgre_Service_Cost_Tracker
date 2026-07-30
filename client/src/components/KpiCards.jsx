import React from 'react';

const KpiCards = ({ data }) => {
    const asblValue =
        Number(data?.asbl_sm) === 0
            ? "NA"
            : data?.asbl_sm || "NA";

    const cards = [
        {
            label: "ASBL SM %",
            value: asblValue,
            color: "text-blue-700",
            border: "border-t-4 border-amber-600",
        },
        {
            label: "PTD SM %",
            value: data?.ptd_sm || "0.00",
            color: "text-emerald-700",
            border: "border-t-4 border-emerald-600",
        },
        {
            label: "EAC SM %",
            value: data?.eac_sm || "0.00",
            color: "text-purple-700",
            border: "border-t-4 border-purple-600",
        },
    ];

    return (
        <div className="flex gap-4 h-full">
            {cards.map((card, i) => (
                <div
                    key={i}
                    className={`
                        ${card.border}
                        bg-white
                        border
                        border-slate-200
                        shadow-sm
                        hover:shadow-md
                        transition-all
                        duration-200
                        hover:-translate-y-0.5
                        px-4
                        py-3
                        min-w-[180px]
                    `}
                >
                    <div className="flex items-center justify-between">
                        <span className="text-[12px] font-semibold uppercase tracking-wide text-slate-600">
                            {card.label}
                        </span>

                        <span className={`text-xl font-bold ${card.color}`}>
                            {card.value === "NA"
                                ? "NA"
                                : `${card.value}%`}
                        </span>
                    </div>
                </div>
            ))}
        </div>
    );
};

export default KpiCards;