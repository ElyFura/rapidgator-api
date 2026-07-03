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
    email: string;
    is_premium: boolean;
    premium_end_time?: number | null;
    state?: number;
    state_label?: string;
    traffic?: { total: number | null; left: number | null };
    storage?: { total: string; left: number };
    upload?: { max_file_size: number; nb_pipes: number };
    remote_upload?: { max_nb_jobs: number; refresh_time: number };
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
    name: string;
    hash: string;
    size: number;
    created: number;
    mode?: number;
    mode_label?: string;
    folder_id?: string;
    url?: string;
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

    initUpload(filename: string, filesize: number, folderId?: string, hash?: string): Promise<UploadInfo>;
    uploadFile(file: File, folderId?: string, onProgress?: (progress: number) => void): Promise<UploadResult>;
    uploadFileNode(filePath: string, filename?: string, folderId?: string, onProgress?: (progress: any) => void): Promise<UploadResult>;

    getFileInfo(fileId: string): Promise<FileInfo>;
    getDownloadUrl(fileId: string): Promise<any>;
    deleteFile(fileId: string): Promise<any>;

    createFolder(name: string, parentId?: string): Promise<any>;
    getFolderContent(folderId?: string): Promise<any>;
    deleteFolder(folderId: string | string[]): Promise<any>;

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
    validateConfig(config: any): { isValid: boolean; errors: string[] };
    generateHash(length?: number): string;
    buildApiUrl(baseUrl: string, endpoint: string, params?: Record<string, any>): string;
    handleApiError(error: any, context?: string): Error;
    detectFileType(filename: string): string;
    md5(input: string | ArrayLike<number>): string;
};

export default RapidGatorAPI;