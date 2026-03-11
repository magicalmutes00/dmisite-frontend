import { useState, useEffect } from 'react';
import { db, auth } from './firebase';
import {
    doc, setDoc, onSnapshot
} from 'firebase/firestore';
import {
    signInWithEmailAndPassword, signOut, onAuthStateChanged
} from 'firebase/auth';
import type { User } from 'firebase/auth';

// ---- Types ----
export interface TimelineEvent {
    time: string;
    title: string;
    desc: string;
    type?: 'sports' | 'college';
}

export interface GalleryImage {
    url: string;
    type: 'sports' | 'college';
    label?: string;
}

export interface SiteData {
    boysSchedule: string;
    girlsSchedule: string;
    matchSchedule: string;
    announcements: string[];
    galleryImages: GalleryImage[];
    timeline: TimelineEvent[];
    sportsEvents: string[];
    collegeEvents: string[];
    leaders: {
        red: { name: string; image: string };
        green: { name: string; image: string };
        yellow: { name: string; image: string };
        blue: { name: string; image: string };
    };
    videos: { title: string; link: string }[];
    coordinators: { name: string; image: string; type: string }[];
}

const DEFAULT_TIMELINE: TimelineEvent[] = [
    { time: '8:00 AM', title: 'Registration & Assembly', desc: 'Participant check-in and opening ceremony', type: 'sports' },
    { time: '9:00 AM', title: 'Sports Events Begin', desc: 'Track and field events commence', type: 'sports' },
    { time: '11:00 AM', title: 'Team Sports', desc: 'Cricket, Football, Volleyball matches', type: 'sports' },
    { time: '1:00 PM', title: 'Lunch Break', desc: 'Refreshments for all participants', type: 'sports' },
    { time: '2:00 PM', title: 'Cultural Events', desc: 'Dance, singing, and drama performances', type: 'college' },
    { time: '4:00 PM', title: 'Fashion Show & Art', desc: 'Creative showcases and exhibitions', type: 'college' },
    { time: '5:30 PM', title: 'Prize Distribution', desc: 'Awards ceremony for winners', type: 'college' },
    { time: '6:30 PM', title: 'Closing Ceremony', desc: 'Vote of thanks and conclusion', type: 'college' }
];

export const DEFAULT_DATA: SiteData = {
    boysSchedule: '',
    girlsSchedule: '',
    matchSchedule: '',
    announcements: [],
    galleryImages: [],
    timeline: DEFAULT_TIMELINE,
    sportsEvents: [
        '100m Race & Relay', 'Cricket Tournament', 'Football Championship',
        'Volleyball & Kabaddi', 'Girls: Throwball & Kho-Kho', 'Chess & Carrom Board'
    ],
    collegeEvents: [
        'Dance Performances', 'Singing Competitions', 'Drama & Theatre',
        'Fashion Show', 'Art Exhibition', 'Talent Show'
    ],
    leaders: {
        red: { name: 'Add Leader Name', image: '' },
        green: { name: 'Add Leader Name', image: '' },
        yellow: { name: 'Add Leader Name', image: '' },
        blue: { name: 'Add Leader Name', image: '' }
    },
    videos: [
        { title: 'Internship Experience GenLab', link: '#' },
        { title: 'Volley Ball Tournament', link: '#' },
        { title: 'Drone Hackathon', link: '#' },
        { title: 'Student Testimonial', link: '#' }
    ],
    coordinators: [
        { name: 'John Doe', image: 'https://picsum.photos/300/300?random=21', type: 'sports' },
        { name: 'Jane Smith', image: 'https://picsum.photos/300/300?random=22', type: 'college' }
    ]
};

// Firestore document reference - all site data in one document
const siteDataRef = doc(db, 'siteData', 'main');

// ========================================
// HOOK: useSiteData - replaces localStorage reads
// Use this in both Home and Admin components
// ========================================
export function useSiteData() {
    const [data, setData] = useState<SiteData>(DEFAULT_DATA);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Real-time listener - updates automatically when data changes in Firestore
        const unsubscribe = onSnapshot(siteDataRef, (snapshot: any) => {
            if (snapshot.exists()) {
                setData({ ...DEFAULT_DATA, ...snapshot.data() } as SiteData);
            } else {
                // First time: initialize Firestore with defaults
                setDoc(siteDataRef, DEFAULT_DATA).catch(console.error);
                setData(DEFAULT_DATA);
            }
            setLoading(false);
        }, (error: any) => {
            console.error('Firebase error:', error);
            // Fallback to localStorage if Firebase fails
            setData({
                boysSchedule: localStorage.getItem('boysSchedule') || '',
                girlsSchedule: localStorage.getItem('girlsSchedule') || '',
                matchSchedule: localStorage.getItem('matchSchedule') || '',
                announcements: JSON.parse(localStorage.getItem('announcements') || '[]'),
                galleryImages: JSON.parse(localStorage.getItem('galleryImages') || '[]'),
                timeline: JSON.parse(localStorage.getItem('timelineEvents') || JSON.stringify(DEFAULT_DATA.timeline)),
                sportsEvents: JSON.parse(localStorage.getItem('sportsEvents') || JSON.stringify(DEFAULT_DATA.sportsEvents)),
                collegeEvents: JSON.parse(localStorage.getItem('collegeEvents') || JSON.stringify(DEFAULT_DATA.collegeEvents)),
                leaders: JSON.parse(localStorage.getItem('houseLeaders') || JSON.stringify(DEFAULT_DATA.leaders)),
                videos: JSON.parse(localStorage.getItem('videos') || JSON.stringify(DEFAULT_DATA.videos)),
                coordinators: JSON.parse(localStorage.getItem('coordinators') || JSON.stringify(DEFAULT_DATA.coordinators)),
            });
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    return { data, loading };
}

// ========================================
// SAVE: Update site data in Firestore
// Replaces all localStorage.setItem calls
// ========================================
export async function saveSiteData(updates: Partial<SiteData>) {
    try {
        await setDoc(siteDataRef, updates, { merge: true });
    } catch (error) {
        console.error('Error saving to Firebase:', error);
        // Fallback: also save to localStorage
        Object.entries(updates).forEach(([key, value]) => {
            localStorage.setItem(key, typeof value === 'string' ? value : JSON.stringify(value));
        });
    }
}

// ========================================
// UPLOAD: Convert image to base64 string
// Stores directly in Firestore (no Storage needed - free!)
// ========================================
export async function uploadFile(file: File, _path: string): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (event) => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const maxSize = 800;
                let { width, height } = img;
                if (width > maxSize || height > maxSize) {
                    if (width > height) {
                        height = (height / width) * maxSize;
                        width = maxSize;
                    } else {
                        width = (width / height) * maxSize;
                        height = maxSize;
                    }
                }
                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d')!;
                ctx.drawImage(img, 0, 0, width, height);
                resolve(canvas.toDataURL('image/jpeg', 0.7));
            };
            img.onerror = reject;
            img.src = event.target?.result as string;
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}

// ========================================
// AUTH: Firebase authentication for admin
// ========================================
export async function loginAdmin(email: string, password: string): Promise<User> {
    const result = await signInWithEmailAndPassword(auth, email, password);
    return result.user;
}

export async function logoutAdmin(): Promise<void> {
    await signOut(auth);
}

export function useAdminAuth() {
    const [user, setUser] = useState<User | null>(null);
    const [checking, setChecking] = useState(true);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (u: User | null) => {
            setUser(u);
            setChecking(false);
        });
        return () => unsubscribe();
    }, []);

    return { user, checking };
}