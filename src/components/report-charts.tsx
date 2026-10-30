"use client";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
} from "recharts";
export function RevenueChart({
  data,
}: {
  data: { name: string; expected: number; received: number }[];
}) {
  if (!data.length)
    return <p className="empty">No financial records in this period.</p>;
  return (
    <div
      className="h-72 w-full min-w-0"
      role="img"
      aria-label="Monthly expected revenue and received payments in NOK"
    >
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data}>
          <CartesianGrid
            strokeDasharray="3 3"
            vertical={false}
            stroke="var(--border)"
          />
          <XAxis dataKey="name" tick={{ fontSize: 11 }} />
          <YAxis tick={{ fontSize: 11 }} />
          <Tooltip
            contentStyle={{
              background: "var(--card)",
              borderColor: "var(--border)",
              color: "var(--foreground)",
            }}
          />
          <Legend />
          <Bar
            name="Expected NOK"
            dataKey="expected"
            fill="#93b4fd"
            radius={[4, 4, 0, 0]}
          />
          <Bar
            name="Received NOK"
            dataKey="received"
            fill="#2563eb"
            radius={[4, 4, 0, 0]}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
