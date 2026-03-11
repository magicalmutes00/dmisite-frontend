// Firebase Service Layer - Replaces all localStorage operations
import { db, storage, auth } from './firebase';
import {
    doc,
    getDoc,
    setDoc,
    onSnapshot,
} from 'firebase/firestore';
import type { DocumentReference, DocumentData } from 'firebase/firestore';
import {
    ref,
    uploadBytes,
    getDownloadURL,
    deleteObject
} from 'firebase/storage';
import {
    signInWithEmailAndPassword,
    signOut,
    onAuthStateChanged,
} from 'firebase/auth';
import type { User } from 'firebase/auth';

// ============================================================
// Types
// ============================================================

export interface TimelineEvent {
    time: string;
    title: string;
    desc: string;
}

export interface GalleryImage {
    url: string;
    type: 'sports' | 'college';
    label?: string;
}

export interface HouseLeader {
    name: string;
    image: string;
}

export interface HouseLeaders {
    red: HouseLeader;
    green: HouseLeader;
    yellow: HouseLeader;
    blue: HouseLeader;
}

export interface VideoItem {
    title: string;
    link: string;
}

export interface Coordinator {
    name: string;
    image: string;
    type: string;
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
    leaders: HouseLeaders;
    videos: VideoItem[];
    coordinators: Coordinator[];
}

// ============================================================
// Default Data
// ============================================================

export const DEFAULT_TIMELINE: TimelineEvent[] = [
    { time: '8:00 AM', title: 'Registration & Assembly', desc: 'Participant check-in and opening ceremony' },
    { time: '9:00 AM', title: 'Sports Events Begin', desc: 'Track and field events commence' },
    { time: '11:00 AM', title: 'Team Sports', desc: 'Cricket, Football, Volleyball matches' },
    { time: '1:00 PM', title: 'Lunch Break', desc: 'Refreshments for all participants' },
    { time: '2:00 PM', title: 'Cultural Events', desc: 'Dance, singing, and drama performances' },
    { time: '4:00 PM', title: 'Fashion Show & Art', desc: 'Creative showcases and exhibitions' },
    { time: '5:30 PM', title: 'Prize Distribution', desc: 'Awards ceremony for winners' },
    { time: '6:30 PM', title: 'Closing Ceremony', desc: 'Vote of thanks and conclusion' }
];

export const DEFAULT_SPORTS_EVENTS = [
    '100m Race & Relay', 'Cricket Tournament', 'Football Championship',
    'Volleyball & Kabaddi', 'Girls: Throwball & Kho-Kho', 'Chess & Carrom Board'
];

export const DEFAULT_COLLEGE_EVENTS = [
    'Dance Performances', 'Singing Competitions', 'Drama & Theatre',
    'Fashion Show', 'Art Exhibition', 'Talent Show'
];

export const DEFAULT_LEADERS: HouseLeaders = {
    red: { name: 'Add Leader Name', image: '' },
    green: { name: 'Add Leader Name', image: '' },
    yellow: { name: 'Add Leader Name', image: '' },
    blue: { name: 'Add Leader Name', image: '' }
};

export const DEFAULT_VIDEOS: VideoItem[] = [
    { title: 'Internship Experience GenLab', link: '#' },
    { title: 'Volley Ball Tournament', link: '#' },
    { title: 'Drone Hackathon', link: '#' },
    { title: 'Student Testimonial', link: '#' }
];

export const DEFAULT_COORDINATORS: Coordinator[] = [
    { name: 'John Doe', image: 'https://picsum.photos/300/300?random=21', type: 'sports' },
    { name: 'Jane Smith', image: 'https://picsum.photos/300/300?random=22', type: 'college' }
];

export const DEFAULT_SITE_DATA: SiteData = {
    boysSchedule: '',
    girlsSchedule: '',
    matchSchedule: '',
    announcements: [],
    galleryImages: [],
    timeline: DEFAULT_TIMELINE,
    sportsEvents: DEFAULT_SPORTS_EVENTS,
    collegeEvents: DEFAULT_COLLEGE_EVENTS,
    leaders: DEFAULT_LEADERS,
    videos: DEFAULT_VIDEOS,
    coordinators: DEFAULT_COORDINATORS
};

// ============================================================
// Firestore Document Reference
// We store ALL site data in a single Firestore document
// Path: siteData/main
// ============================================================

const siteDataRef: DocumentReference<DocumentData> = doc(db, 'siteData', 'main');

// ============================================================
// READ: Get site data once
// ============================================================

