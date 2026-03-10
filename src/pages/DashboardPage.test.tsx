import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, useNavigate } from 'react-router-dom';
import { vi, describe, it, expect, beforeEach, type Mock } from 'vitest';
import { DashboardPage } from './DashboardPage';
import { useAuth } from '../context/AuthContext';
import { productApi } from '../api/productApi';
import { AxiosError, AxiosHeaders } from 'axios';

vi.mock('react-router-dom', async () => {
    const actual = await vi.importActual('react-router-dom');
    return {
        ...actual,
        useNavigate: vi.fn(),
    };
});

vi.mock('../context/AuthContext', () => ({
    useAuth: vi.fn(),
}));

vi.mock('../api/productApi', () => ({
    productApi: {
        getProducts: vi.fn(),
    },
}));

const mockNavigate = vi.fn();
const mockLogout = vi.fn();

describe('DashboardPage', () => {
    beforeEach(() => {
        vi.clearAllMocks();

        (useNavigate as Mock).mockReturnValue(mockNavigate);

        (useAuth as Mock).mockReturnValue({
            user: { username: 'TestUser', role: 'user' },
            logout: mockLogout,
        });

        // Default mock for products
        (productApi.getProducts as Mock).mockResolvedValue([]);
    });

    const renderComponent = () => {
        return render(
            <MemoryRouter>
                <DashboardPage />
            </MemoryRouter>
        );
    };

    describe('【UI渲染】', () => {
        it('應正確渲染儀表板的基礎佈局', async () => {
            renderComponent();

            expect(screen.getByRole('heading', { level: 1, name: '儀表板' })).toBeInTheDocument();
            expect(screen.getByText('Welcome, TestUser 👋')).toBeInTheDocument();
            expect(screen.getByText('一般用戶')).toBeInTheDocument();
            expect(screen.getByRole('button', { name: '登出' })).toBeInTheDocument();
            expect(screen.queryByRole('link', { name: /管理後台/ })).not.toBeInTheDocument();

            await waitFor(() => {
                expect(screen.queryByText('載入商品中...')).not.toBeInTheDocument();
            });
        });
    });

    describe('【權限控制】', () => {
        it('當使用者角色為 admin 時，應顯示管理後台連結與管理員標籤', async () => {
            (useAuth as Mock).mockReturnValue({
                user: { username: 'AdminUser', role: 'admin' },
                logout: mockLogout,
            });
            renderComponent();

            expect(screen.getByRole('link', { name: /管理後台/ })).toBeInTheDocument();
            expect(screen.getByText('管理員')).toBeInTheDocument();

            await waitFor(() => {
                expect(screen.queryByText('載入商品中...')).not.toBeInTheDocument();
            });
        });
    });

    describe('【API互動 - 狀態】', () => {
        it('畫面初始時應顯示載入中狀態', () => {
            // Mock a promise that doesn't resolve immediately
            (productApi.getProducts as Mock).mockReturnValue(new Promise(() => { }));

            renderComponent();

            expect(screen.getByText('載入商品中...')).toBeInTheDocument();
            expect(screen.queryByText('商品列表')).toBeInTheDocument(); // section heading
            expect(screen.queryByText('無法載入商品資料')).not.toBeInTheDocument();
        });
    });

    describe('【API互動 - 成功】', () => {
        it('成功取得商品資料時應渲染商品列表', async () => {
            const mockProducts = [
                { id: '1', name: 'Product 1', description: 'Desc 1', price: 100 },
                { id: '2', name: 'Product 2', description: 'Desc 2', price: 200 },
            ];
            (productApi.getProducts as Mock).mockResolvedValue(mockProducts);

            renderComponent();

            await waitFor(() => {
                expect(screen.queryByText('載入商品中...')).not.toBeInTheDocument();
            });

            expect(screen.getByText('Product 1')).toBeInTheDocument();
            expect(screen.getByText('Desc 1')).toBeInTheDocument();
            expect(screen.getByText('NT$ 100')).toBeInTheDocument();

            expect(screen.getByText('Product 2')).toBeInTheDocument();
            expect(screen.getByText('Desc 2')).toBeInTheDocument();
            expect(screen.getByText('NT$ 200')).toBeInTheDocument();
        });
    });

    describe('【API互動 - 失敗】', () => {
        it('當 API 回傳一般錯誤時應顯示錯誤訊息', async () => {
            const axiosError = new AxiosError<{ message: string }>(
                'Request failed',
                '500',
                undefined,
                null,
                {
                    data: { message: '伺服器異常' },
                    status: 500,
                    statusText: 'Internal Server Error',
                    headers: {},
                    config: { headers: new AxiosHeaders() }
                }
            );

            (productApi.getProducts as Mock).mockRejectedValue(axiosError);

            renderComponent();

            await waitFor(() => {
                expect(screen.queryByText('載入商品中...')).not.toBeInTheDocument();
            });

            expect(screen.getByText('伺服器異常')).toBeInTheDocument();
        });
    });

    describe('【API互動 - 權限逾時】', () => {
        it('當 API 回傳 401 錯誤時不應設定錯誤訊息', async () => {
            const axiosError = new AxiosError<{ message: string }>(
                'Unauthorized',
                '401',
                undefined,
                null,
                {
                    data: { message: 'Unauthorized' },
                    status: 401,
                    statusText: 'Unauthorized',
                    headers: {},
                    config: { headers: new AxiosHeaders() }
                }
            );

            (productApi.getProducts as Mock).mockRejectedValue(axiosError);

            renderComponent();

            await waitFor(() => {
                expect(screen.queryByText('載入商品中...')).not.toBeInTheDocument();
            });

            // Should not show error message, as interceptor handles it
            expect(screen.queryByText('無法載入商品資料')).not.toBeInTheDocument();
            expect(screen.queryByText('Unauthorized')).not.toBeInTheDocument();
        });
    });

    describe('【API與狀態互動】', () => {
        it('點擊登出按鈕應呼叫 logout 並導向至 Login', async () => {
            const user = userEvent.setup();
            renderComponent();

            await waitFor(() => {
                expect(screen.queryByText('載入商品中...')).not.toBeInTheDocument();
            });

            await user.click(screen.getByRole('button', { name: '登出' }));

            expect(mockLogout).toHaveBeenCalled();
            expect(mockNavigate).toHaveBeenCalledWith('/login', { replace: true, state: null });
        });
    });
});
