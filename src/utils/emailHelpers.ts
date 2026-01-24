// Email Template Helper Functions
// Generates properly formatted email links for the Million Bots platform

const BASE_URL = 'https://appmillionbots.com';

/**
 * Generates a checkout link for email campaigns
 * @param plan - The plan type (annual, monthly, diamond)
 * @returns Full URL to the checkout page
 */
export const getCheckoutLink = (plan: 'annual' | 'monthly' | 'diamond' = 'annual'): string => {
    return `${BASE_URL}/quieroserpro`;
};

/**
 * Generates the main app link
 * @returns Full URL to the main app
 */
export const getAppLink = (): string => {
    return BASE_URL;
};

/**
 * Generates a link to the Deriv connection page
 * @returns Full URL to the Deriv connection page
 */
export const getDerivConnectionLink = (): string => {
    return `${BASE_URL}/conectar-deriv`;
};

/**
 * Email template constants
 */
export const EMAIL_CONSTANTS = {
    BASE_URL,
    CHECKOUT_URL: `${BASE_URL}/quieroserpro`,
    APP_URL: BASE_URL,
    DERIV_CONNECTION_URL: `${BASE_URL}/conectar-deriv`,
    SUPPORT_EMAIL: 'soporte@millionbots.com',
    COMPANY_NAME: 'Million Bots',
};

export default {
    getCheckoutLink,
    getAppLink,
    getDerivConnectionLink,
    EMAIL_CONSTANTS,
};
