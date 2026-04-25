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

export async function getPathaoCities() {
    try {
        const cities = await pathaoClient.getCities();
        return { success: true, data: cities };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

export async function getPathaoZones(cityId: number) {
    try {
        const zones = await pathaoClient.getZones(cityId);
        return { success: true, data: zones };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

export async function getPathaoAreas(zoneId: number) {
    try {
        const areas = await pathaoClient.getAreas(zoneId);
        return { success: true, data: areas };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}