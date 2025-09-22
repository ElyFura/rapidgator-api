// Dateiname: types/index.d.ts

export interface RapidGatorOptions {
    baseURL?: string;
    timeout?: number;
    retryCount?: number;
    retryDelay?: number;
}

export interface LoginResponse {
    token: string;
    sessionId: string;
    user: any;
}

export interface UserInfo {
    is_premium: boolean;
    login: string;
    email: string;
    expire_date?: string;
    traffic_left?: number;
    // weitere Eigenschaften...
}

export interface UploadInfo {
    upload_url: string;
    file_id: string;
    // weitere Eigenschaften...
}

export interface UploadResult {
    uploadInfo: UploadInfo;
    uploadResult: any;
    fileId: string;
}

export interface FileInfo {
    file_id: string;
    filename: string;
    size: number;
    upload_date: string;
    download_url?: string;
    // weitere Eigenschaften...
}

export interface BatchProgress {
    completed: number;
    total: number;
    progress: number;
    current: string;
}

export interface BatchResult {
    fileId: string;
    success: boolean;
    result?: any;
    error?: string;
    downloadUrl?: string;
}

export declare class RapidGatorAPI {
    constructor(login?: string, password?: string, options?: RapidGatorOptions);

    login(login?: string, password?: string): Promise<LoginResponse>;
    setToken(token: string): void;
    getUserInfo(): Promise<UserInfo>;
    isPremium(): Promise<boolean>;

    initUpload(filename: string, filesize: number, folderId?: string): Promise<UploadInfo>;
    uploadFile(file: File, folderId?: string, onProgress?: (progress: number) => void): Promise<UploadResult>;
    uploadFileNode(filePath: string, filename?: string, folderId?: string, onProgress?: (progress: any) => void): Promise<UploadResult>;

    getFileInfo(fileId: string): Promise<FileInfo>;
    getDownloadUrl(fileId: string): Promise<any>;
    deleteFile(fileId: string): Promise<any>;

    createFolder(name: string, parentId?: string): Promise<any>;
    getFolderContent(folderId?: string): Promise<any>;
    deleteFolder(folderId: string): Promise<any>;

    getFileList(page?: number, perPage?: number, folderId?: string): Promise<any>;
    getAllFiles(folderId?: string, onProgress?: (progress: any) => void): Promise<FileInfo[]>;

    batchDeleteFiles(fileIds: string[], onProgress?: (progress: BatchProgress) => void): Promise<BatchResult[]>;
    batchGetDownloadUrls(fileIds: string[], onProgress?: (progress: BatchProgress) => void): Promise<BatchResult[]>;

    extractFileIdFromUrl(url: string): string | null;
    getFileInfoFromUrl(url: string): Promise<FileInfo>;

    formatFileSize(bytes: number): string;
    isValidFileId(fileId: string): boolean;

    refreshSession(): Promise<LoginResponse>;
    logout(): Promise<void>;
    healthCheck(): Promise<boolean>;
}

export declare const utils: {
    isValidRapidGatorUrl(url: string): boolean;
    extractFileId(url: string): string | null;
    formatBytes(bytes: number, decimals?: number): string;
    sleep(ms: number): Promise<void>;
    retry<T>(fn: () => Promise<T>, retries?: number, delay?: number): Promise<T>;
    ProgressTracker: any;
    RateLimiter: any;
    validateConfig(config: any): string[];
};

export default RapidGatorAPI;