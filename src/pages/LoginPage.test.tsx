import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, useNavigate } from 'react-router-dom';
import { vi, describe, it, expect, beforeEach, Mock } from 'vitest';
import { LoginPage } from './LoginPage';
import { useAuth } from '../context/AuthContext';
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

const mockNavigate = vi.fn();
const mockLogin = vi.fn();
const mockClearAuthExpiredMessage = vi.fn();

describe('LoginPage', () => {
    beforeEach(() => {
        vi.clearAllMocks();

        (useNavigate as Mock).mockReturnValue(mockNavigate);

        (useAuth as Mock).mockReturnValue({
            isAuthenticated: false,
            authExpiredMessage: null,
            login: mockLogin,
            clearAuthExpiredMessage: mockClearAuthExpiredMessage,
        });
    });

    const renderComponent = () => {
        return render(
            <MemoryRouter>
                <LoginPage />
            </MemoryRouter>
        );
    };

    describe('【UI渲染】', () => {
        it('應正確渲染登入表單的所有初始元素', () => {
            renderComponent();

            expect(screen.getByLabelText('電子郵件')).toBeInTheDocument();
            expect(screen.getByLabelText('密碼')).toBeInTheDocument();
            expect(screen.getByRole('button', { name: '登入' })).toBeInTheDocument();
        });
    });

    describe('【表單驗證】', () => {
        it('電子郵件格式錯誤時應顯示錯誤訊息', async () => {
            const user = userEvent.setup();
            renderComponent();

            const emailInput = screen.getByLabelText('電子郵件');
            const submitButton = screen.getByRole('button', { name: '登入' });

            await user.type(emailInput, 'invalid-email');
            await user.click(submitButton);

            expect(mockLogin).not.toHaveBeenCalled();
            expect(screen.getByText('請輸入有效的 Email 格式')).toBeInTheDocument();
        });

        it('密碼長度不足 8 碼時應顯示錯誤訊息', async () => {
            const user = userEvent.setup();
            renderComponent();

            const emailInput = screen.getByLabelText('電子郵件');
            const passwordInput = screen.getByLabelText('密碼');
            const submitButton = screen.getByRole('button', { name: '登入' });

            await user.type(emailInput, 'test@email.com');
            await user.type(passwordInput, '1234567');
            await user.click(submitButton);

            expect(mockLogin).not.toHaveBeenCalled();
            expect(screen.getByText('密碼必須至少 8 個字元')).toBeInTheDocument();
        });

        it('密碼未包含英數字混合時應顯示錯誤訊息', async () => {
            const user = userEvent.setup();
            renderComponent();

            const emailInput = screen.getByLabelText('電子郵件');
            const passwordInput = screen.getByLabelText('密碼');
            const submitButton = screen.getByRole('button', { name: '登入' });

            await user.type(emailInput, 'test@email.com');
            await user.type(passwordInput, '12345678');
            await user.click(submitButton);

            expect(mockLogin).not.toHaveBeenCalled();
            expect(screen.getByText('密碼必須包含英文字母和數字')).toBeInTheDocument();

            await user.clear(passwordInput);
            await user.type(passwordInput, 'abcdefgh');
            await user.click(submitButton);

            expect(mockLogin).not.toHaveBeenCalled();
            expect(screen.getByText('密碼必須包含英文字母和數字')).toBeInTheDocument();
        });
    });

    describe('【API互動】', () => {
        it('登入成功時應導向至 Dashboard', async () => {
            const user = userEvent.setup();
            mockLogin.mockResolvedValueOnce(undefined);

            renderComponent();

            await user.type(screen.getByLabelText('電子郵件'), 'test@email.com');
            await user.type(screen.getByLabelText('密碼'), 'Password123');
            await user.click(screen.getByRole('button', { name: '登入' }));

            expect(mockLogin).toHaveBeenCalledWith('test@email.com', 'Password123');

            await waitFor(() => {
                expect(mockNavigate).toHaveBeenCalledWith('/dashboard', { replace: true });
            });
        });

        it('登入失敗時應顯示 API 回傳的錯誤訊息', async () => {
            const user = userEvent.setup();

            const axiosError = new AxiosError<{ message: string }>(
                'Request failed',
                '400',
                undefined,
                null,
                {
                    data: { message: '帳號或密碼錯誤' },
                    status: 400,
                    statusText: 'Bad Request',
                    headers: {},
                    config: { headers: new AxiosHeaders() }
                }
            );

            mockLogin.mockRejectedValueOnce(axiosError);

            renderComponent();

            await user.type(screen.getByLabelText('電子郵件'), 'test@email.com');
            await user.type(screen.getByLabelText('密碼'), 'Password123');
            await user.click(screen.getByRole('button', { name: '登入' }));

            await waitFor(() => {
                expect(screen.getByText('帳號或密碼錯誤')).toBeInTheDocument();
            });
            expect(mockNavigate).not.toHaveBeenCalled();
        });
    });

    describe('【UI元件狀態】', () => {
        it('登入中應顯示載入狀態並禁用相關輸入與按鈕', async () => {
            const user = userEvent.setup();

            // Mock a pending promise
            let resolveLogin: (value: unknown) => void;
            const loginPromise = new Promise((resolve) => {
                resolveLogin = resolve;
            });
            mockLogin.mockReturnValueOnce(loginPromise);

            renderComponent();

            const emailInput = screen.getByLabelText('電子郵件');
            const passwordInput = screen.getByLabelText('密碼');
            const submitButton = screen.getByRole('button', { name: '登入' });

            await user.type(emailInput, 'test@email.com');
            await user.type(passwordInput, 'Password123');
            await user.click(submitButton);

            expect(submitButton).toHaveTextContent('登入中...');
            expect(emailInput).toBeDisabled();
            expect(passwordInput).toBeDisabled();
            expect(submitButton).toBeDisabled();

            // Resolve the promise to cleanup
            resolveLogin!(undefined);

            await waitFor(() => {
                expect(mockNavigate).toHaveBeenCalled();
            });
        });
    });

    describe('【路由與權限】', () => {
        it('如果使用者已登入，應直接導向至 Dashboard', () => {
            (useAuth as Mock).mockReturnValue({
                isAuthenticated: true,
                authExpiredMessage: null,
                login: mockLogin,
                clearAuthExpiredMessage: mockClearAuthExpiredMessage,
            });

            renderComponent();

            expect(mockNavigate).toHaveBeenCalledWith('/dashboard', { replace: true });
        });
    });

    describe('【狀態恢復】', () => {
        it('如果 AuthContext 有登入過期訊息，應在畫面上顯示並清除該權限訊息', () => {
            (useAuth as Mock).mockReturnValue({
                isAuthenticated: false,
                authExpiredMessage: '您的登入已過期',
                login: mockLogin,
                clearAuthExpiredMessage: mockClearAuthExpiredMessage,
            });

            renderComponent();

            expect(screen.getByText('您的登入已過期')).toBeInTheDocument();
            expect(mockClearAuthExpiredMessage).toHaveBeenCalled();
        });
    });
});
