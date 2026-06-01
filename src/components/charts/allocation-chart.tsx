"use client";

import { useEffect, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";
import type { RebalanceItem } from "@/lib/types";
import { ASSET_TYPE_SETTINGS } from "@/lib/constants/asset-types";

export function AllocationChart({ items }: { items: RebalanceItem[] }) {
  const [mounted, setMounted] = useState(false);
  const data = items.map((item) => ({
    label: ASSET_TYPE_SETTINGS[item.assetType].label,
    현재: Number((item.currentRatio * 100).toFixed(1)),
    목표: Number((item.targetRatio * 100).toFixed(1))
  }));

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return <div className="h-72 w-full rounded-md bg-neutral-50" />;
  }

  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 12, right: 12, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#dedbd2" />
          <XAxis dataKey="label" tick={{ fontSize: 12 }} interval={0} />
          <YAxis tickFormatter={(value) => `${value}%`} width={44} />
          <Tooltip formatter={(value) => `${Number(value).toFixed(1)}%`} />
          <Legend />
          <Bar dataKey="현재" fill="#0f766e" radius={[4, 4, 0, 0]} />
          <Bar dataKey="목표" fill="#b7791f" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
