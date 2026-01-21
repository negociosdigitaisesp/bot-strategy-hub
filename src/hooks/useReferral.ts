import { useEffect, useCallback } from 'react';
import { useLocation, useParams } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';

const COOKIE_NAME = 'million_ref';
const COOKIE_MAX_AGE_DAYS = 60;
const STORAGE_KEY = 'million_referral_code';

/**
 * Hook to capture and manage affiliate referral codes.
 * 
 * Supports:
 * - URL query param: ?ref=CODE
 * - Route param: /ref/CODE
 * 
 * Stores in:
 * - Cookie (60 days)
 * - localStorage (backup)
 */
export const useReferral = () => {
    const location = useLocation();

    // --- Cookie Helpers ---
    const setCookie = useCallback((name: string, value: string, days: number) => {
        const expires = new Date();
        expires.setTime(expires.getTime() + days * 24 * 60 * 60 * 1000);
        document.cookie = `${name}=${encodeURIComponent(value)};expires=${expires.toUTCString()};path=/;SameSite=Lax`;
    }, []);

    const getCookie = useCallback((name: string): string | null => {
        const nameEQ = `${name}=`;
        const ca = document.cookie.split(';');
        for (let c of ca) {
            c = c.trim();
            if (c.indexOf(nameEQ) === 0) {
                return decodeURIComponent(c.substring(nameEQ.length));
            }
        }
        return null;
    }, []);

    // --- Get Referral Code from Storage ---
    const getReferralCode = useCallback((): string | null => {
        // Priority: Cookie first, then localStorage
        const fromCookie = getCookie(COOKIE_NAME);
        if (fromCookie) return fromCookie;

        const fromStorage = localStorage.getItem(STORAGE_KEY);
        return fromStorage;
    }, [getCookie]);

    // --- Save Referral Code ---
    const saveReferralCode = useCallback((code: string) => {
        if (!code || code.trim() === '') return;

        const normalizedCode = code.trim().toLowerCase();

        // Save to cookie (60 days)
        setCookie(COOKIE_NAME, normalizedCode, COOKIE_MAX_AGE_DAYS);

        // Save to localStorage as backup
        localStorage.setItem(STORAGE_KEY, normalizedCode);

        console.log(`[Referral] Saved referral code: ${normalizedCode}`);
    }, [setCookie]);

    // --- Clear Referral Code (after successful signup) ---
    const clearReferralCode = useCallback(() => {
        // Clear cookie
        document.cookie = `${COOKIE_NAME}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/`;
        // Clear localStorage
        localStorage.removeItem(STORAGE_KEY);
        console.log('[Referral] Cleared referral code');
    }, []);

    // --- Lookup Affiliate ID by Code ---
    const getAffiliateIdByCode = useCallback(async (code: string): Promise<string | null> => {
        try {
            const { data, error } = await supabase
                .from('profiles')
                .select('id')
                .eq('affiliate_code', code.toLowerCase())
                .single();

            if (error || !data) {
                console.warn(`[Referral] Affiliate code not found: ${code}`);
                return null;
            }

            return data.id;
        } catch (err) {
            console.error('[Referral] Error looking up affiliate:', err);
            return null;
        }
    }, []);

    // --- Capture from URL on Mount ---
    useEffect(() => {
        // Check query param: ?ref=CODE
        const params = new URLSearchParams(location.search);
        const refFromQuery = params.get('ref');

        if (refFromQuery) {
            saveReferralCode(refFromQuery);
            return;
        }

        // Check route: /ref/CODE
        const pathParts = location.pathname.split('/');
        const refIndex = pathParts.indexOf('ref');
        if (refIndex !== -1 && pathParts[refIndex + 1]) {
            saveReferralCode(pathParts[refIndex + 1]);
        }
    }, [location, saveReferralCode]);

    return {
        getReferralCode,
        saveReferralCode,
        clearReferralCode,
        getAffiliateIdByCode,
    };
};

/**
 * Get raw referral code from storage without React hook.
 * Use this in non-component contexts (e.g., AuthContext).
 */
export const getReferralCodeFromStorage = (): string | null => {
    // Cookie first
    const nameEQ = `${COOKIE_NAME}=`;
    const ca = document.cookie.split(';');
    for (let c of ca) {
        c = c.trim();
        if (c.indexOf(nameEQ) === 0) {
            return decodeURIComponent(c.substring(nameEQ.length));
        }
    }

    // Fallback to localStorage
    return localStorage.getItem(STORAGE_KEY);
};

/**
 * Lookup affiliate user ID by code.
 * Returns the UUID of the affiliate or null if not found.
 */
export const lookupAffiliateId = async (code: string): Promise<string | null> => {
    try {
        const { data, error } = await supabase
            .from('profiles')
            .select('id')
            .eq('affiliate_code', code.toLowerCase())
            .single();

        if (error || !data) {
            console.warn(`[Referral] Affiliate code not found: ${code}`);
            return null;
        }

        return data.id;
    } catch (err) {
        console.error('[Referral] Error looking up affiliate:', err);
        return null;
    }
};

export default useReferral;