export async function getSiteData(): Promise<SiteData> {
    try {
        const snapshot = await getDoc(siteDataRef);
        if (snapshot.exists()) {
            return { ...DEFAULT_SITE_DATA, ...snapshot.data() } as SiteData;
        }
        // If no data exists yet, initialize with defaults
        await setDoc(siteDataRef, DEFAULT_SITE_DATA);
        return DEFAULT_SITE_DATA;
    } catch (error) {
        console.error('Error fetching site data:', error);
        return DEFAULT_SITE_DATA;
    }
}

// ============================================================
// REALTIME: Subscribe to site data changes
// This replaces the localStorage 'storage' event listener
// ============================================================

export function subscribeSiteData(callback: (data: SiteData) => void): () => void {
    return onSnapshot(siteDataRef, (snapshot: any) => {
        if (snapshot.exists()) {
            callback({ ...DEFAULT_SITE_DATA, ...snapshot.data() } as SiteData);
        } else {
            callback(DEFAULT_SITE_DATA);
        }
    }, (error: any) => {
        console.error('Error subscribing to site data:', error);
    });
}

// ============================================================
// WRITE: Update specific fields in site data
// ============================================================

export async function updateSiteData(updates: Partial<SiteData>): Promise<void> {
    try {
        await setDoc(siteDataRef, updates, { merge: true });
    } catch (error) {
        console.error('Error updating site data:', error);
        throw error;
    }
}

// ============================================================
// STORAGE: Upload images to Firebase Storage
// Returns the public download URL
// ============================================================

export async function uploadImage(file: File, path: string): Promise<string> {
    try {
        const storageRef = ref(storage, path);
        const snapshot = await uploadBytes(storageRef, file);
        const downloadURL = await getDownloadURL(snapshot.ref);
        return downloadURL;
    } catch (error) {
        console.error('Error uploading image:', error);
        throw error;
    }
}

export async function deleteImage(path: string): Promise<void> {
    try {
        const storageRef = ref(storage, path);
        await deleteObject(storageRef);
    } catch (error) {
        console.error('Error deleting image:', error);
        // Don't throw - image might already be deleted
    }
}

// ============================================================
// AUTH: Admin authentication
// ============================================================

export async function adminLogin(email: string, password: string): Promise<User> {
    try {
        const result = await signInWithEmailAndPassword(auth, email, password);
        return result.user;
    } catch (error) {
        console.error('Login error:', error);
        throw error;
    }
}

export async function adminLogout(): Promise<void> {
    try {
        await signOut(auth);
    } catch (error) {
        console.error('Logout error:', error);
        throw error;
    }
}

export function onAuthChange(callback: (user: User | null) => void): () => void {
    return onAuthStateChanged(auth, callback);
}

// ============================================================
// HELPER: Upload schedule/leader image & update Firestore
// ============================================================

export async function uploadScheduleImage(
    file: File,
    type: 'boysSchedule' | 'girlsSchedule' | 'matchSchedule'
): Promise<string> {
    const path = `schedules/${type}_${Date.now()}_${file.name}`;
    const url = await uploadImage(file, path);
    await updateSiteData({ [type]: url });
    return url;
}

export async function uploadLeaderImage(
    file: File,
    color: keyof HouseLeaders,
    currentLeaders: HouseLeaders
): Promise<string> {
    const path = `leaders/${color}_${Date.now()}_${file.name}`;
    const url = await uploadImage(file, path);
    const updatedLeaders = {
        ...currentLeaders,
        [color]: { ...currentLeaders[color], image: url }
    };
    await updateSiteData({ leaders: updatedLeaders });
    return url;
}

export async function uploadGalleryImages(
    files: FileList,
    imageType: 'sports' | 'college',
    currentImages: GalleryImage[]
): Promise<GalleryImage[]> {
    const newImages: GalleryImage[] = [];

    for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const path = `gallery/${imageType}_${Date.now()}_${i}_${file.name}`;
        const url = await uploadImage(file, path);
        newImages.push({
            url,
            type: imageType,
            label: file.name.split('.')[0]
        });
    }

    const allImages = [...currentImages, ...newImages];
    await updateSiteData({ galleryImages: allImages });
    return allImages;
}

export async function uploadCoordinatorImage(
    file: File,
    coordinatorName: string
): Promise<string> {
    const path = `coordinators/${coordinatorName}_${Date.now()}_${file.name}`;
    const url = await uploadImage(file, path);
    return url;
}
