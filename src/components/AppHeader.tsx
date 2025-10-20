// src/components/AppHeader.tsx
// The main header bar for your application.

'use client';

import Link from "next/link";
import { useAuth } from "./auth/AuthProvider"; // Handles user login state
import { Button } from "./ui/button"; // Your button component
import { ArrowLeft, User, LogOut } from "lucide-react"; // Icons
import { useRouter } from "next/navigation";
import { auth } from "@/lib/firebase"; // Firebase auth instance
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
    DropdownMenuSeparator
} from "./ui/dropdown-menu"; // Dropdown component
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar"; // User avatar component
import { LanguageSelector } from './LanguageSelector'; // <-- IMPORT the language selector

// Props type definition for the header
type AppHeaderProps = {
    title: string; // The title displayed in the header
    backLink?: string; // Optional link for the back button
    children?: React.ReactNode; // Optional extra elements to include in the header
}

export default function AppHeader({ title, backLink, children }: AppHeaderProps) {
    const { user } = useAuth(); // Get current user state
    const router = useRouter(); // Hook for navigation

    // Function to handle user logout
    const handleLogout = async () => {
        await auth.signOut();
        router.push('/login'); // Redirect to login page after logout
    };

    // Helper to get initials from email for avatar fallback
    const getInitials = (email: string | null | undefined) => { // Allow null email
        if (!email) return 'U'; // Default 'U' if no email
        return email.substring(0, 2).toUpperCase();
    }

    return (
        <header className="sticky top-0 z-30 bg-background/80 backdrop-blur-sm border-b">
            <div className="container mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex h-16 items-center justify-between">
                    {/* Left section: Back button or Logo */}
                    <div className="flex items-center gap-4">
                       {backLink ? (
                            // If backLink is provided, show a back button
                            <Button asChild variant="ghost" size="icon">
                                <Link href={backLink}>
                                    <ArrowLeft className="h-5 w-5" />
                                </Link>
                            </Button>
                       ) : (
                         // Otherwise, show the logo/brand link
                         <Link href="/" className="flex items-center gap-2">
                            {/* Your SVG Logo */}
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6 text-primary">
                                <path d="M12 2L2 7l10 5 10-5-10-5z" /><path d="M2 17l10 5 10-5" /><path d="M2 12l10 5 10-5" />
                            </svg>
                            <span className="font-bold hidden sm:inline-block">Shiksha Setu</span>
                        </Link>
                       )}
                    </div>

                    {/* Center section: Page Title (hidden on small screens) */}
                    <h1 className="text-lg font-semibold text-foreground hidden md:block truncate px-4">
                        {title}
                    </h1>

                    {/* Right section: Children, Language Selector, User Menu */}
                    <div className="flex items-center gap-2 sm:gap-4"> {/* Reduced gap on small screens */}
                        {children} {/* Render any extra elements passed */}
                        <LanguageSelector /> {/* <-- ADD THE LANGUAGE SELECTOR HERE */}
                        {user && (
                            // Dropdown menu for logged-in user
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                                        <Avatar className="h-8 w-8 sm:h-9 sm:w-9"> {/* Slightly smaller avatar */}
                                            <AvatarImage src="" alt={user.email || 'User'} /> {/* Handle null email */}
                                            <AvatarFallback>{getInitials(user.email)}</AvatarFallback>
                                        </Avatar>
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent className="w-56" align="end" forceMount>
                                    {/* User info display */}
                                    <DropdownMenuItem disabled>
                                        <div className="flex flex-col space-y-1">
                                            <p className="text-sm font-medium leading-none">{user.email || 'No Email'}</p>
                                            <p className="text-xs leading-none text-muted-foreground capitalize">{user.role}</p>
                                        </div>
                                    </DropdownMenuItem>
                                    <DropdownMenuSeparator />
                                    {/* Profile link */}
                                    <DropdownMenuItem onSelect={() => router.push('/profile')}>
                                        <User className="mr-2 h-4 w-4" />
                                        <span>Profile</span>
                                    </DropdownMenuItem>
                                    {/* Logout action */}
                                    <DropdownMenuItem onSelect={handleLogout}>
                                        <LogOut className="mr-2 h-4 w-4" />
                                        <span>Log out</span>
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        )}
                    </div>
                </div>
            </div>
        </header>
    )
}