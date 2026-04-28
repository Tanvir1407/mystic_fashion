'use server';

import { pathaoClient } from '@/lib/pathao/PathaoClient';
import prisma from '@/lib/prisma';

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

export async function trackCustomerOrder(orderId: string) {
    try {
        const order = await prisma.order.findUnique({
            where: { id: orderId },
            select: {
                id: true,
                status: true,
                totalAmount: true,
                advancePaid: true,
                createdAt: true,
                pathaoConsignmentId: true,
                items: {
                    select: {
                        product: { select: { name: true } },
                        quantity: true
                    }
                }
            }
        });

        if (!order) {
            return { success: false, error: "Order not found. Please check your Order ID and try again." };
        }

        let pathaoInfo = null;

        // If the order is shipped and has a pathao ID, fetch live details
        if (order.status === 'SHIPPED' && order.pathaoConsignmentId) {
            try {
                pathaoInfo = await pathaoClient.getOrderInfo(order.pathaoConsignmentId);
            } catch (error) {
                console.error('[TrackCustomerOrder] Failed to fetch pathao tracking info:', error);
                // We don't fail the whole request, we just won't have pathao info
            }
        }

        return { 
            success: true, 
            data: { 
                order, 
                pathaoInfo 
            } 
        };
    } catch (error: any) {
        console.error('[TrackCustomerOrder] Error:', error);
        return { success: false, error: "An error occurred while fetching order details." };
    }
}