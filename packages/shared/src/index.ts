import { z } from "zod";

export const roleSchema = z.enum([
  "SUPER_ADMIN",
  "ADMIN",
  "SHOP_OWNER",
  "DELIVERY_MAN",
  "CUSTOMER"
]);

export const productCategorySchema = z.enum([
  "FOOD",
  "GROCERIES",
  "STATIONARY",
  "MEDICINE",
  "WEAR"
]);

export const createProductSchema = z.object({
  name: z.string().min(2),
  description: z.string().min(5),
  category: productCategorySchema,
  price: z.number().positive(),
  stock: z.number().int().nonnegative(),
  images: z.array(z.string().url()).default([])
});

export type Role = z.infer<typeof roleSchema>;
export type ProductCategory = z.infer<typeof productCategorySchema>;
export type CreateProductInput = z.infer<typeof createProductSchema>;
