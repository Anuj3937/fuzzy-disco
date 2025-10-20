
'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/components/auth/AuthProvider';
import { db } from '@/lib/firebase';
import { collection, addDoc, query, orderBy, onSnapshot, serverTimestamp, where, getDocs, doc } from 'firebase/firestore';
import type { CommunityPost, UserProfile } from '@/lib/types';
import withAuth from '@/components/auth/withAuth';
import AppHeader from '@/components/AppHeader';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Loader2, Send, FileUp } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';

const getInitials = (email: string | undefined) => {
  if (!email) return 'U';
  return email.substring(0, 2).toUpperCase();
};

function CommunityPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [posts, setPosts] = useState<CommunityPost[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [newPostTitle, setNewPostTitle] = useState('');
  const [newPostContent, setNewPostContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const postsQuery = query(collection(db, 'posts'), orderBy('createdAt', 'desc'));

    const unsubscribe = onSnapshot(postsQuery, async (querySnapshot) => {
        const postsData: CommunityPost[] = [];
        const userIds = new Set<string>();
        querySnapshot.forEach(doc => {
            const post = { id: doc.id, ...doc.data() } as CommunityPost;
            postsData.push(post);
            if(post.createdBy) userIds.add(post.createdBy);
        });
        
        let userProfiles = new Map<string, UserProfile>();
        if (userIds.size > 0) {
            const usersRef = collection(db, 'users');
            // Firestore 'in' query is limited to 30 items. For larger scale, batch this.
            const userQuery = query(usersRef, where('__name__', 'in', Array.from(userIds)));
            const userSnapshots = await getDocs(userQuery);
            userSnapshots.forEach(doc => {
                userProfiles.set(doc.id, doc.data() as UserProfile);
            });
        }
        
        postsData.forEach(post => {
            if (post.createdBy) {
              post.authorProfile = userProfiles.get(post.createdBy);
            }
        });
        
        setPosts(postsData);
        setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);
  
  const handleCreatePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPostContent.trim() || !newPostTitle.trim() || !user) return;

    setIsSubmitting(true);
    try {
        await addDoc(collection(db, 'posts'), {
            title: newPostTitle,
            content: newPostContent,
            createdBy: user.uid,
            createdAt: serverTimestamp(),
            // In a real implementation, you'd get the mediaUrl from Cloudinary here
            mediaUrl: null,
            mediaType: null,
        });
        setNewPostTitle('');
        setNewPostContent('');
        toast({ title: 'Post created successfully!' });
    } catch (error) {
        console.error("Error creating post:", error);
        toast({ variant: 'destructive', title: 'Error', description: 'Could not create post.' });
    } finally {
        setIsSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-muted/40">
      <AppHeader title="Community Hub" backLink={user?.role === 'student' ? '/student' : '/teacher'} />
      <main className="flex-grow container mx-auto p-4 sm:p-6 lg:p-8">
        <div className="max-w-3xl mx-auto">
          <Card className="mb-8">
            <form onSubmit={handleCreatePost}>
              <CardHeader>
                <CardTitle>Create a new post</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Input 
                  placeholder="Post Title"
                  value={newPostTitle}
                  onChange={(e) => setNewPostTitle(e.target.value)}
                  disabled={isSubmitting}
                />
                <Textarea
                  placeholder="Share something with the community..."
                  value={newPostContent}
                  onChange={(e) => setNewPostContent(e.target.value)}
                  rows={4}
                  disabled={isSubmitting}
                />
              </CardContent>
              <CardFooter className="flex justify-between">
                <Button variant="outline" type="button" disabled>
                  <FileUp className="mr-2"/>
                  Upload Media
                </Button>
                <Button type="submit" disabled={isSubmitting || !newPostContent.trim() || !newPostTitle.trim()}>
                  {isSubmitting ? <Loader2 className="animate-spin" /> : <Send />}
                  <span className="ml-2">Post</span>
                </Button>
              </CardFooter>
            </form>
          </Card>

          <div className="space-y-6">
            {isLoading ? (
                <div className="text-center py-10"><Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" /></div>
            ) : posts.length === 0 ? (
                <p className="text-center text-muted-foreground">No posts in the community yet. Be the first to share!</p>
            ) : (
                posts.map(post => (
                    <Card key={post.id}>
                        <CardHeader>
                            <div className="flex items-center gap-3">
                                <Avatar>
                                    <AvatarImage src="" alt={post.authorProfile?.email} />
                                    <AvatarFallback>{getInitials(post.authorProfile?.email)}</AvatarFallback>
                                </Avatar>
                                <div>
                                    <p className="font-semibold">{post.authorProfile?.email}</p>
                                    <p className="text-xs text-muted-foreground">
                                        {post.createdAt ? formatDistanceToNow(post.createdAt.toDate(), { addSuffix: true }) : '...'}
                                    </p>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <h2 className="text-xl font-bold mb-2">{post.title}</h2>
                            <p className="whitespace-pre-wrap">{post.content}</p>
                            {post.mediaUrl && (
                                <div className="mt-4">
                                    <p className="text-sm text-muted-foreground">[Media placeholder: {post.mediaType}]</p>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                ))
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

export default withAuth(CommunityPage, ['teacher', 'student']);
