import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabaseClient';

interface AffiliateData {
    affiliateCode: string | null;
    affiliateBalance: number;
    pendingBalance: number;  // New: blocked balance (20 day hold)
    totalEarnings: number;
    referredCount: number;
    isLoading: boolean;
}

export const useAffiliate = () => {
    const { user } = useAuth();
    const [data, setData] = useState<AffiliateData>({
        affiliateCode: null,
        affiliateBalance: 0,
        pendingBalance: 0,
        totalEarnings: 0,
        referredCount: 0,
        isLoading: true,
    });

    useEffect(() => {
        if (!user) {
            setData({
                affiliateCode: null,
                affiliateBalance: 0,
                pendingBalance: 0,
                totalEarnings: 0,
                referredCount: 0,
                isLoading: false,
            });
            return;
        }

        const fetchAffiliateData = async () => {
            try {
                // Fetch user's affiliate data
                const { data: profile, error: profileError } = await supabase
                    .from('profiles')
                    .select('affiliate_code, affiliate_balance, pending_balance, total_earnings')
                    .eq('id', user.id)
                    .single();

                if (profileError) throw profileError;

                // If no affiliate code, generate one
                if (!profile.affiliate_code) {
                    const generatedCode = await generateAffiliateCode(user.id);
                    profile.affiliate_code = generatedCode;
                }

                // Count how many users were referred by this user
                const { count, error: countError } = await supabase
                    .from('profiles')
                    .select('id', { count: 'exact', head: true })
                    .eq('referred_by', user.id);

                if (countError) console.error('Error counting referrals:', countError);

                setData({
                    affiliateCode: profile.affiliate_code,
                    affiliateBalance: profile.affiliate_balance || 0,
                    pendingBalance: profile.pending_balance || 0,
                    totalEarnings: profile.total_earnings || 0,
                    referredCount: count || 0,
                    isLoading: false,
                });
            } catch (error) {
                console.error('Error fetching affiliate data:', error);
                setData(prev => ({ ...prev, isLoading: false }));
            }
        };

        fetchAffiliateData();
    }, [user]);

    const generateAffiliateCode = async (userId: string): Promise<string> => {
        try {
            // Generate 6-char code from md5 hash
            const randomString = `${userId}-${Date.now()}`;
            const encoder = new TextEncoder();
            const data = encoder.encode(randomString);
            const hashBuffer = await crypto.subtle.digest('SHA-256', data);
            const hashArray = Array.from(new Uint8Array(hashBuffer));
            const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
            const code = hashHex.substring(0, 6).toLowerCase();

            // Update database
            const { error } = await supabase
                .from('profiles')
                .update({ affiliate_code: code })
                .eq('id', userId);

            if (error) {
                console.error('Error updating affiliate code:', error);
                return 'error';
            }

            return code;
        } catch (error) {
            console.error('Error generating affiliate code:', error);
            return 'error';
        }
    };

    const refreshData = async () => {
        if (!user) return;

        const { data: profile } = await supabase
            .from('profiles')
            .select('affiliate_code, affiliate_balance, pending_balance, total_earnings')
            .eq('id', user.id)
            .single();

        const { count } = await supabase
            .from('profiles')
            .select('id', { count: 'exact', head: true })
            .eq('referred_by', user.id);

        if (profile) {
            setData({
                affiliateCode: profile.affiliate_code,
                affiliateBalance: profile.affiliate_balance || 0,
                pendingBalance: profile.pending_balance || 0,
                totalEarnings: profile.total_earnings || 0,
                referredCount: count || 0,
                isLoading: false,
            });
        }
    };

    return {
        ...data,
        refreshData,
    };
};
