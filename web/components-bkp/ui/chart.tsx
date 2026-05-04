"use client";

import * as React from 'react';
import {
  CartesianGrid,
  Label,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart as RechartPieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { ChartContainerProps, ChartTooltipContentProps } from './types';

// Simulación mínima de ChartContainer
export const ChartContainer = ({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) => (
  <div className={className}>
    <ResponsiveContainer width="100%" height={300}>
      {children}
    </ResponsiveContainer>
  </div>
);

export const ChartTooltip = Tooltip;

export const ChartTooltipContent = ({
  payload,
  label,
}: ChartTooltipContentProps) => {
  if (!payload || payload.length === 0) return null;
  return (
    <div className="rounded-md border bg-background p-2 shadow-sm">
      <div className="grid gap-2">
        <div className="flex items-center gap-2 font-medium">
          <div>{label}</div>
        </div>
        {payload.map((item: any, index: number) => (
          <div key={index} className="flex items-center gap-2 text-sm">
            <div
              className="h-2 w-2 rounded-full"
              style={{ backgroundColor: item.color }}
            />
            <div>{item.name}:</div>
            <div>{item.value}</div>
          </div>
        ))}
      </div>
    </div>
  );
};

// Exportaciones directas
export { CartesianGrid, XAxis, YAxis, Line, LineChart, Pie, RechartPieChart };