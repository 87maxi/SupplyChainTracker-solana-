'use client';

import { Line, LineChart, ResponsiveContainer, XAxis, YAxis, Tooltip, Legend, CartesianGrid } from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

interface AnalyticsData {
  date: string;
  fabricadas: number;
  distribuidas: number;
}

export function AnalyticsChart({ data }: { data: AnalyticsData[] }) {

  return (
    <Card>
      <CardHeader>
        <CardTitle>Progreso del Programa</CardTitle>
        <CardDescription>Seguimiento mensual de netbooks fabricadas y distribuidas</CardDescription>
      </CardHeader>
      <CardContent className="pb-4">
        <div className="h-[200px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey="date"
                stroke="#888888"
                fontSize={12}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                stroke="#888888"
                fontSize={12}
                tickLine={false}
                axisLine={false}
              />
              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    return (
                      <div className="rounded-lg border bg-background p-2 shadow-sm">
                        <div className="grid grid-cols-2 gap-2">
                          {payload.map((pld, index) => (
                            <div key={index} className="flex items-center gap-2 font-medium">
                              <div
                                className="h-2 w-2 rounded-full"
                                style={{ backgroundColor: pld.color }}
                              />
                              {pld.name}: {pld.value}
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Legend
                layout="horizontal"
                verticalAlign="bottom"
                align="center"
                formatter={(value) => <span className="text-sm text-muted-foreground">{value}</span>}
              />
              <Line
                type="monotone"
                dataKey="fabricadas"
                stroke="hsl(var(--chart-1))"
                strokeWidth={2}
                dot={false}
                name="Netbooks Fabricadas"
              />
              <Line
                type="monotone"
                dataKey="distribuidas"
                stroke="hsl(var(--chart-2))"
                strokeWidth={2}
                dot={false}
                name="Netbooks Distribuidas"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}