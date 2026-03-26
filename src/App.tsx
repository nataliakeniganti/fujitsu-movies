/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Search, Film, Info, ExternalLink, Loader2, ChevronRight, Play, LogIn, LogOut, Bookmark as BookmarkIcon, Trash2, Calendar } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { searchFujitsuMovies, Movie } from './services/movieService';
import { auth, loginWithGoogle, logout, db, handleFirestoreError, OperationType } from './firebase';
import { onAuthStateChanged, User } from 'firebase/auth';
import { doc, setDoc, getDoc, collection, onSnapshot, addDoc, deleteDoc, query, where, serverTimestamp } from 'firebase/firestore';

// Error Boundary Component
interface ErrorBoundaryProps {
  children: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  errorInfo: string | null;
}

class ErrorBoundary extends React.Component<any, any> {
  public state: any = { hasError: false, errorInfo: null };

  static getDerivedStateFromError(error: any) {
    return { hasError: true, errorInfo: error.message };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("ErrorBoundary caught an error", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
          <div className="bg-white p-8 rounded-2xl shadow-xl max-w-md w-full text-center">
            <h2 className="text-2xl font-bold text-red-600 mb-4">Something went wrong</h2>
            <p className="text-gray-600 mb-6">
              {this.state.errorInfo?.includes('{') ? "A database error occurred. Please try again later." : "An unexpected error occurred."}
            </p>
            <button 
              onClick={() => window.location.reload()}
              className="bg-fujitsu-red text-white px-6 py-2 rounded-full font-bold hover:bg-red-700 transition-colors"
            >
              Reload Application
            </button>
          </div>
        </div>
      );
    }

    return (this as any).props.children;
  }
}

