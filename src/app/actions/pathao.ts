'use server';

import { pathaoClient } from '@/lib/pathao/PathaoClient';

export async function getTokenForTest() {
    try {
        const token = await pathaoClient.getValidAccessToken();
        return { success: true, data: { access_token: token } };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}