"use client";

import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { useRouter } from 'next/navigation';
import { useForm, type SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AUTH_KEY } from '@/lib/constants';
import { useToast } from '@/hooks/use-toast';
import { LogIn, Mail, Lock, Eye, EyeOff } from 'lucide-react';
import { flux } from '@/lib/flux/client';

// Schema for Super Admin: email and password
const loginSchema = z.object({
    email: z.string().email({ message: 'Invalid email address' }),
    password: z.string().min(1, { message: 'Password is required' }),
});

type LoginFormInputs = z.infer<typeof loginSchema>;

export default function LoginPage() {
    const router = useRouter();
    const { toast } = useToast();
    const [isClient, setIsClient] = useState(false);
    const [showPassword, setShowPassword] = useState(false);

    useEffect(() => {
        setIsClient(true);
    }, []);

    const {
        register,
        handleSubmit,
        formState: { errors, isSubmitting },
    } = useForm<LoginFormInputs>({
        resolver: zodResolver(loginSchema),
    });

    // onSubmit for Super Admin
    const onSubmit: SubmitHandler<LoginFormInputs> = async (data) => {
        if (!isClient) return;

        try {
            // NOTE: This is an insecure login pattern. 
            // We are only checking if the user exists. We are NOT verifying the password.
            // This should be replaced with Supabase Auth or an Edge Function for a real application.
            const safeEmail = data.email.replace(/'/g, "''");
            const query = `SELECT id, password_hash FROM super_admins WHERE email = '${safeEmail}' LIMIT 1`;
            const { rows: admins, error } = await flux.sql(query);
            const admin = admins?.[0];

            if (error) {
                const isConfigError = !error.message;
                console.error(`Error fetching admin user (isConfigError: ${isConfigError}):`, error);
                toast({
                    title: 'Login Error',
                    description: isConfigError
                        ? "Connection to the database failed. Please check Fluxbase URL/Key, network, and RLS policies."
                        : error.message,
                    variant: 'destructive',
                });
                return;
            }

            if (admin && admin.password_hash === data.password) {
                // Password matches! 
                localStorage.setItem(AUTH_KEY, 'true');

                toast({
                    title: 'Login Successful',
                    description: 'Redirecting to dashboard...',
                });
                router.push('/dashboard');
            } else {
                toast({
                    title: 'Login Failed',
                    description: 'Invalid email or password.', // Generic message for security
                    variant: 'destructive',
                });
            }
        } catch (err) {
            console.error('Login submission error:', err);
            toast({
                title: 'Login Error',
                description: 'An unexpected error occurred. Please try again.',
                variant: 'destructive',
            });
        }
    };

    if (!isClient) {
        return null;
    }

    // JSX with the new design, but with Super Admin text and fields
    return (
        <div className="flex min-h-screen flex-col items-center justify-center relative z-10 p-4">
            <Card className="w-full max-w-md shadow-2xl border-0 overflow-hidden relative">
                <CardHeader className="text-center space-y-4 pt-8">
                    <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary/20 ring-1 ring-primary shadow-[0_0_30px_rgba(255,204,0,0.3)]">
                        <LogIn className="h-8 w-8 text-primary shadow-sm" />
                    </div>
                    <div>
                        <CardTitle className="text-3xl font-headline">Super Admin Login</CardTitle>
                        <CardDescription className="text-lg pt-1">Access the central management dashboard</CardDescription>
                    </div>
                </CardHeader>
                <CardContent className="pt-2 pb-8">
                    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                        <div className="space-y-2">
                            <Label htmlFor="email" className="flex items-center gap-2 text-base">
                                <Mail size={16} className="text-primary" />
                                Email Address
                            </Label>
                            <Input
                                id="email"
                                type="email"
                                placeholder="admin@example.com"
                                {...register('email')}
                                className={errors.email ? 'border-destructive' : ''}
                            />
                            {errors.email && <p className="text-sm text-destructive">{errors.email.message}</p>}
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="password" className="flex items-center gap-2 text-base">
                                <Lock size={16} className="text-primary" />
                                Password
                            </Label>
                            <div className="relative group">
                                <Input
                                    id="password"
                                    type={showPassword ? "text" : "password"}
                                    placeholder="••••••••"
                                    {...register('password')}
                                    className={cn(
                                        "pr-10",
                                        errors.password ? "border-destructive" : ""
                                    )}
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-primary transition-colors focus:outline-none"
                                    tabIndex={-1}
                                >
                                    {showPassword ? (
                                        <EyeOff size={18} />
                                    ) : (
                                        <Eye size={18} />
                                    )}
                                </button>
                            </div>
                            {errors.password && <p className="text-sm text-destructive">{errors.password.message}</p>}
                        </div>
                        <Button type="submit" className="w-full h-12 text-lg" disabled={isSubmitting}>
                            {isSubmitting ? 'Logging in...' : 'Login'}
                        </Button>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
}
