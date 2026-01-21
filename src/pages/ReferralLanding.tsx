import { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';

const COOKIE_NAME = 'million_ref';
const COOKIE_MAX_AGE_DAYS = 60;
const STORAGE_KEY = 'million_referral_code';

/**
 * Page that captures referral code from /ref/:code route.
 * Saves to cookie/localStorage and redirects to login/signup.
 */
const ReferralLanding = () => {
    const { code } = useParams<{ code: string }>();
    const navigate = useNavigate();

    useEffect(() => {
        if (code) {
            const normalizedCode = code.trim().toLowerCase();

            // Save to cookie (60 days)
            const expires = new Date();
            expires.setTime(expires.getTime() + COOKIE_MAX_AGE_DAYS * 24 * 60 * 60 * 1000);
            document.cookie = `${COOKIE_NAME}=${encodeURIComponent(normalizedCode)};expires=${expires.toUTCString()};path=/;SameSite=Lax`;

            // Save to localStorage as backup
            localStorage.setItem(STORAGE_KEY, normalizedCode);

            console.log(`[ReferralLanding] Captured referral code: ${normalizedCode}`);
        }

        // Redirect to login page
        navigate('/login', { replace: true });
    }, [code, navigate]);

    return (
        <div className="min-h-screen bg-black flex items-center justify-center">
            <div className="text-center">
                <div className="w-12 h-12 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                <p className="text-slate-400 text-sm">Redirecionando...</p>
            </div>
        </div>
    );
};

export default ReferralLanding;
