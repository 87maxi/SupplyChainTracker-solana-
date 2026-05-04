import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { RefreshCw } from 'lucide-react';

interface EmptyStateProps {
  title: string;
  description: string;
  onRefresh?: () => void;
  actionText?: string;
}

export function EmptyState({ title, description, onRefresh, actionText = "Refrescar" }: EmptyStateProps) {
  return (
    <div className="flex justify-center py-12">
      <Card className="max-w-md w-full">
        <CardHeader className="text-center">
          <CardTitle className="text-xl">{title}</CardTitle>
          <CardContent>
            <p className="text-muted-foreground text-sm">{description}</p>
          </CardContent>
        </CardHeader>
        {onRefresh && (
          <CardFooter>
            <Button onClick={onRefresh} className="w-full gap-2">
              <RefreshCw className="h-4 w-4" />
              {actionText}
            </Button>
          </CardFooter>
        )}
      </Card>
    </div>
  );
}