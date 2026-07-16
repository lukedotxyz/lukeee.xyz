'use client';

import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter } from '@/components/ui/card';

export default function HomePage() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardContent className="flex flex-col items-center space-y-6 pt-6 text-center">
          <div className="space-y-1.5">
            <Button
              variant={'link'}
              onClick={() => {
                window.location.href = 'https://x.com/lukedotxyz';
              }}
              className="text-3xl font-bold"
            >
              @lukedotxyz
            </Button>
            <p className="text-muted-foreground">Software Engineer</p>
          </div>

          <Avatar className="h-24 w-24">
            <AvatarFallback className="bg-secondary text-3xl font-bold text-accent">
              L
            </AvatarFallback>
          </Avatar>

          <p className="condensed-text text-foreground">I write code...</p>
        </CardContent>

        <CardFooter className="flex justify-center py-6">
          <p className="text-xs text-muted-foreground">
            © <span suppressHydrationWarning>{new Date().getFullYear()}</span>{' '}
            Luke. All rights reserved.
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}
