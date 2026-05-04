export interface ChartTooltipContentProps {
  payload?: {
    color: string;
    name: string;
    value: string | number;
    dataKey: string;
  }[];
  label?: string;
  formatter?: (value: string | number, name: string, item: unknown) => [string | number, string];
}

export interface ChartContainerProps {
  children: React.ReactNode;
  className?: string;
  config?: Record<string, unknown>;
}