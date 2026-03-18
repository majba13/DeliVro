/**
 * POST /api/admin/seed-products
 * Seeds demo products into the database.
 * Requires SUPER_ADMIN role.
 * Only inserts products when the products table is empty (idempotent).
 */
import { NextRequest, NextResponse } from "next/server";
import { requireRole, isAuthError } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";

const DEMO_PRODUCTS = [
  { name: "Fresh Atlantic Salmon", description: "Wild-caught, premium quality", price: 22.5, category: "FOOD", stock: 40 },
  { name: "Mango Juice 1L x6", description: "100% natural, no added sugar", price: 9.6, category: "FOOD", stock: 90 },
  { name: "Organic Basmati Rice 5kg", description: "Aged aromatic basmati", price: 11.2, category: "GROCERIES", stock: 120 },
  { name: "Green Tea 100 bags", description: "Premium Japanese sencha", price: 8.4, category: "GROCERIES", stock: 150 },
  { name: "Paracetamol 500mg x20", description: "Fast-acting pain relief", price: 3.5, category: "MEDICINE", stock: 200 },
  { name: "Multi-Vitamin Pack", description: "30-day supply, all essentials", price: 18.9, category: "MEDICINE", stock: 60 },
  { name: "Emergency First Aid Kit", description: "Complete 100-piece first aid kit", price: 24.9, category: "EMERGENCY", stock: 50 },
  { name: "Emergency Water Purifier", description: "Portable filter — 1000L capacity", price: 39.9, category: "EMERGENCY", stock: 30 },
  { name: "Premium Notebook Set", description: "A5 hardcover, 200 pages", price: 7.8, category: "STATIONARY", stock: 80 },
  { name: "Ballpoint Pen Set x10", description: "Smooth 0.7mm ink, blue/black", price: 4.2, category: "STATIONARY", stock: 300 },
  { name: "Classic Denim Jacket", description: "Regular fit, stonewash blue", price: 34.7, category: "WEAR", stock: 25 },
  { name: "Running Sneakers", description: "Lightweight mesh, size 7-12", price: 62.0, category: "WEAR", stock: 20 },
  { name: "Wireless Earbuds", description: "BT 5.3, ANC, 30hr battery", price: 49.99, category: "ELECTRONICS", stock: 15 },
  { name: "Yoga Mat Pro", description: "Non-slip, 6mm comfort layer", price: 27.0, category: "WEAR", stock: 35 },
] as const;

export async function POST(req: NextRequest) {
  const auth = await requireRole(req, "SUPER_ADMIN");
  if (isAuthError(auth)) return auth;

  const existing = await prisma.product.count();
  if (existing > 0) {
    return NextResponse.json(
      { message: `Skipped — ${existing} products already exist.`, seeded: 0 },
      { status: 200 }
    );
  }

  // Use the super-admin themselves as the owner for all demo products
  const ownerId = auth.sub;

  const created = await prisma.$transaction(
    DEMO_PRODUCTS.map((p) =>
      prisma.product.create({
        data: {
          ownerId,
          name: p.name,
          description: p.description,
          price: p.price,
          category: p.category as any,
          images: [],
          isActive: true,
          inventory: {
            create: { stock: p.stock, reserved: 0 },
          },
        },
        select: { id: true, name: true },
      })
    )
  );

  return NextResponse.json({ message: "Demo products seeded successfully.", seeded: created.length, products: created }, { status: 201 });
}
