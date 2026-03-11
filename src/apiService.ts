// API Service Layer - Replaces firebaseService.ts
// All communication goes through the Express backend

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

// ============================================================
// Types
// ============================================================

export interface LinkItem {
    title: string;
    url: string;
}

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
    publicId?: string;
}

export interface HouseLeader {
    name: string;
    image: string;
    publicId?: string;
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
    publicId?: string;
}

export interface SiteData {
    boysSchedule: string;
    girlsSchedule: string;
    matchSchedule: string;
    announcements: string[];
    links: LinkItem[];
    galleryImages: GalleryImage[];
    timeline: TimelineEvent[];
    sportsEvents: string[];
    collegeEvents: string[];
    leaders: HouseLeaders;
    videos: VideoItem[];
    coordinators: Coordinator[];
}

// ============================================================
// Auth helpers
// ============================================================

function getToken(): string | null {
    return localStorage.getItem('admin_token');
}

function authHeaders(): HeadersInit {
    const token = getToken();
    return token ? { 'Authorization': `Bearer ${token}` } : {};
}

// ============================================================
// Auth Functions
// ============================================================

export async function adminLogin(password: string): Promise<string> {
    const res = await fetch(`${API_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password })
    });

    if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Login failed' }));
        throw new Error(err.error || 'Login failed');
    }

    const data = await res.json();
    localStorage.setItem('admin_token', data.token);
    return data.token;
}

export async function adminLogout(): Promise<void> {
    localStorage.removeItem('admin_token');
}

export async function verifyAdminToken(): Promise<boolean> {
    const token = getToken();
    if (!token) return false;

    try {
        const res = await fetch(`${API_URL}/api/auth/verify`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        return res.ok;
    } catch {
        return false;
    }
}

// ============================================================
// Site Data Functions
// ============================================================

export async function getSiteData(): Promise<SiteData> {
    const res = await fetch(`${API_URL}/api/site`);
    if (!res.ok) throw new Error('Failed to fetch site data');
    return res.json();
}

export async function updateSiteData(updates: Partial<SiteData>): Promise<SiteData> {
    const res = await fetch(`${API_URL}/api/site`, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
            ...authHeaders()
        },
        body: JSON.stringify(updates)
    });

    if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Update failed' }));
        throw new Error(err.error || 'Update failed');
    }

    return res.json();
}

// ============================================================
// Image Upload Functions
// ============================================================

export async function uploadImage(file: File, folder: string): Promise<{ url: string; publicId: string }> {
    const formData = new FormData();
    formData.append('file', file);
    // folder sent as query param — multer reads req.body AFTER parsing multipart,
    // so body fields are unavailable inside CloudinaryStorage.params()
    const encodedFolder = encodeURIComponent(`college-day/${folder}`);

    const res = await fetch(`${API_URL}/api/upload?folder=${encodedFolder}`, {
        method: 'POST',
        headers: authHeaders(),
        body: formData
    });

    if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Upload failed' }));
        throw new Error(err.error || 'Upload failed');
    }

    return res.json();
}

export async function deleteImage(publicId: string): Promise<void> {
    // publicId may contain slashes (e.g. "college-day/gallery/abc123")
    // encode each segment individually so slashes aren't double-encoded
    const encoded = publicId.split('/').map(encodeURIComponent).join('/');
    await fetch(`${API_URL}/api/upload/${encoded}`, {
        method: 'DELETE',
        headers: authHeaders()
    });
}

// ============================================================
// Convenience upload helpers (match old firebaseService API)
// ============================================================

export async function uploadScheduleImage(
    file: File,
    type: 'boysSchedule' | 'girlsSchedule' | 'matchSchedule'
): Promise<string> {
    const { url } = await uploadImage(file, 'schedules');
    await updateSiteData({ [type]: url });
    return url;
}

export async function uploadLeaderImage(
    file: File,
    color: keyof HouseLeaders,
    currentLeaders: HouseLeaders
): Promise<string> {
    const { url, publicId } = await uploadImage(file, 'leaders');
    const updatedLeaders = {
        ...currentLeaders,
        [color]: { ...currentLeaders[color], image: url, publicId }
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
        const { url, publicId } = await uploadImage(files[i], 'gallery');
        newImages.push({
            url,
            publicId,
            type: imageType,
            label: files[i].name.split('.')[0]
        });
    }

    const allImages = [...currentImages, ...newImages];
    await updateSiteData({ galleryImages: allImages });
    return allImages;
}

export async function uploadCoordinatorImage(
    file: File,
    _coordinatorName: string
): Promise<string> {
    const { url } = await uploadImage(file, 'coordinators');
    return url;
}