function MainApp() {
  const [movies, setMovies] = useState<Movie[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMovie, setSelectedMovie] = useState<Movie | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [bookmarks, setBookmarks] = useState<any[]>([]);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [currentView, setCurrentView] = useState<'explore' | 'schedule'>('explore');

  const scheduleData = [
    {
      year: 2026,
      months: [
        { name: 'March', events: [{ title: 'Fujitsu: The Digital Dawn', date: 'March 31', desc: 'A cinematic exploration of the early days of Fujitsu\'s computing revolution.' }] },
        { name: 'April', events: [
          { title: 'Fujitsu: The Quantum Leap', date: 'April 12', desc: 'A deep dive into Fujitsu\'s quantum computing journey.' },
          { title: 'The Silicon Path', date: 'April 18', desc: 'Tracing the evolution of semiconductor technology at Fujitsu.' }
        ] },
        { name: 'May', events: [
          { title: 'Digital Transformation Summit', date: 'May 20', desc: 'Exclusive documentary on the global DX shift.' },
          { title: 'Fujitsu Tech Week: Global Premiere', date: 'May 25', desc: 'Day 1: The Future of Connectivity.' },
          { title: 'Fujitsu Tech Week: Global Premiere', date: 'May 26', desc: 'Day 2: AI and Human Centricity.' },
          { title: 'Fujitsu Tech Week: Global Premiere', date: 'May 27', desc: 'Day 3: Sustainable Infrastructure.' },
          { title: 'Fujitsu Tech Week: Global Premiere', date: 'May 28', desc: 'Day 4: Closing Keynote and Vision 2030.' }
        ] },
        { name: 'June', events: [{ title: 'Fujitsu Legacy: 1935-2026', date: 'June 15', desc: 'A comprehensive retrospective of the company\'s history.' }] },
        { name: 'July', events: [{ title: 'AI Ethics in Cinema', date: 'July 08', desc: 'Exploring the portrayal of AI in Fujitsu-sponsored films.' }] },
        { name: 'August', events: [{ title: 'Sustainable Tech: The Movie', date: 'August 22', desc: 'How Fujitsu is leading the way in green technology.' }] },
        { name: 'September', events: [{ title: 'The Supercomputer Saga', date: 'September 10', desc: 'The story behind Fugaku and its successors.' }] },
        { name: 'October', events: [{ title: 'Cybersecurity Chronicles', date: 'October 31', desc: 'A thriller-style documentary on protecting the digital world.' }] },
        { name: 'November', events: [{ title: 'Fujitsu Innovation Lab: Tokyo', date: 'November 18', desc: 'Behind the scenes at the Tokyo research facility.' }] },
        { name: 'December', events: [{ title: 'Future Horizons 2027', date: 'December 24', desc: 'A sneak peek into the technological advancements of 2027.' }] },
      ]
    },
    {
      year: 2027,
      months: [
        { name: 'January', events: [{ title: 'New Year, New Tech', date: 'January 05', desc: 'Fujitsu\'s vision for the first quarter of 2027.' }] },
        { name: 'February', events: [{ title: 'The Human-Centric AI', date: 'February 14', desc: 'Focusing on AI that empowers people.' }] },
        { name: 'March', events: [{ title: 'Cloud Computing: The Next Frontier', date: 'March 20', desc: 'Advancements in hybrid cloud solutions.' }] },
        { name: 'April', events: [{ title: 'Fujitsu World Tour 2027', date: 'April 15', desc: 'Highlights from the global technology showcase.' }] },
        { name: 'May', events: [{ title: 'Smart Cities: A Reality', date: 'May 10', desc: 'How Fujitsu tech is powering the cities of tomorrow.' }] },
        { name: 'June', events: [{ title: 'The 5G Revolution', date: 'June 25', desc: 'Impact of 5G on industrial automation.' }] },
        { name: 'July', events: [{ title: 'Oceanic Tech Explorations', date: 'July 12', desc: 'Fujitsu\'s contribution to marine research.' }] },
        { name: 'August', events: [{ title: 'Space: The Final Digital Frontier', date: 'August 05', desc: 'Satellite tech and data processing in orbit.' }] },
        { name: 'September', events: [{ title: 'Healthcare Reimagined', date: 'September 18', desc: 'Digital health solutions for an aging population.' }] },
        { name: 'October', events: [{ title: 'The Robotics Evolution', date: 'October 22', desc: 'Next-gen robotics in the workplace.' }] },
        { name: 'November', events: [{ title: 'Quantum Supremacy: Year One', date: 'November 10', desc: 'Reflecting on the first full year of quantum dominance.' }] },
        { name: 'December', events: [{ title: 'Fujitsu: A Century of Innovation', date: 'December 31', desc: 'Looking back and moving forward.' }] },
      ]
    }
  ];

  const fetchMovies = async (query?: string) => {
    setLoading(true);
    const results = await searchFujitsuMovies(query);
    setMovies(results);
    setLoading(false);
  };

  useEffect(() => {
    fetchMovies();
    
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      setIsAuthReady(true);
      
      if (currentUser) {
        // Sync user profile to Firestore
        const userRef = doc(db, 'users', currentUser.uid);
        try {
          const userDoc = await getDoc(userRef);
          if (!userDoc.exists()) {
            await setDoc(userRef, {
              uid: currentUser.uid,
              email: currentUser.email,
              displayName: currentUser.displayName,
              photoURL: currentUser.photoURL,
              role: 'user',
              createdAt: new Date().toISOString()
            });
          }
        } catch (error) {
          handleFirestoreError(error, OperationType.WRITE, `users/${currentUser.uid}`);
        }
      }
    });

    return () => unsubscribe();
  }, []);

  // Listen for bookmarks
  useEffect(() => {
    if (user && isAuthReady) {
      const q = query(collection(db, `users/${user.uid}/bookmarks`));
      const unsubscribe = onSnapshot(q, (snapshot) => {
        const b = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setBookmarks(b);
      }, (error) => {
        handleFirestoreError(error, OperationType.LIST, `users/${user.uid}/bookmarks`);
      });
      return () => unsubscribe();
    } else {
      setBookmarks([]);
    }
  }, [user, isAuthReady]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchMovies(searchQuery || "movies related to Fujitsu");
  };

  const toggleBookmark = async (movie: Movie) => {
    if (!user) {
      await loginWithGoogle();
      return;
    }

    const existing = bookmarks.find(b => b.movieTitle === movie.title);
    if (existing) {
      try {
        await deleteDoc(doc(db, `users/${user.uid}/bookmarks`, existing.id));
      } catch (error) {
        handleFirestoreError(error, OperationType.DELETE, `users/${user.uid}/bookmarks/${existing.id}`);
      }
    } else {
      try {
        await addDoc(collection(db, `users/${user.uid}/bookmarks`), {
          userId: user.uid,
          movieTitle: movie.title,
          movieYear: movie.year,
          createdAt: new Date().toISOString()
        });
      } catch (error) {
        handleFirestoreError(error, OperationType.CREATE, `users/${user.uid}/bookmarks`);
      }
    }
  };

  return (
    <div className="min-h-screen bg-[#F5F5F5] font-sans text-fujitsu-dark">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-8">
            <div className="flex items-center gap-3">
              <img src="/logo.png" alt="Fujitsu Logo" className="h-8 w-auto" referrerPolicy="no-referrer" />
              <span className="text-lg font-bold tracking-tighter uppercase hidden sm:block">Movies</span>
            </div>
            
            <nav className="hidden md:flex items-center gap-6">
              <button 
                onClick={() => setCurrentView('explore')}
                className={`text-xs font-bold uppercase tracking-widest transition-colors ${currentView === 'explore' ? 'text-fujitsu-red' : 'text-gray-400 hover:text-fujitsu-dark'}`}
              >
                Explore
              </button>
              <button 
                onClick={() => setCurrentView('schedule')}
                className={`text-xs font-bold uppercase tracking-widest transition-colors ${currentView === 'schedule' ? 'text-fujitsu-red' : 'text-gray-400 hover:text-fujitsu-dark'}`}
              >
                Schedule
              </button>
            </nav>
          </div>
          
          <form onSubmit={handleSearch} className="relative hidden md:block w-96">
            <input
              type="text"
              placeholder="Search movies, tech, history..."
              className="w-full bg-gray-100 border-none rounded-full py-2 pl-10 pr-4 focus:ring-2 focus:ring-fujitsu-red transition-all"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <Search className="absolute left-3 top-2.5 text-gray-400 w-4 h-4" />
          </form>

          <div className="flex items-center gap-4">
            {user ? (
              <div className="flex items-center gap-3">
                <div className="hidden sm:block text-right">
                  <p className="text-xs font-bold uppercase tracking-tighter leading-none">{user.displayName}</p>
                  <p className="text-[10px] text-gray-400 uppercase tracking-widest">Member</p>
                </div>
                <img src={user.photoURL || ''} alt="Profile" className="w-8 h-8 rounded-full border border-gray-200" referrerPolicy="no-referrer" />
                <button 
                  onClick={() => logout()}
                  className="p-2 text-gray-400 hover:text-fujitsu-red transition-colors"
                  title="Logout"
                >
                  <LogOut className="w-5 h-5" />
                </button>
              </div>
            ) : (
              <button 
                onClick={async () => await loginWithGoogle()}
                className="flex items-center gap-2 bg-fujitsu-red text-white px-4 py-2 rounded-full text-sm font-bold hover:bg-red-700 transition-colors"
              >
                <LogIn className="w-4 h-4" /> Log In
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {currentView === 'explore' ? (
          <>
            {/* Hero Section */}
            <section className="mb-12 relative overflow-hidden rounded-2xl bg-fujitsu-dark text-white p-8 md:p-12">
              <div className="relative z-10 max-w-2xl">
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6 }}
                >
                  <span className="inline-block px-3 py-1 bg-fujitsu-red text-[10px] font-bold uppercase tracking-widest rounded-full mb-4">
                    Featured Collection
                  </span>
                  <h2 className="text-4xl md:text-6xl font-bold mb-6 leading-tight">
                    Technology Meets <br />
                    <span className="italic font-serif text-fujitsu-red">Cinematic Vision</span>
                  </h2>
                  <p className="text-gray-400 text-lg mb-8 leading-relaxed">
                    Explore the intersection of Fujitsu's technological innovation and the world of cinema. From early productions to modern digital storytelling.
                  </p>
                  <div className="flex flex-wrap gap-4">
                    <button className="bg-fujitsu-red hover:bg-red-700 text-white px-6 py-3 rounded-full font-bold flex items-center gap-2 transition-all">
                      <Play className="w-4 h-4 fill-current" /> Start Exploring
                    </button>
                  </div>
                </motion.div>
              </div>
              
              <div className="absolute top-0 right-0 w-1/2 h-full opacity-20 pointer-events-none">
                <div className="absolute inset-0 bg-gradient-to-l from-fujitsu-dark to-transparent z-10" />
                <img 
                  src="https://picsum.photos/seed/fujitsu-tech/800/600" 
                  alt="Tech Background" 
                  className="w-full h-full object-cover grayscale"
                  referrerPolicy="no-referrer"
                />
              </div>
            </section>

            {/* Movie Grid */}
            <div className="flex flex-col md:flex-row gap-8">
              <div className="flex-1">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-sm font-bold uppercase tracking-widest text-gray-500 flex items-center gap-2">
                    <ChevronRight className="w-4 h-4 text-fujitsu-red" /> 
                    {searchQuery ? `Results for "${searchQuery}"` : "Recommended Discoveries"}
                  </h3>
                </div>

                {loading ? (
                  <div className="flex flex-col items-center justify-center py-24 text-gray-400">
                    <Loader2 className="w-12 h-12 animate-spin mb-4 text-fujitsu-red" />
                    <p className="font-mono text-sm uppercase tracking-widest">Accessing Fujitsu Archives...</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    <AnimatePresence mode="popLayout">
                      {movies.map((movie, index) => {
                        const isBookmarked = bookmarks.some(b => b.movieTitle === movie.title);
                        return (
                          <motion.div
                            key={movie.title + index}
                            layout
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.9 }}
                            transition={{ duration: 0.3, delay: index * 0.05 }}
                            className="group bg-white rounded-xl border border-gray-200 overflow-hidden hover:shadow-xl hover:border-fujitsu-red/30 transition-all cursor-pointer"
                            onClick={() => setSelectedMovie(movie)}
                          >
                            <div className="aspect-video relative overflow-hidden bg-gray-100">
                              <img 
                                src={`https://picsum.photos/seed/${movie.title}/400/225`} 
                                alt={movie.title}
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                referrerPolicy="no-referrer"
                              />
                              <div className="absolute top-3 right-3 flex gap-2">
                                <button 
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    toggleBookmark(movie);
                                  }}
                                  className={`p-2 rounded-lg backdrop-blur shadow-sm transition-all ${isBookmarked ? 'bg-fujitsu-red text-white' : 'bg-white/90 text-gray-400 hover:text-fujitsu-red'}`}
                                >
                                  <BookmarkIcon className={`w-4 h-4 ${isBookmarked ? 'fill-current' : ''}`} />
                                </button>
                                <div className="bg-white/90 backdrop-blur px-2 py-1 rounded text-[10px] font-bold text-fujitsu-dark uppercase flex items-center">
                                  {movie.year}
                                </div>
                              </div>
                            </div>
                            <div className="p-5">
                              <h4 className="font-bold text-lg mb-2 group-hover:text-fujitsu-red transition-colors line-clamp-1">
                                {movie.title}
                              </h4>
                              <p className="text-gray-500 text-sm line-clamp-2 mb-4">
                                {movie.description}
                              </p>
                              <div className="pt-4 border-t border-gray-100 flex items-center justify-between">
                                <span className="text-[10px] font-mono text-gray-400 uppercase tracking-tighter">
                                  Ref: FJ-{Math.floor(Math.random() * 9000) + 1000}
                                </span>
                                <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-fujitsu-red transition-colors" />
                              </div>
                            </div>
                          </motion.div>
                        );
                      })}
                    </AnimatePresence>
                  </div>
                )}
              </div>

              {/* Sidebar */}
              <aside className="w-full md:w-72 space-y-6">
                {user && (
                  <div className="bg-white rounded-xl border border-gray-200 p-6">
                    <h4 className="font-bold text-sm uppercase tracking-widest mb-4 flex items-center gap-2">
                      <BookmarkIcon className="w-4 h-4 text-fujitsu-red" /> My Bookmarks
                    </h4>
                    <div className="space-y-3">
                      {bookmarks.length === 0 ? (
                        <p className="text-xs text-gray-400 italic">No bookmarks yet.</p>
                      ) : (
                        bookmarks.map((b) => (
                          <div key={b.id} className="flex items-center justify-between group">
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium truncate">{b.movieTitle}</p>
                              <p className="text-[10px] text-gray-400">{b.movieYear}</p>
                            </div>
                            <button 
                              onClick={() => deleteDoc(doc(db, `users/${user.uid}/bookmarks`, b.id))}
                              className="opacity-0 group-hover:opacity-100 p-1 text-gray-300 hover:text-red-500 transition-all"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}

                <div className="bg-white rounded-xl border border-gray-200 p-6">
                  <h4 className="font-bold text-sm uppercase tracking-widest mb-4 flex items-center gap-2">
                    <Info className="w-4 h-4 text-fujitsu-red" /> Quick Stats
                  </h4>
                  <div className="space-y-4">
                    <div className="flex justify-between items-end border-b border-gray-50 pb-2">
                      <span className="text-xs text-gray-500 uppercase">Total Productions</span>
                      <span className="font-mono font-bold text-fujitsu-red">124</span>
                    </div>
                    <div className="flex justify-between items-end border-b border-gray-50 pb-2">
                      <span className="text-xs text-gray-500 uppercase">Tech Innovations</span>
                      <span className="font-mono font-bold text-fujitsu-red">42</span>
                    </div>
                  </div>
                </div>
              </aside>
            </div>
          </>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-16"
          >
            <div className="text-center max-w-2xl mx-auto mb-16">
              <h2 className="text-4xl font-bold mb-4 uppercase tracking-tighter">Future Releases</h2>
              <p className="text-gray-500 leading-relaxed">
                Stay updated with upcoming cinematic releases and technological showcases from Fujitsu. Mark your calendars for these exclusive premieres.
              </p>
            </div>

            <div className="space-y-32">
              {scheduleData.map((yearGroup) => (
                <div key={yearGroup.year} className="relative">
                  <div className="sticky top-24 z-10 mb-12 flex items-center gap-4">
                    <h3 className="text-8xl font-bold text-gray-200 uppercase tracking-tighter leading-none select-none">
                      {yearGroup.year}
                    </h3>
                    <div className="h-[2px] flex-1 bg-gray-100" />
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-12 gap-y-16">
                    {yearGroup.months.map((month) => {
                      const eventDays = month.events.map(e => {
                        const dayMatch = e.date.match(/\d+/);
                        return dayMatch ? parseInt(dayMatch[0]) : null;
                      }).filter(Boolean) as number[];

                      return (
                        <div key={month.name} className="relative pl-8 border-l-2 border-fujitsu-red/20">
                          <div className="absolute -left-[6px] top-0 w-3 h-3 bg-fujitsu-red rounded-full shadow-[0_0_10px_rgba(255,0,0,0.3)]" />
                          <div className="flex justify-between items-start mb-6">
                            <span className="block text-xs font-bold text-fujitsu-red uppercase tracking-[0.2em]">
                              {month.name}
                            </span>
                          </div>
                          
                          {/* Day Grid 1-31 */}
                          <div className="grid grid-cols-7 gap-1 mb-8">
                            {Array.from({ length: 31 }, (_, i) => i + 1).map((day) => {
                              const hasEvent = eventDays.includes(day);
                              return (
                                <div 
                                  key={day}
                                  className={`aspect-square flex items-center justify-center text-[8px] font-mono rounded-sm transition-all ${
                                    hasEvent 
                                      ? 'bg-fujitsu-red text-white font-bold shadow-[0_0_8px_rgba(255,0,0,0.4)]' 
                                      : 'bg-gray-100 text-gray-300 hover:bg-gray-200'
                                  }`}
                                  title={hasEvent ? `Event on ${month.name} ${day}` : undefined}
                                >
                                  {day}
                                </div>
                              );
                            })}
                          </div>

                          <div className="space-y-10">
                            {month.events.map((event) => (
                              <div key={`${event.title}-${event.date}`} className="group">
                                <div className="flex items-center gap-2 mb-2">
                                  <Calendar className="w-3 h-3 text-gray-400" />
                                  <p className="text-[10px] font-mono text-gray-400 uppercase">{event.date}</p>
                                </div>
                                <h4 className="text-lg font-bold mb-2 group-hover:text-fujitsu-red transition-colors">
                                  {event.title}
                                </h4>
                                <p className="text-sm text-gray-500 leading-relaxed font-light">
                                  {event.desc}
                                </p>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 mt-20 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-12">
            <div className="col-span-1 md:col-span-2">
              <div className="flex items-center gap-3 mb-4">
                <img src="/logo.png" alt="Fujitsu Logo" className="h-6 w-auto" referrerPolicy="no-referrer" />
              </div>
              <p className="text-gray-500 text-sm max-w-md leading-relaxed">
                Dedicated to preserving and showcasing the cinematic history and technological contributions of Fujitsu. A digital archive for researchers, fans, and tech enthusiasts.
              </p>
            </div>
          </div>
          <div className="pt-8 border-t border-gray-100 flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-xs text-gray-400 font-mono">
              © 2026 FUJITSU. ALL RIGHTS RESERVED.
            </p>
          </div>
        </div>
      </footer>

      {/* Movie Modal */}
      <AnimatePresence>
        {selectedMovie && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedMovie(null)}
              className="absolute inset-0 bg-fujitsu-dark/80 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative bg-white w-full max-w-3xl rounded-2xl overflow-hidden shadow-2xl"
            >
              <div className="aspect-video relative">
                <img 
                  src={`https://picsum.photos/seed/${selectedMovie.title}/1200/675`} 
                  alt={selectedMovie.title}
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
                <button 
                  onClick={() => setSelectedMovie(null)}
                  className="absolute top-4 right-4 bg-black/50 hover:bg-black/70 text-white p-2 rounded-full transition-colors"
                >
                  <Search className="w-5 h-5 rotate-45" />
                </button>
              </div>
              <div className="p-8">
                <div className="flex items-center gap-3 mb-4">
                  <span className="bg-fujitsu-red text-white text-[10px] font-bold px-2 py-1 rounded uppercase">
                    {selectedMovie.year}
                  </span>
                </div>
                <h2 className="text-3xl font-bold mb-4">{selectedMovie.title}</h2>
                <p className="text-gray-600 leading-relaxed mb-6">
                  {selectedMovie.description}
                </p>
                <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                  <h4 className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-2">Fujitsu Relevance</h4>
                  <p className="text-sm text-gray-700 italic">
                    {selectedMovie.relevance}
                  </p>
                </div>
                <div className="mt-8 flex justify-end gap-4">
                  <button 
                    onClick={() => toggleBookmark(selectedMovie)}
                    className={`px-6 py-2 rounded-full font-bold flex items-center gap-2 transition-all ${bookmarks.some(b => b.movieTitle === selectedMovie.title) ? 'bg-fujitsu-red text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                  >
                    <BookmarkIcon className={`w-4 h-4 ${bookmarks.some(b => b.movieTitle === selectedMovie.title) ? 'fill-current' : ''}`} />
                    {bookmarks.some(b => b.movieTitle === selectedMovie.title) ? 'Bookmarked' : 'Bookmark'}
                  </button>
                  <button className="bg-fujitsu-red text-white px-8 py-2 rounded-full font-bold hover:bg-red-700 transition-colors flex items-center gap-2">
                    <ExternalLink className="w-4 h-4" /> View Full Archive
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <MainApp />
    </ErrorBoundary>
  );
}
