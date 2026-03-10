import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, useNavigate } from 'react-router-dom';
import { vi, describe, it, expect, beforeEach, type Mock } from 'vitest';
import { AdminPage } from './AdminPage';
import { useAuth } from '../context/AuthContext';

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
const mockLogout = vi.fn();

describe('AdminPage', () => {
    beforeEach(() => {
        vi.clearAllMocks();

        (useNavigate as Mock).mockReturnValue(mockNavigate);

        (useAuth as Mock).mockReturnValue({
            user: { role: 'admin' },
            logout: mockLogout,
        });
    });

    const renderComponent = () => {
        return render(
            <MemoryRouter>
                <AdminPage />
            </MemoryRouter>
        );
    };

    describe('【UI渲染】', () => {
        it('應正確渲染管理後台的所有初始元素', () => {
            renderComponent();

            expect(screen.getByRole('heading', { level: 1, name: '🛠️ 管理後台' })).toBeInTheDocument();
            expect(screen.getByRole('link', { name: '← 返回' })).toBeInTheDocument();
            expect(screen.getByText('管理員')).toBeInTheDocument();
            expect(screen.getByRole('button', { name: '登出' })).toBeInTheDocument();
            expect(screen.getByText('管理員專屬頁面')).toBeInTheDocument();
        });

        it('當使用者的角色不是 admin 時顯示一般用戶標籤', () => {
            (useAuth as Mock).mockReturnValue({
                user: { role: 'user' },
                logout: mockLogout,
            });
            renderComponent();

            expect(screen.getByText('一般用戶')).toBeInTheDocument();
            expect(screen.queryByText('管理員', { selector: 'span.role-badge' })).not.toBeInTheDocument();
        });
    });

    describe('【路由與導覽】', () => {
        it('點擊返回連結應導向至 Dashboard', () => {
            renderComponent();

            const backLink = screen.getByRole('link', { name: '← 返回' });
            expect(backLink).toHaveAttribute('href', '/dashboard');
        });
    });

    describe('【API與狀態互動】', () => {
        it('點擊登出按鈕應呼叫 logout 並導向至 Login', async () => {
            const user = userEvent.setup();
            renderComponent();

            await user.click(screen.getByRole('button', { name: '登出' }));

            expect(mockLogout).toHaveBeenCalled();
            expect(mockNavigate).toHaveBeenCalledWith('/login', { replace: true, state: null });
        });
    });
});
