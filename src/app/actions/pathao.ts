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

export async function trackCustomerOrder(query: string) {
    try {
        const rawQuery = query.trim();
        
        // Determine if this is a phone number or an Order ID
        // Order IDs start with "M-" (new format) or "MJEPE-" (legacy format)
        const upper = rawQuery.toUpperCase();
        const isOrderId = upper.startsWith("M-") || upper.startsWith("MJEPE");

        if (isOrderId) {
            // ── Order ID search ─────────────────────────────────────
            const orderData = await prisma.order.findFirst({
                where: {
                    id: rawQuery.toUpperCase(),
                    deletedAt: null,
                },
                select: {
                    id: true,
                    status: true,
                    totalAmount: true,
                    advancePaid: true,
                    createdAt: true,
                    pathaoConsignmentId: true,
                    customerName: true,
                    phone: true,
                    district: true,
                    address: true,
                    deliveryCharge: true,
                    discountAmount: true,
                    items: {
                        select: {
                            id: true,
                            quantity: true,
                            price: true,
                            requiresPrint: true,
                            printName: true,
                            printNumber: true,
                            printCost: true,
                            product: {
                                select: {
                                    name: true,
                                    slug: true,
                                    mediaAssets: {
                                        select: { url: true },
                                        orderBy: { sortOrder: 'asc' }
                                    }
                                }
                            },
                            variant: {
                                select: { size: true, color: true }
                            }
                        }
                    }
                }
            });

            if (!orderData) {
                return { success: false, error: "Order not found. Please check your Order ID." };
            }

            const order = {
                ...orderData,
                items: orderData.items.map(item => ({
                    ...item,
                    size: item.variant?.size || 'M',
                    color: item.variant?.color || 'Default',
                    product: {
                        name: item.product.name,
                        slug: item.product.slug,
                        images: item.product.mediaAssets.map(ma => ma.url)
                    }
                }))
            };

            let pathaoInfo = null;
            if (order.status === 'SHIPPED' && order.pathaoConsignmentId) {
                try {
                    pathaoInfo = await pathaoClient.getOrderInfo(order.pathaoConsignmentId);
                } catch (error) {
                    console.error('[TrackCustomerOrder] Failed to fetch pathao tracking info:', error);
                }
            }

            return { success: true, data: { order, pathaoInfo } };

        } else {
            // ── Phone number search ──────────────────────────────────
            const cleanPhone = rawQuery.replace(/[^0-9]/g, '');

            if (cleanPhone.length < 9) {
                return { success: false, error: "Please enter a valid phone number (at least 9 digits)." };
            }

            const ordersData = await prisma.order.findMany({
                where: {
                    deletedAt: null,
                    OR: [
                        { phone: { contains: rawQuery } },
                        { phone: { contains: cleanPhone } },
                        { phone: { endsWith: cleanPhone.slice(-9) } },
                    ],
                },
                orderBy: { createdAt: 'desc' },
                select: {
                    id: true,
                    status: true,
                    totalAmount: true,
                    advancePaid: true,
                    createdAt: true,
                    pathaoConsignmentId: true,
                    customerName: true,
                    phone: true,
                    district: true,
                    address: true,
                    deliveryCharge: true,
                    discountAmount: true,
                    items: {
                        select: {
                            id: true,
                            quantity: true,
                            price: true,
                            requiresPrint: true,
                            printName: true,
                            printNumber: true,
                            printCost: true,
                            product: {
                                select: {
                                    name: true,
                                    slug: true,
                                    mediaAssets: {
                                        select: { url: true },
                                        orderBy: { sortOrder: 'asc' }
                                    }
                                }
                            },
                            variant: {
                                select: { size: true, color: true }
                            }
                        }
                    }
                }
            });

            if (ordersData.length === 0) {
                return { success: false, error: "No orders found for this phone number." };
            }

            const orders = ordersData.map(order => ({
                ...order,
                items: order.items.map(item => ({
                    ...item,
                    size: item.variant?.size || 'M',
                    color: item.variant?.color || 'Default',
                    product: {
                        name: item.product.name,
                        slug: item.product.slug,
                        images: item.product.mediaAssets.map(ma => ma.url)
                    }
                }))
            }));

            return { success: true, data: { orders } };
        }
    } catch (error: any) {
        console.error('[TrackCustomerOrder] Error:', error);
        return { success: false, error: "An error occurred while fetching order details." };
    }
}

export async function getPathaoOrderInfoAction(consignmentId: string) {
    try {
        const info = await pathaoClient.getOrderInfo(consignmentId);
        return { success: true, data: info };
    } catch (error: any) {
        console.error('[getPathaoOrderInfoAction] Error:', error);
        return { success: false, error: error.message || "Failed to fetch Pathao consignment details" };
    }
}