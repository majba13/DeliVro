/**
 * GET /api/admin/stats
 * Returns aggregated platform statistics for the admin dashboard.
 * Requires SUPER_ADMIN or ADMIN role.
 */
import { NextRequest, NextResponse } from "next/server";
import { requireRole, isAuthError } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const auth = await requireRole(req, "SUPER_ADMIN", "ADMIN");
  if (isAuthError(auth)) return auth;

  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOf30Days = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const startOf7Days = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  const [
    totalUsers,
    newUsersToday,
    totalOrders,
    ordersToday,
    orders30Days,
    pendingOrders,
    totalProducts,
    activeProducts,
    totalShops,
    pendingShops,
    totalRevenue,
    revenue30Days,
    revenueToday,
    pendingPayments,
    activeDeliveries,
    usersByRole,
    ordersByStatus,
    recentOrders,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { createdAt: { gte: startOfDay } } }),
    prisma.order.count(),
    prisma.order.count({ where: { createdAt: { gte: startOfDay } } }),
    prisma.order.count({ where: { createdAt: { gte: startOf30Days } } }),
    prisma.order.count({ where: { status: "PENDING" } }),
    prisma.product.count(),
    prisma.product.count({ where: { isActive: true } }),
    prisma.shop.count(),
    prisma.shop.count({ where: { isApproved: false, isActive: true } }),
    prisma.payment.aggregate({
      where: { status: "VERIFIED" },
      _sum: { amount: true },
    }),
    prisma.payment.aggregate({
      where: { status: "VERIFIED", createdAt: { gte: startOf30Days } },
      _sum: { amount: true },
    }),
    prisma.payment.aggregate({
      where: { status: "VERIFIED", createdAt: { gte: startOfDay } },
      _sum: { amount: true },
    }),
    prisma.payment.count({ where: { status: "PENDING_VERIFICATION" } }),
    prisma.delivery.count({ where: { status: { in: ["ASSIGNED", "PICKED_UP", "ON_THE_WAY"] } } }),
    prisma.user.groupBy({ by: ["role"], _count: { role: true } }),
    prisma.order.groupBy({ by: ["status"], _count: { status: true } }),
    prisma.order.findMany({
      orderBy: { createdAt: "desc" },
      take: 5,
      select: {
        id: true,
        total: true,
        status: true,
        createdAt: true,
        customer: { select: { name: true, email: true } },
      },
    }),
  ]);

  // 7-day order trend
  const orderTrend7Days = await prisma.order.groupBy({
    by: ["createdAt"],
    where: { createdAt: { gte: startOf7Days } },
    _count: { id: true },
  });

  return NextResponse.json({
    users: {
      total: totalUsers,
      newToday: newUsersToday,
      byRole: Object.fromEntries(usersByRole.map((r) => [r.role, r._count.role])),
    },
    orders: {
      total: totalOrders,
      today: ordersToday,
      last30Days: orders30Days,
      pending: pendingOrders,
      byStatus: Object.fromEntries(ordersByStatus.map((s) => [s.status, s._count.status])),
      recent: recentOrders,
    },
    products: {
      total: totalProducts,
      active: activeProducts,
    },
    shops: {
      total: totalShops,
      pendingApproval: pendingShops,
    },
    revenue: {
      total: totalRevenue._sum.amount ?? 0,
      last30Days: revenue30Days._sum.amount ?? 0,
      today: revenueToday._sum.amount ?? 0,
    },
    payments: {
      pendingVerification: pendingPayments,
    },
    deliveries: {
      active: activeDeliveries,
    },
    orderTrend7Days,
  });
}
