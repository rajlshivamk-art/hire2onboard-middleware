import axios from 'axios';
import { Job, Candidate, User, Feedback } from '../types';
import { getAccessToken, setAccessToken } from '../types';
// Create axios instance
const apiClient = axios.create({
    baseURL: import.meta.env.VITE_API_URL || '/api',
    withCredentials: true, // Important: Send cookies with requests
    headers: {
        'Content-Type': 'application/json',
    },
});

apiClient.interceptors.request.use((config) => {
    const token = getAccessToken();
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

let isRefreshing = false;
let failedQueue: any[] = [];

const processQueue = (error: any, token: string | null = null) => {
    failedQueue.forEach(prom => {
        if (error) {
            prom.reject(error);
        } else {
            prom.resolve(token);
        }
    });
    failedQueue = [];
};

apiClient.interceptors.response.use(
    response => response,
    async error => {
        const originalRequest = error.config;

        if (error.response?.status === 401 && !originalRequest._retry) {
            if (isRefreshing) {
                return new Promise((resolve, reject) => {
                    failedQueue.push({ resolve, reject });
                }).then(token => {
                    originalRequest.headers.Authorization = `Bearer ${token}`;
                    return apiClient(originalRequest);
                });
            }

            originalRequest._retry = true;
            isRefreshing = true;

            try {
                const { data } = await apiClient.post<{ access_token: string }>(
                    '/auth/refresh',
                    {},
                    { withCredentials: true }
                );

                setAccessToken(data.access_token);
                apiClient.defaults.headers.Authorization = `Bearer ${data.access_token}`;
                processQueue(null, data.access_token);

                return apiClient(originalRequest);
            } catch (err) {
                processQueue(err, null);
                setAccessToken(null);
                return Promise.reject(err);
            } finally {
                isRefreshing = false;
            }
        }

        return Promise.reject(error);
    }
);

export const api = {
    auth: {
        login: async (email: string, password: string) => {
            const response = await apiClient.post<{
                access_token: string;
                user: User;
            }>('/auth/login', { email, password });

            setAccessToken(response.data.access_token); // 🔴 THIS WAS MISSING

            return response.data;
        },
        logout: async () => {
            await apiClient.post('/auth/logout');
            setAccessToken(null);
        },
        forgotPassword: async (email: string) => {
            const response = await apiClient.post('/auth/forgot-password', { email });
            return response.data;
        },
        resetPassword: async (token: string, newPassword: string) => {
            const response = await apiClient.post('/auth/reset-password', { token, new_password: newPassword });
            return response.data;
        },
        refreshAccessToken: async () => {
            const response = await apiClient.post<{ access_token: string }>('/auth/refresh', {}, { withCredentials: true });
            const { access_token } = response.data;
            setAccessToken(access_token);
            return access_token;
        },

    },
    jobs: {
        getAll: async () => {
            const response = await apiClient.get<Job[]>('/jobs/');
            return response.data;
        },
        getById: async (id: string) => {
            const response = await apiClient.get<Job>(`/jobs/${id}`);
            return response.data;
        },
        create: async (jobData: any) => {
            const response = await apiClient.post<Job>('/jobs/', jobData);
            return response.data;
        },
        update: async (id: string, jobData: any) => {
            const response = await apiClient.put<Job>(`/jobs/${id}`, jobData);
            return response.data;
        },
        delete: async (id: string) => {
            await apiClient.delete(`/jobs/${id}`);
        },
    },
    applications: {
        submit: async (applicationData: any) => {
            const response = await apiClient.post<Candidate>('/applications/', applicationData);
            return response.data;
        },
        getAll: async (userId?: string) => {
            const params = userId ? { userId } : {};
            const response = await apiClient.get<Candidate[]>('/applications/', { params });
            return response.data;
        },
        getById: async (id: string) => {
            const response = await apiClient.get<Candidate>(`/applications/${id}`);
            return response.data;
        },
        submitFeedback: async (applicationId: string, feedbackData: any) => {
            const response = await apiClient.post<Feedback>(`/applications/${applicationId}/feedback`, feedbackData);
            return response.data;
        },
        updateFeedback: async (applicationId: string, feedbackId: string, feedbackData: any) => {
            const response = await apiClient.put<Feedback>(`/applications/${applicationId}/feedback/${feedbackId}`, feedbackData);
            return response.data;
        },
        deleteFeedback: async (applicationId: string, feedbackId: string) => {
            await apiClient.delete(`/applications/${applicationId}/feedback/${feedbackId}`);
        },
        updateStage: async (applicationId: string, stage: string, reason?: string) => {
            const response = await apiClient.patch<Candidate>(`/applications/${applicationId}/stage`, { stage, reason });
            return response.data;
        },
        toggleTask: async (applicationId: string, taskId: string) => {
            const response = await apiClient.patch<Candidate>(`/applications/${applicationId}/tasks/${taskId}/toggle`);
            return response.data;
        },
        addTask: async (applicationId: string, task: string) => {
            const response = await apiClient.post<Candidate>(`/applications/${applicationId}/tasks/`, { task });
            return response.data;
        },
        deleteTask: async (applicationId: string, taskId: string) => {
            const response = await apiClient.delete<Candidate>(`/applications/${applicationId}/tasks/${taskId}`);
            return response.data;
        },
        update: async (id: string, updates: any) => {
            const response = await apiClient.patch<Candidate>(`/applications/${id}`, updates);
            return response.data;
        },
        uploadResume: async (file: File) => {
            const formData = new FormData();
            formData.append('file', file);
            const response = await apiClient.post<{ url: string; fileId: string }>('/applications/upload-resume/', formData, {
                headers: {
                    'Content-Type': undefined,
                },
            });
            return response.data;
        },
        sendOffer: async (applicationId: string, offerDetails: { salary: number, startDate: string, additionalTerms?: string, file?: File }) => {
            const formData = new FormData();
            formData.append('salary', offerDetails.salary.toString());
            formData.append('startDate', offerDetails.startDate);
            if (offerDetails.additionalTerms) {
                formData.append('additionalTerms', offerDetails.additionalTerms);
            }
            if (offerDetails.file) {
                formData.append('file', offerDetails.file);
            }

            const response = await apiClient.post(`/applications/${applicationId}/offer/`, formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
            });
            return response.data;
        },
        updateOnboardingTask: async (applicationId: string, taskId: string, status: string) => {
            const response = await apiClient.patch(`/applications/${applicationId}/onboarding/${taskId}`, { status });
            return response.data;
        },
        sendOnboardingReminder: async (applicationId: string) => {
            const response = await apiClient.post(`/applications/${applicationId}/onboarding/remind`);
            return response.data;
        },

    },
    interactions: {
        getByCandidate: async (applicationId: string) => {
            const response = await apiClient.get(
                `/applications/${applicationId}/interactions`
            );
            return response.data;
        },

        create: async (
            applicationId: string,
            data: {
                recruiterId: string;
                recruiterName: string;
                method: string;
                status: string;
                candidateUpdate?: string;
                note?: string;
            }
        ) => {
            const response = await apiClient.post(
                `/applications/${applicationId}/interactions/`,
                data
            );
            return response.data;
        },
    },
    users: {
        getAll: async () => {
            const response = await apiClient.get<User[]>('/users/');
            return response.data;
        },
        getCompanies: async () => {
            const response = await apiClient.get<string[]>('/users/companies/');
            return response.data;
        },
        getERPEmployees: async (company: string) => {
            const response = await apiClient.get<any[]>(`/users/erp-employees?company=${company}`);
            return response.data;
        },
        importUser: async (data: any) => {
            const response = await apiClient.post<User>('/users/import/', data);
            return response.data;
        },
        refreshErp: async () => {
            const response = await apiClient.post('/users/refresh-erp/');
            return response.data;
        },
        getById: async (id: string) => {
            const response = await apiClient.get<User>(`/users/${id}`);
            return response.data;
        },
        create: async (user: any) => {
            const response = await apiClient.post<User>('/users/', user);
            return response.data;
        },
        update: async (id: string, user: any) => {
            const response = await apiClient.put<User>(`/users/${id}`, user);
            return response.data;
        },
        delete: async (id: string) => {
            await apiClient.delete(`/users/${id}`);
        },
    },
};
