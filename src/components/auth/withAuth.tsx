'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/auth/AuthProvider';

/**
 * Role-based route guard HOC
 * Wrap any page with `withAuth(Component, ['role1', 'role2'])`
 * to protect it based on user role.
 *
 * Example:
 *   export default withAuth(StudentDashboard, ['student']);
 */
export default function withAuth<P>(
  Component: React.ComponentType<P>,
  allowedRoles?: Array<'student' | 'teacher' | 'parent'>
) {
  return function Guard(props: P) {
    const { user, loading } = useAuth();
    const router = useRouter();

    useEffect(() => {
      if (!loading) {
        if (!user) {
          // Not logged in → redirect to login and remember path
          const redirectUrl = '/login?redirect=' + encodeURIComponent(window.location.pathname);
          router.replace(redirectUrl);
          return;
        }

        // User logged in but not allowed for this page
        if (allowedRoles && !allowedRoles.includes(user.role)) {
          if (user.role === 'parent') router.replace('/parent');
          else if (user.role === 'teacher') router.replace('/teacher');
          else if (user.role === 'student') router.replace('/student');
          else router.replace('/login');
        }
      }
    }, [loading, user, allowedRoles, router]);

    // While auth is loading or redirecting, render nothing
    if (loading || !user) return null;

    // If user role not allowed, don’t render component (redirecting)
    if (allowedRoles && !allowedRoles.includes(user.role)) return null;

    // Otherwise render the wrapped component
    return <Component {...props} />;
  };
}
