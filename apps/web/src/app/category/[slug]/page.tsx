import { redirect } from "next/navigation";

interface Props {
  params: Promise<{ slug: string }>;
}

/**
 * /category/[slug] → /products?category=<slug>
 *
 * This provides clean category URLs (e.g. /category/Electronics) that
 * are linked from CategorySlider, social shares, and search engines,
 * then transparently redirect to the filterable products catalog.
 */
export default async function CategoryPage({ params }: Props) {
  const { slug } = await params;
  redirect(`/products?category=${encodeURIComponent(slug)}`);
}
