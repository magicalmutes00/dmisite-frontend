import { useState, useEffect, useCallback } from 'react';
import {
    getSiteData,
    adminLogin as loginFn,
    adminLogout as logoutFn,
    verifyAdminToken,
    updateSiteData,
    uploadImage
} from './apiService';
import type { SiteData, GalleryImage, HouseLeaders } from './apiService';

// Re-export types for components that import from this file
export type { SiteData, GalleryImage, HouseLeaders };
export type { TimelineEvent, VideoItem, Coordinator } from './apiService';

// ============================================================
// Default Data (used as initial state before API responds)
// ============================================================

export const DEFAULT_DATA: SiteData = {
    boysSchedule: '',
    girlsSchedule: '',
    matchSchedule: '',
    announcements: [],
    galleryImages: [],
    timeline: [
        { time: '8:00 AM', title: 'Registration & Assembly', desc: 'Participant check-in and opening ceremony', type: 'sports' },
        { time: '9:00 AM', title: 'Sports Events Begin', desc: 'Track and field events commence', type: 'sports' },
        { time: '11:00 AM', title: 'Team Sports', desc: 'Cricket, Football, Volleyball matches', type: 'sports' },
        { time: '1:00 PM', title: 'Lunch Break', desc: 'Refreshments for all participants', type: 'sports' },
        { time: '2:00 PM', title: 'Cultural Events', desc: 'Dance, singing, and drama performances', type: 'college' },
        { time: '4:00 PM', title: 'Fashion Show & Art', desc: 'Creative showcases and exhibitions', type: 'college' },
        { time: '5:30 PM', title: 'Prize Distribution', desc: 'Awards ceremony for winners', type: 'college' },
        { time: '6:30 PM', title: 'Closing Ceremony', desc: 'Vote of thanks and conclusion', type: 'college' }
    ],
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

// ============================================================
// HOOK: useSiteData
// Fetches site data from backend, polls every 30s for updates
// ============================================================

// ============================================================
// GLOBAL: shared state updater so saveSiteData can trigger re-renders
// ============================================================
let _globalDataUpdater: ((data: SiteData) => void) | null = null;

export function useSiteData() {
    const [data, setData] = useState<SiteData>(DEFAULT_DATA);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Register this hook instance as the global updater
    _globalDataUpdater = setData;

    const fetchData = useCallback(async () => {
        try {
            const siteData = await getSiteData();
            setData({ ...DEFAULT_DATA, ...siteData });
            setError(null); // clear error on success
        } catch (err) {
            console.error('Error fetching site data:', err);
            setError('Could not connect to server. Showing cached data.');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchData();
        // Poll every 30 seconds
        const interval = setInterval(fetchData, 30000);
        return () => clearInterval(interval);
    }, [fetchData]);

    return { data, loading, error, refresh: fetchData };
}

// ============================================================
// SAVE: Update site data via API, then update local state immediately
// ============================================================

export async function saveSiteData(updates: Partial<SiteData>): Promise<void> {
    try {
        const updated = await updateSiteData(updates);
        // Push fresh data to all useSiteData hook instances immediately
        // This fixes the timeline bug where changes only appeared after 30s poll
        if (_globalDataUpdater) {
            _globalDataUpdater({ ...DEFAULT_DATA, ...updated });
        }
    } catch (error) {
        console.error('Error saving data:', error);
        throw error;
    }
}

// ============================================================
// REGISTRATION: Save form data to MongoDB (separate collections)
// ============================================================

export async function saveRegistration(data: Record<string, unknown>): Promise<void> {
    const type = data.type as string; // 'sports' | 'college'
    if (type !== 'sports' && type !== 'college') {
        throw new Error(`Invalid registration type: ${type}`);
    }

    const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
    const res = await fetch(`${API_URL}/api/registrations/${type}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
    });
    if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Registration failed' }));
        throw new Error(err.error || 'Registration failed');
    }
}

// ============================================================
// UPLOAD: Upload file to Cloudinary via backend
// Returns the Cloudinary URL (replaces old base64 canvas method)
// ============================================================

export async function uploadFile(file: File, folder: string): Promise<string> {
    const { url } = await uploadImage(file, folder);
    return url;
}

// ============================================================
// AUTH: Admin authentication via JWT
// ============================================================

export async function loginAdmin(password: string): Promise<void> {
    await loginFn(password);
}

export async function logoutAdmin(): Promise<void> {
    await logoutFn();
}

// ============================================================
// HOOK: useAdminAuth
// Checks JWT token validity on mount (replaces Firebase onAuthStateChanged)
// ============================================================

export function useAdminAuth() {
    const [isAdmin, setIsAdmin] = useState(false);
    const [checking, setChecking] = useState(true);

    useEffect(() => {
        verifyAdminToken().then((valid) => {
            setIsAdmin(valid);
            setChecking(false);
        });
    }, []);

    return { user: isAdmin ? { role: 'admin' } : null, checking, isAdmin };
}

// Helper: force a re-check after login
export function setAdminLoggedIn(value: boolean) {
    // Used by login form to trigger re-renders
    return value;
}
