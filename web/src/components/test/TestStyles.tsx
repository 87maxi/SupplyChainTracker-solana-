// Test component to verify Tailwind CSS is working
"use client";

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export function TestStyles() {
  return (
    <div className="space-y-6 p-6">
      <h1 className="text-3xl font-bold">Test Styles</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Buttons</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-2">
              <Button variant="default">Default</Button>
              <Button variant="secondary">Secondary</Button>
              <Button variant="destructive">Destructive</Button>
              <Button variant="outline">Outline</Button>
              <Button variant="ghost">Ghost</Button>
              <Button variant="link">Link</Button>
              <Button variant="gradient">Gradient</Button>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Badges</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-2">
              <Badge variant="default">Default</Badge>
              <Badge variant="secondary">Secondary</Badge>
              <Badge variant="destructive">Destructive</Badge>
              <Badge variant="outline">Outline</Badge>
              <Badge variant="success">Success</Badge>
              <Badge variant="warning">Warning</Badge>
              <Badge variant="glass">Glass</Badge>
              <Badge variant="outline-glow">Outline Glow</Badge>
            </div>
          </CardContent>
        </Card>
      </div>
      
      <div className="bg-glass p-6 rounded-lg">
        <h2 className="text-2xl font-semibold mb-4">Glass Effect</h2>
        <p className="text-muted-foreground">
          This should have a glass effect with backdrop blur.
        </p>
      </div>
      
      <div className="p-6 rounded-lg text-gradient glow-text">
        <h2 className="text-2xl font-semibold mb-4">Text Gradient</h2>
        <p>
          This text should have a gradient color effect.
        </p>
      </div>
    </div>
  );
}